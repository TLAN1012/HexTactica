/**
 * 戰鬥流程:初始化、移動/攻擊/回合切換 reducer、反擊結算、勝負判定。
 * 純函式、無 DOM,方便測試與 AI 重用。
 */
import { hexDistance, hexKey, hexNeighbors, type Hex } from "../engine/hex";
import {
  analyzeAttack,
  killsFromDamage,
  rollDamage,
  willRetaliate,
} from "./combat";
import { deploymentHexes, generateMap } from "./maps";
import { rosterHpPool, maxSoldiers, soldierHp } from "./progression";
import { getTerrain } from "./terrain";
import { getSquadType } from "./units";
import type {
  BattleLogEntry,
  BattleState,
  MissionDef,
  RosterSquad,
  SideId,
  Squad,
} from "./types";

// ═══════════════════════════════════════════════════════════
// 初始化
// ═══════════════════════════════════════════════════════════

export function initBattle(mission: MissionDef, roster: RosterSquad[]): BattleState {
  const map = generateMap(mission.mapSeed, mission.mapWidth, mission.mapHeight);
  const fielded = roster.filter((r) => r.soldiers > 0);
  const playerSpots = deploymentHexes(map, "player", fielded.length);
  const enemySpots = deploymentHexes(map, "enemy", mission.enemies.length);

  const squads: Squad[] = [];
  fielded.forEach((r, i) => {
    squads.push({
      id: r.id,
      typeId: r.typeId,
      side: "player",
      pos: playerSpots[i],
      level: r.level,
      xp: r.xp,
      hpPool: rosterHpPool(r),
      movedThisActivation: 0,
      acted: false,
      moved: false,
      retaliations: 1,
    });
  });
  mission.enemies.forEach((e, i) => {
    squads.push({
      id: `enemy-${i}`,
      typeId: e.typeId,
      side: "enemy",
      pos: enemySpots[i],
      level: e.level,
      xp: 0,
      hpPool: maxSoldiers(e.typeId, e.level) * soldierHp(e.typeId, e.level),
      movedThisActivation: 0,
      acted: false,
      moved: false,
      retaliations: 1,
    });
  });

  return {
    missionId: mission.id,
    turn: 1,
    activeSide: "player",
    terrain: map.terrain,
    squads,
    log: [
      { turn: 1, text: `—— ${mission.title} ——`, kind: "info" },
      { turn: 1, text: "我方回合。點選部隊下達命令。", kind: "info" },
    ],
    outcome: "ongoing",
    kills: {},
  };
}

// ═══════════════════════════════════════════════════════════
// 查詢
// ═══════════════════════════════════════════════════════════

export function squadAt(state: BattleState, pos: Hex): Squad | undefined {
  return state.squads.find(
    (s) => s.hpPool > 0 && s.pos.q === pos.q && s.pos.r === pos.r,
  );
}

export function livingSquads(state: BattleState, side?: SideId): Squad[] {
  return state.squads.filter((s) => s.hpPool > 0 && (!side || s.side === side));
}

/** 這一隊此回合還能移動嗎 */
export function canMove(squad: Squad): boolean {
  return !squad.acted && !squad.moved;
}

/** 這一隊此回合還能攻擊嗎 */
export function canAttack(squad: Squad): boolean {
  return !squad.acted;
}

export interface ReachableHex {
  pos: Hex;
  cost: number;
  /** 回溯路徑用 */
  from: string | null;
}

/** Dijkstra 可達範圍(擋:敵我單位、不可通行地形) */
export function reachable(state: BattleState, squad: Squad): Map<string, ReachableHex> {
  const move = getSquadType(squad.typeId).move;
  const occupied = new Set(
    livingSquads(state)
      .filter((s) => s.id !== squad.id)
      .map((s) => hexKey(s.pos)),
  );
  const result = new Map<string, ReachableHex>();
  const startKey = hexKey(squad.pos);
  result.set(startKey, { pos: squad.pos, cost: 0, from: null });
  const frontier: { pos: Hex; cost: number }[] = [{ pos: squad.pos, cost: 0 }];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    const curKey = hexKey(cur.pos);
    if (cur.cost > (result.get(curKey)?.cost ?? Infinity)) continue;

    for (const n of hexNeighbors(cur.pos)) {
      const nKey = hexKey(n);
      const terrainId = state.terrain[nKey];
      if (terrainId === undefined) continue;
      if (occupied.has(nKey)) continue;
      const t = getTerrain(terrainId);
      if (t.impassable) continue;
      const cost = cur.cost + t.moveCost;
      if (cost > move) continue;
      const prev = result.get(nKey);
      if (!prev || cost < prev.cost) {
        result.set(nKey, { pos: n, cost, from: curKey });
        frontier.push({ pos: n, cost });
      }
    }
  }

  result.delete(startKey);
  return result;
}

