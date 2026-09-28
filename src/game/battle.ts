/**
 * 戰鬥流程:由劇本初始化、移動/攻擊/回合切換 reducer、反擊結算、援軍、勝負判定。
 * 純函式、無 DOM,方便測試與 AI 重用。
 */
import { hexDistance, hexKey, hexNeighbors, type Hex } from "../engine/hex";
import {
  analyzeAttack,
  killsFromDamage,
  rollDamage,
  willRetaliate,
} from "./combat";
import { getDifficulty } from "./difficulty";
import { getCommander } from "./factions";
import { cellToHex, deploymentHexes, generateMap, parseMapRows, type GeneratedMap } from "./maps";
import { rosterHpPool, maxSoldiers, soldierHp, maxHpPool, MAX_LEVEL } from "./progression";
import { getTerrain } from "./terrain";
import { getSquadType } from "./units";
import type {
  BattleLogEntry,
  BattleState,
  Cell,
  DifficultyId,
  Reinforcement,
  RosterSquad,
  ScenarioDef,
  ScenarioSquad,
  SideId,
  Squad,
} from "./types";

// ═══════════════════════════════════════════════════════════
// 初始化
// ═══════════════════════════════════════════════════════════

export function buildMap(scenario: ScenarioDef): GeneratedMap {
  if (scenario.mapRows) return parseMapRows(scenario.mapRows);
  return generateMap(scenario.mapSeed ?? 1, scenario.mapWidth ?? 12, scenario.mapHeight ?? 8);
}

function freshSquad(partial: Omit<Squad, "movedThisActivation" | "acted" | "moved" | "retaliations">): Squad {
  return { ...partial, movedThisActivation: 0, acted: false, moved: false, retaliations: 1 };
}

function spawnFromScenario(
  s: ScenarioSquad,
  id: string,
  side: SideId,
  pos: Hex,
  levelBonus: number,
): Squad {
  const level = Math.min(MAX_LEVEL, s.level + (side === "enemy" ? levelBonus : 0));
  const full = maxHpPool(s.typeId, level);
  const hpPool = Math.max(soldierHp(s.typeId, level), Math.round(full * (1 - (s.casualties ?? 0))));
  return freshSquad({
    id,
    typeId: s.typeId,
    side,
    pos,
    level,
    xp: 0,
    hpPool,
    commanderId: s.commanderId,
    stance: s.stance ?? (side === "enemy" ? "attack" : undefined),
    anchor: s.anchor ? cellToHex(s.anchor) : s.stance === "hold" ? pos : undefined,
    activateTurn: s.activateTurn,
    modifiers: s.modifiers,
  });
}

/** 找離 want 最近、可通行又沒人站的格(援軍被擋時用) */
function nearestFree(state: Pick<BattleState, "terrain" | "squads">, want: Hex): Hex | null {
  const occupied = new Set(state.squads.filter((s) => s.hpPool > 0).map((s) => hexKey(s.pos)));
  const seen = new Set<string>([hexKey(want)]);
  const queue: Hex[] = [want];
  while (queue.length) {
    const h = queue.shift()!;
    const k = hexKey(h);
    const t = state.terrain[k];
    if (t !== undefined && !getTerrain(t).impassable && !occupied.has(k)) return h;
    for (const n of hexNeighbors(h)) {
      const nk = hexKey(n);
      if (!seen.has(nk) && state.terrain[nk] !== undefined) {
        seen.add(nk);
        queue.push(n);
      }
    }
  }
  return null;
}