/** 從可達表回溯實際路徑(含起點) */
export function tracePath(
  squad: Squad,
  reach: Map<string, ReachableHex>,
  to: Hex,
): Hex[] {
  const path: Hex[] = [];
  let key: string | null = hexKey(to);
  while (key) {
    const node: ReachableHex | undefined = reach.get(key);
    if (!node) {
      path.unshift(squad.pos);
      break;
    }
    path.unshift(node.pos);
    key = node.from;
  }
  return path;
}

/** 目前位置可直接攻擊的目標 */
export function attackableFrom(
  state: BattleState,
  squad: Squad,
  fromPos = squad.pos,
): Squad[] {
  const range = getSquadType(squad.typeId).range;
  return livingSquads(state, squad.side === "player" ? "enemy" : "player").filter(
    (t) => hexDistance(fromPos, t.pos) <= range,
  );
}

/**
 * 「點敵人直接打」:找出攻擊此目標的最佳發起格。
 * 回傳 null 表示目標此回合打不到。
 */
export function bestAttackPosition(
  state: BattleState,
  squad: Squad,
  target: Squad,
): { pos: Hex; movedHexes: number } | null {
  const range = getSquadType(squad.typeId).range;
  if (hexDistance(squad.pos, target.pos) <= range && canAttack(squad)) {
    return { pos: squad.pos, movedHexes: squad.movedThisActivation };
  }
  if (!canMove(squad)) return null;
  const reach = reachable(state, squad);
  let best: { pos: Hex; movedHexes: number; score: number } | null = null;
  for (const { pos } of reach.values()) {
    const dist = hexDistance(pos, target.pos);
    if (dist > range) continue;
    // 遠程盡量站遠打;近戰選路徑最短格
    const path = tracePath(squad, reach, pos);
    const movedHexes = path.length - 1;
    const score = range > 1 ? dist * 100 - movedHexes : -movedHexes + (getSquadType(squad.typeId).traits.includes("charge") ? movedHexes * 2 : 0);
    if (!best || score > best.score) best = { pos, movedHexes, score };
  }
  return best ? { pos: best.pos, movedHexes: best.movedHexes } : null;
}

// ═══════════════════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════════════════

export type BattleAction =
  | { type: "MOVE"; squadId: string; to: Hex; movedHexes: number }
  | { type: "ATTACK"; squadId: string; targetId: string }
  | { type: "MOVE_AND_ATTACK"; squadId: string; to: Hex; movedHexes: number; targetId: string }
  | { type: "END_TURN" };

function pushLog(state: BattleState, entry: Omit<BattleLogEntry, "turn">): BattleState {
  return { ...state, log: [...state.log, { turn: state.turn, ...entry }] };
}

function label(squad: Squad): string {
  const t = getSquadType(squad.typeId);
  return squad.side === "player" ? `我方${t.name}` : `敵方${t.name}`;
}

function updateSquad(state: BattleState, id: string, patch: Partial<Squad>): BattleState {
  return {
    ...state,
    squads: state.squads.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  };
}

/** 單向出手(攻擊或反擊都走這裡) */
function strike(
  state: BattleState,
  attackerId: string,
  defenderId: string,
  kind: "attack" | "retaliate",
  movedHexes: number,
  rng: () => number,
): BattleState {
  const attacker = state.squads.find((s) => s.id === attackerId)!;
  const defender = state.squads.find((s) => s.id === defenderId)!;
  if (attacker.hpPool <= 0 || defender.hpPool <= 0) return state;

  const ctx = analyzeAttack(state, attacker, defender, attacker.pos, movedHexes);
  const dmg = rollDamage(state, attacker, defender, ctx, rng);
  const kills = killsFromDamage(defender, dmg);
  const newPool = Math.max(0, defender.hpPool - dmg);
  const destroyed = newPool <= 0;

  let next = updateSquad(state, defenderId, { hpPool: newPool });

  // 擊殺計數(給經驗/戰報)
  if (kills > 0) {
    next = {
      ...next,
      kills: { ...next.kills, [attackerId]: (next.kills[attackerId] ?? 0) + kills },
    };
  }

  const verb = kind === "retaliate" ? "反擊" : ctx.isMelee ? "攻擊" : "射擊";
  const extra: string[] = [];
  if (ctx.chargeBonus > 0) extra.push(`衝鋒 +${Math.round(ctx.chargeBonus * 100)}%`);
  if (ctx.matchupBonus > 0) extra.push("克制騎兵");
  if (ctx.usesMeleeFallback) extra.push("被迫近戰");
  next = pushLog(next, {
    kind: kind === "retaliate" ? "retaliate" : "attack",
    text: `${label(attacker)}${verb} ${label(defender)}${extra.length ? `(${extra.join("、")})` : ""}:${dmg} 傷害,${kills} 人倒下`,
  });
  if (destroyed) {
    next = pushLog(next, { kind: "death", text: `${label(defender)}全滅!` });
  }
  return next;
}