export function initBattle(
  scenario: ScenarioDef,
  roster: RosterSquad[],
  difficultyId: DifficultyId = "knight",
  gold = 0,
): BattleState {
  const map = buildMap(scenario);
  const diff = getDifficulty(difficultyId);
  const fielded = scenario.useRoster === false ? [] : roster.filter((r) => r.soldiers > 0);
  const fixed = scenario.playerFixed ?? [];

  const playerSpots = scenario.playerDeploy
    ? scenario.playerDeploy.map(cellToHex)
    : deploymentHexes(map, "player", fixed.length + fielded.length);
  const enemyFallback = deploymentHexes(map, "enemy", scenario.enemies.length);

  const base: Pick<BattleState, "terrain" | "squads"> = { terrain: map.terrain, squads: [] };
  const place = (want: Hex | undefined): Hex => {
    const spot = (want && nearestFree(base, want)) || nearestFree(base, playerSpots[0] ?? map.hexes[0]);
    if (!spot) throw new Error(`劇本 ${scenario.id}:找不到佈署空位`);
    return spot;
  };

  let slot = 0;
  fixed.forEach((s, i) => {
    const pos = place(s.at ? cellToHex(s.at) : playerSpots[slot++]);
    base.squads.push(spawnFromScenario(s, `fixed-${i}`, "player", pos, 0));
  });
  fielded.forEach((r) => {
    const pos = place(playerSpots[slot++]);
    base.squads.push(
      freshSquad({
        id: r.id,
        typeId: r.typeId,
        side: "player",
        pos,
        level: r.level,
        xp: r.xp,
        hpPool: rosterHpPool(r),
        commanderId: r.commanderId,
      }),
    );
  });
  scenario.enemies.forEach((e, i) => {
    const pos = place(e.at ? cellToHex(e.at) : enemyFallback[i]);
    base.squads.push(spawnFromScenario(e, `enemy-${i}`, "enemy", pos, diff.enemyLevelBonus));
  });

  if (scenario.playerAiStance) {
    base.squads = base.squads.map((s) =>
      s.side === "player" ? { ...s, stance: scenario.playerAiStance, anchor: s.anchor ?? s.pos } : s,
    );
  }

  const objectiveCells: Cell[] = [
    ...scenario.victory.flatMap((v) => (v.kind === "holdUntil" ? v.hexes : [])),
    ...scenario.defeat.flatMap((d) => (d.kind === "hexesLost" ? d.hexes : [])),
  ];

  return {
    scenarioId: scenario.id,
    missionId: scenario.id,
    turn: 1,
    activeSide: "player",
    terrain: map.terrain,
    width: map.width,
    height: map.height,
    squads: base.squads,
    log: [
      { turn: 1, text: `—— ${scenario.title} ——`, kind: "info" },
      { turn: 1, text: `目標:${scenario.objectiveText}`, kind: "event" },
      { turn: 1, text: "我方回合。點選部隊下達命令。", kind: "info" },
    ],
    outcome: "ongoing",
    kills: {},
    difficulty: difficultyId,
    enemyStatMul: diff.enemyStatMul,
    victory: scenario.victory,
    defeat: scenario.defeat,
    pendingReinforcements: (scenario.reinforcements ?? []).map((r) => ({ ...r })),
    objectiveHexes: [...new Set(objectiveCells.map((c) => hexKey(cellToHex(c))))],
    gold,
    goldSpent: 0,
    reinforced: [],
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
export function reachable(state: BattleState, squad: Squad, moveOverride?: number): Map<string, ReachableHex> {
  const move = moveOverride ?? getSquadType(squad.typeId).move;
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
 * 遠程盡量站遠;近戰選「能衝鋒就多跑幾格、站在好地形」的格。
 * 回傳 null 表示目標此回合打不到。
 */
export function bestAttackPosition(
  state: BattleState,
  squad: Squad,
  target: Squad,
): { pos: Hex; movedHexes: number } | null {
  const type = getSquadType(squad.typeId);
  const range = type.range;
  if (hexDistance(squad.pos, target.pos) <= range && canAttack(squad) && (!canMove(squad) || range > 1)) {
    return { pos: squad.pos, movedHexes: squad.movedThisActivation };
  }
  if (!canMove(squad)) return null;
  const reach = reachable(state, squad);
  const candidates: { pos: Hex; movedHexes: number }[] = [];
  if (hexDistance(squad.pos, target.pos) <= range) candidates.push({ pos: squad.pos, movedHexes: 0 });
  for (const { pos } of reach.values()) {
    if (hexDistance(pos, target.pos) > range) continue;
    candidates.push({ pos, movedHexes: tracePath(squad, reach, pos).length - 1 });
  }
  let best: { pos: Hex; movedHexes: number; score: number } | null = null;
  for (const c of candidates) {
    const dist = hexDistance(c.pos, target.pos);
    const terr = getTerrain(state.terrain[hexKey(c.pos)] ?? "plains");
    let score = terr.defense * 20 - c.movedHexes * 0.1;
    if (range > 1) score += dist * 100;
    else if (type.traits.includes("charge") && !terr.noCharge) score += c.movedHexes * 3;
    if (!best || score > best.score) best = { ...c, score };
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
  /** 緊急整補:補回滿編 20%,花 3 倍補兵價,用掉這隊本回合的行動 */
  | { type: "REINFORCE"; squadId: string }
  /** 原地待命(結束這隊的啟動;AI 的固守隊也用它) */
  | { type: "HOLD"; squadId: string }
  | { type: "END_TURN" };

function pushLog(state: BattleState, entry: Omit<BattleLogEntry, "turn">): BattleState {
  return { ...state, log: [...state.log, { turn: state.turn, ...entry }] };
}

export function squadLabel(squad: Squad): string {
  const t = getSquadType(squad.typeId);
  const who = squad.commanderId ? `${getCommander(squad.commanderId).name}的` : "";
  return `${squad.side === "player" ? "我方" : "敵方"}${who}${t.name}`;
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

  const ctx = analyzeAttack(state, attacker, defender, attacker.pos, movedHexes, kind === "retaliate");
  const dmg = rollDamage(state, attacker, defender, ctx, rng);
  const kills = killsFromDamage(defender, dmg);
  const newPool = Math.max(0, defender.hpPool - dmg);
  const destroyed = newPool <= 0;

  let next = updateSquad(state, defenderId, { hpPool: newPool });

  if (kills > 0) {
    next = {
      ...next,
      kills: { ...next.kills, [attackerId]: (next.kills[attackerId] ?? 0) + kills },
    };
  }

  const verb = kind === "retaliate" ? "反擊" : ctx.isMelee ? "攻擊" : "射擊";
  const extra: string[] = [];
  if (ctx.chargeBonus > 0) extra.push(`衝鋒 +${Math.round(ctx.chargeBonus * 100)}%`);
  if (ctx.usesMeleeFallback) extra.push("被迫近戰");
  extra.push(...ctx.notes.filter((n) => !n.startsWith("衝鋒")));
  next = pushLog(next, {
    kind: kind === "retaliate" ? "retaliate" : "attack",
    text: `${squadLabel(attacker)}${verb} ${squadLabel(defender)}${extra.length ? `(${extra.join("、")})` : ""}:${dmg} 傷害,${kills} 人倒下`,
  });
  if (destroyed) {
    next = pushLog(next, {
      kind: "death",
      text: defender.commanderId
        ? `${getCommander(defender.commanderId).name}陣亡!${squadLabel(defender)}全滅!`
        : `${squadLabel(defender)}全滅!`,
    });
  }
  return next;
}

/**
 * 驗證並套用移動:目的地必須在 reachable() 內,
 * 移動格數由實際路徑推導(不信任 action 攜帶的值)。
 */
function applyMove(
  state: BattleState,
  squadId: string,
  to: Hex,
): { state: BattleState; squad: Squad } | null {
  const squad = state.squads.find((s) => s.id === squadId);
  if (!squad || !canMove(squad) || squad.side !== state.activeSide) return null;
  const reach = reachable(state, squad);
  if (!reach.has(hexKey(to))) return null;
  const movedHexes = tracePath(squad, reach, to).length - 1;
  return {
    state: updateSquad(state, squad.id, {
      pos: to,
      moved: true,
      movedThisActivation: movedHexes,
    }),
    squad,
  };
}

export function battleReducer(
  state: BattleState,
  action: BattleAction,
  rng: () => number = Math.random,
): BattleState {
  if (state.outcome !== "ongoing") return state;

  switch (action.type) {
    case "MOVE": {
      const moved = applyMove(state, action.squadId, action.to);
      if (!moved) return state;
      return pushLog(moved.state, { kind: "move", text: `${squadLabel(moved.squad)}移動` });
    }

    case "ATTACK":
      return resolveAttack(state, action.squadId, action.targetId, rng);

    case "MOVE_AND_ATTACK": {
      const moved = applyMove(state, action.squadId, action.to);
      if (!moved) return state;
      return resolveAttack(moved.state, action.squadId, action.targetId, rng);
    }

    case "REINFORCE": {
      const squad = state.squads.find((s) => s.id === action.squadId);
      if (!squad) return state;
      const info = reinforceInfo(state, squad);
      if (!info.ok) return state;
      const hp = soldierHp(squad.typeId, squad.level);
      let next = updateSquad(state, squad.id, {
        hpPool: Math.min(maxHpPool(squad.typeId, squad.level), squad.hpPool + info.soldiers * hp),
        acted: true,
        moved: true,
      });
      next = { ...next, gold: next.gold - info.cost, goldSpent: next.goldSpent + info.cost, reinforced: [...next.reinforced, squad.id] };
      return pushLog(next, { kind: "event", text: `${squadLabel(squad)}緊急整補 +${info.soldiers} 人(花費 ${info.cost} 金)` });
    }

    case "HOLD": {
      const squad = state.squads.find((s) => s.id === action.squadId);
      if (!squad || squad.acted || squad.side !== state.activeSide) return state;
      return updateSquad(state, squad.id, { acted: true, moved: true });
    }

    case "END_TURN":
      return endTurn(state);

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
  if (!canAttack(attacker) || attacker.side !== state.activeSide || target.side === attacker.side) return state;
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
    next = pushLog(next, { kind: "info", text: `${squadLabel(target)}槍陣先制!` });
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
  return checkImmediateOutcome(next);
}

// ═══════════════════════════════════════════════════════════
// 回合切換、援軍、勝負
// ═══════════════════════════════════════════════════════════

function finish(state: BattleState, outcome: "victory" | "defeat", reason: string): BattleState {
  return pushLog({ ...state, outcome, outcomeReason: reason }, {
    kind: "info",
    text: `${outcome === "victory" ? "勝利" : "敗北"}:${reason}`,
  });
}

function commanderDead(state: BattleState, commanderId: string): boolean {
  const sq = state.squads.find((s) => s.commanderId === commanderId);
  return !!sq && sq.hpPool <= 0;
}

/** 攻擊後立即判定:全滅、指揮官陣亡 */
function checkImmediateOutcome(state: BattleState): BattleState {
  for (const d of state.defeat) {
    if (d.kind === "annihilated" && livingSquads(state, "player").length === 0) {
      return finish(state, "defeat", "我軍全滅");
    }
    if (d.kind === "commanderLost" && commanderDead(state, d.commanderId)) {
      return finish(state, "defeat", `${getCommander(d.commanderId).name}陣亡`);
    }
  }
  if (livingSquads(state, "player").length === 0) return finish(state, "defeat", "我軍全滅");
  for (const v of state.victory) {
    if (v.kind === "annihilate" && livingSquads(state, "enemy").length === 0 && state.pendingReinforcements.every((r) => r.side !== "enemy")) {
      return finish(state, "victory", "敵軍全滅");
    }
    if (v.kind === "killCommander" && commanderDead(state, v.commanderId)) {
      return finish(state, "victory", `擊敗${getCommander(v.commanderId).name}`);
    }
  }
  return state;
}

function holdsHexes(state: BattleState, side: SideId, cells: Cell[]): boolean {
  const keys = new Set(cells.map((c) => hexKey(cellToHex(c))));
  return livingSquads(state, side).some((s) => keys.has(hexKey(s.pos)));
}

/** 一整輪(雙方都動完)結束時判定:撐過、守住、失守、逾時 */
function checkRoundEnd(state: BattleState, finishedTurn: number): BattleState {
  for (const d of state.defeat) {
    if (d.kind === "hexesLost") {
      const keys = new Set(d.hexes.map((c) => hexKey(cellToHex(c))));
      const enemyOnAll = [...keys].every((k) => livingSquads(state, "enemy").some((s) => hexKey(s.pos) === k));
      if (enemyOnAll) return finish(state, "defeat", "目標陣地失守");
    }
  }
  for (const v of state.victory) {
    if (v.kind === "survive" && finishedTurn >= v.turn) return finish(state, "victory", `撐過了 ${v.turn} 回合`);
    if (v.kind === "holdUntil" && finishedTurn >= v.turn) {
      const ok = v.requireOccupied
        ? holdsHexes(state, "player", v.hexes)
        : !v.hexes.every((c) => livingSquads(state, "enemy").some((s) => hexKey(s.pos) === hexKey(cellToHex(c))));
      if (ok) return finish(state, "victory", `守住陣地直到第 ${v.turn} 回合`);
    }
  }
  for (const d of state.defeat) {
    if (d.kind === "timeout" && finishedTurn >= d.turn) return finish(state, "defeat", "時間耗盡,未能達成目標");
  }
  return state;
}

function arriveReinforcements(state: BattleState, side: SideId): BattleState {
  const due = state.pendingReinforcements.filter((r) => r.side === side && r.turn <= state.turn);
  if (!due.length) return state;
  let next: BattleState = {
    ...state,
    pendingReinforcements: state.pendingReinforcements.filter((r) => !due.includes(r)),
  };
  const diff = getDifficulty(state.difficulty);
  for (const r of due) {
    r.squads.forEach((s, i) => {
      const pos = nearestFree(next, s.at ? cellToHex(s.at) : next.squads[0].pos);
      if (!pos) return;
      const id = `${side}-r${r.turn}-${i}-${next.squads.length}`;
      next = { ...next, squads: [...next.squads, spawnFromScenario(s, id, side, pos, diff.enemyLevelBonus)] };
    });
    next = pushLog(next, { kind: "event", text: r.message });
  }
  return next;
}

function endTurn(state: BattleState): BattleState {
  const nextSide: SideId = state.activeSide === "player" ? "enemy" : "player";
  let next: BattleState = state;

  // 敵方動完 = 一整輪結束
  if (state.activeSide === "enemy") {
    next = checkRoundEnd(next, state.turn);
    if (next.outcome !== "ongoing") return next;
  }

  const nextTurn = nextSide === "player" ? state.turn + 1 : state.turn;
  next = {
    ...next,
    turn: nextTurn,
    activeSide: nextSide,
    squads: next.squads.map((s) => ({
      ...s,
      acted: false,
      moved: false,
      movedThisActivation: 0,
      retaliations: 1,
    })),
  };
  next = arriveReinforcements(next, nextSide);
  // 固守隊到了指定回合轉為進攻(例如斯坦福橋:奧里援軍一到,挪威軍全線反攻)
  if (next.squads.some((s) => s.side === nextSide && s.stance === "hold" && s.activateTurn !== undefined && s.activateTurn <= next.turn)) {
    next = {
      ...next,
      squads: next.squads.map((s) =>
        s.side === nextSide && s.stance === "hold" && s.activateTurn !== undefined && s.activateTurn <= next.turn
          ? { ...s, stance: "attack" as const }
          : s,
      ),
    };
  }
  next = pushLog(next, {
    kind: "info",
    text: nextSide === "player" ? `第 ${nextTurn} 回合 — 我方行動` : "敵方行動……",
  });
  return checkImmediateOutcome(next);
}

/** 戰場上某隊的滿編人數(UI 用) */
export function squadMaxSoldiers(s: Squad): number {
  return maxSoldiers(s.typeId, s.level);
}

/** 回合上限(UI 顯示「第 N / M 回合」) */
export function turnLimit(state: BattleState): number | null {
  const turns = [
    ...state.victory.flatMap((v) => (v.kind === "survive" || v.kind === "holdUntil" ? [v.turn] : [])),
    ...state.defeat.flatMap((d) => (d.kind === "timeout" ? [d.turn] : [])),
  ];
  return turns.length ? Math.max(...turns) : null;
}

export { getTerrain };
export const reinforcementsFor = (state: BattleState, side: SideId): Reinforcement[] =>
  state.pendingReinforcements.filter((r) => r.side === side);

// ═══════════════════════════════════════════════════════════
// 緊急整補
// ═══════════════════════════════════════════════════════════

export const REINFORCE_FRACTION = 0.2;
export const REINFORCE_PRICE_MUL = 3;

export interface ReinforceInfo {
  ok: boolean;
  soldiers: number;
  cost: number;
  /** 不能整補的原因(按鈕上顯示) */
  reason?: string;
}

/** 這一隊現在能不能緊急整補、補幾人、要多少錢 */
export function reinforceInfo(state: BattleState, squad: Squad): ReinforceInfo {
  const max = maxSoldiers(squad.typeId, squad.level);
  const alive = Math.ceil(squad.hpPool / soldierHp(squad.typeId, squad.level));
  const soldiers = Math.min(Math.ceil(max * REINFORCE_FRACTION), max - alive);
  const cost = soldiers * getSquadType(squad.typeId).soldierCost * REINFORCE_PRICE_MUL;
  const fail = (reason: string): ReinforceInfo => ({ ok: false, soldiers, cost, reason });
  if (state.outcome !== "ongoing" || squad.side !== "player" || state.activeSide !== "player") return fail("不是我方回合");
  if (squad.hpPool <= 0) return fail("已全滅");
  if (state.reinforced.includes(squad.id)) return fail("本場已整補過");
  if (soldiers <= 0) return fail("人數已滿");
  if (squad.acted || squad.moved) return fail("本回合已行動");
  const near = new Set(hexNeighbors(squad.pos).map(hexKey));
  if (livingSquads(state, "enemy").some((e) => near.has(hexKey(e.pos)))) return fail("正與敵軍交戰");
  if (state.gold < cost) return fail(`金幣不足(需 ${cost})`);
  return { ok: true, soldiers, cost };
}