export function battleReducer(
  state: BattleState,
  action: BattleAction,
  rng: () => number = Math.random,
): BattleState {
  if (state.outcome !== "ongoing" && action.type !== "END_TURN") return state;

  switch (action.type) {
    case "MOVE": {
      const squad = state.squads.find((s) => s.id === action.squadId);
      if (!squad || !canMove(squad)) return state;
      let next = updateSquad(state, squad.id, {
        pos: action.to,
        moved: true,
        movedThisActivation: action.movedHexes,
      });
      next = pushLog(next, { kind: "move", text: `${label(squad)}移動` });
      return next;
    }

    case "ATTACK":
      return resolveAttack(state, action.squadId, action.targetId, rng);

    case "MOVE_AND_ATTACK": {
      const squad = state.squads.find((s) => s.id === action.squadId);
      if (!squad || !canMove(squad)) return state;
      const next = updateSquad(state, squad.id, {
        pos: action.to,
        moved: true,
        movedThisActivation: action.movedHexes,
      });
      return resolveAttack(next, action.squadId, action.targetId, rng);
    }

    case "END_TURN": {
      if (state.outcome !== "ongoing") return state;
      const nextSide: SideId = state.activeSide === "player" ? "enemy" : "player";
      const nextTurn = nextSide === "player" ? state.turn + 1 : state.turn;
      let next: BattleState = {
        ...state,
        turn: nextTurn,
        activeSide: nextSide,
        squads: state.squads.map((s) => ({
          ...s,
          acted: false,
          moved: false,
          movedThisActivation: 0,
          // 換邊時重置「非行動方」的反擊次數
          retaliations: 1,
        })),
      };
      next = pushLog(next, {
        kind: "info",
        text: nextSide === "player" ? `第 ${nextTurn} 回合 — 我方行動` : "敵方行動……",
      });
      return next;
    }

    default:
      return state;
  }
}

function resolveAttack(
  state: BattleState,
  attackerId: string,
  targetId: string,
  rng: () => number,
): BattleState {
  const attacker = state.squads.find((s) => s.id === attackerId);
  const target = state.squads.find((s) => s.id === targetId);
  if (!attacker || !target || attacker.hpPool <= 0 || target.hpPool <= 0) return state;
  if (!canAttack(attacker)) return state;
  const range = getSquadType(attacker.typeId).range;
  if (hexDistance(attacker.pos, target.pos) > range) return state;

  const ctx = analyzeAttack(state, attacker, target, attacker.pos, attacker.movedThisActivation);
  const defType = getSquadType(target.typeId);
  const firstStrike =
    ctx.isMelee && defType.traits.includes("firstStrike") && willRetaliate(attacker, target, ctx);

  let next = state;

  if (firstStrike) {
    // 長槍先制:先反擊、再挨打
    next = updateSquad(next, targetId, { retaliations: target.retaliations - 1 });
    next = pushLog(next, { kind: "info", text: `${label(target)}槍陣先制!` });
    next = strike(next, targetId, attackerId, "retaliate", 0, rng);
    const atkAfter = next.squads.find((s) => s.id === attackerId)!;
    if (atkAfter.hpPool > 0) {
      next = strike(next, attackerId, targetId, "attack", atkAfter.movedThisActivation, rng);
    }
  } else {
    next = strike(next, attackerId, targetId, "attack", attacker.movedThisActivation, rng);
    const defAfter = next.squads.find((s) => s.id === targetId)!;
    const atkAfter = next.squads.find((s) => s.id === attackerId)!;
    if (
      defAfter.hpPool > 0 &&
      atkAfter.hpPool > 0 &&
      willRetaliate(atkAfter, defAfter, ctx)
    ) {
      next = updateSquad(next, targetId, { retaliations: defAfter.retaliations - 1 });
      next = strike(next, targetId, attackerId, "retaliate", 0, rng);
    }
  }

  // 攻擊結束本次啟動
  next = updateSquad(next, attackerId, { acted: true, moved: true });
  return checkOutcome(next);
}

function checkOutcome(state: BattleState): BattleState {
  const playerAlive = livingSquads(state, "player").length > 0;
  const enemyAlive = livingSquads(state, "enemy").length > 0;
  if (playerAlive && enemyAlive) return state;
  const outcome = playerAlive ? "victory" : "defeat";
  return pushLog(
    { ...state, outcome },
    {
      kind: "info",
      text: outcome === "victory" ? "敵軍全滅 — 勝利!" : "我軍全滅 — 敗北……",
    },
  );
}
