/**
 * 戰術 AI — 效用評估(utility AI)+ 威脅地圖
 *
 *  1. 威脅地圖:對手每一隊下回合「走得到並打得到」的格,累加其火力
 *  2. 對每個未行動小隊列出所有選項(原地打、移動後打、純移動、待命),各自評分:
 *       攻擊 = 預期擊殺 × 目標價值(殘血、指揮官、弓手優先)− 反擊損失 + 發起格的位置分
 *       位置 = 地形掩護 + 盾牆相鄰 − 威脅 × 技巧 + 朝目標推進(目標格或最近敵人)
 *  3. 全域挑最高分的一個動作回傳;UI 逐步執行,打完回 null → END_TURN
 *
 * 難度靠 skill(0~1)調整:技巧低 → 不太看威脅、常選次佳(加雜訊),技巧高 → 冷靜精算。
 * 姿態:attack 進攻;hold 固守錨點半徑內、只打送上門的;reserve 到指定回合才出動。
 */
import { hexDistance, hexKey, hexNeighbors, type Hex } from "../engine/hex";
import {
  attackableFrom,
  canAttack,
  canMove,
  livingSquads,
  reachable,
  tracePath,
  type BattleAction,
} from "./battle";
import { previewAttack } from "./combat";
import { getDifficulty } from "./difficulty";
import { cellToHex } from "./maps";
import { aliveSoldiers, maxSoldiers, soldierHp } from "./progression";
import { getTerrain } from "./terrain";
import { getSquadType } from "./units";
import type { BattleState, SideId, Squad } from "./types";

export interface AiOptions {
  /** 0~1;省略則依戰鬥難度(敵方)或 1(玩家方自動模擬) */
  skill?: number;
  rng?: () => number;
}

const HOLD_RADIUS = 1;

const other = (side: SideId): SideId => (side === "player" ? "enemy" : "player");

function strength(s: Squad): number {
  const t = getSquadType(s.typeId);
  return aliveSoldiers(s) * ((t.dmg[0] + t.dmg[1]) / 2);
}

/** 目標價值:殘血(可收頭)、指揮官、遠程優先 */
function targetValue(target: Squad): number {
  const t = getSquadType(target.typeId);
  let v = 1;
  if (t.tags.includes("ranged")) v += 0.5;
  if (target.commanderId) v += 1.2;
  const frac = aliveSoldiers(target) / maxSoldiers(target.typeId, target.level);
  v += (1 - frac) * 0.8; // 集火已受傷的隊
  return v;
}

// ── 威脅地圖(每個 state 只算一次) ─────────────────────────
const threatCache = new WeakMap<BattleState, Map<SideId, Map<string, number>>>();

/** 對手(from side 的敵人)下回合能對每一格造成的火力總和 */
export function threatMap(state: BattleState, side: SideId): Map<string, number> {
  let perSide = threatCache.get(state);
  if (!perSide) {
    perSide = new Map();
    threatCache.set(state, perSide);
  }
  const cached = perSide.get(side);
  if (cached) return cached;

  const map = new Map<string, number>();
  for (const opp of livingSquads(state, other(side))) {
    if (opp.stance === "reserve" && (opp.activateTurn ?? 0) > state.turn + 1) continue;
    const t = getSquadType(opp.typeId);
    const power = strength(opp);
    const standing = [opp.pos, ...[...reachable(state, { ...opp, acted: false, moved: false }).values()].map((r) => r.pos)];
    const hit = new Set<string>();
    for (const p of standing) {
      if (t.range <= 1) {
        for (const n of hexNeighbors(p)) hit.add(hexKey(n));
      } else {
        for (const k of Object.keys(state.terrain)) {
          const [q, r] = k.split(",").map(Number);
          if (hexDistance(p, { q, r }) <= t.range) hit.add(k);
        }
      }
    }
    for (const k of hit) map.set(k, (map.get(k) ?? 0) + power);
  }
  perSide.set(side, map);
  return map;
}

// ── 目標 ──────────────────────────────────────────────────

/** 這一方的勝利條件(玩家方直接讀劇本;敵方的勝利 = 玩家的失敗條件) */
function sideWins(state: BattleState, side: SideId) {
  return side === "player" ? state.victory : [];
}

/**
 * 要斬首的敵方指揮官:玩家方看 killCommander;敵方看玩家的 commanderLost。
 * 敵方 AI 要領主以上難度(技巧 ≥ 0.9)才懂得集中斬首——這是難度差異的一部分。
 */
function decapitationTargets(state: BattleState, side: SideId): Squad[] {
  if (side === "enemy" && getDifficulty(state.difficulty).aiSkill < 0.9) return [];
  const ids = side === "player"
    ? state.victory.flatMap((v) => (v.kind === "killCommander" ? [v.commanderId] : []))
    : state.defeat.flatMap((d) => (d.kind === "commanderLost" ? [d.commanderId] : []));
  return livingSquads(state, other(side)).filter((s) => s.commanderId && ids.includes(s.commanderId));
}

/** 自己的指揮官倒下就輸(要特別保護) */
function isVitalCommander(state: BattleState, squad: Squad): boolean {
  if (!squad.commanderId) return false;
  return squad.side === "player"
    ? state.defeat.some((d) => d.kind === "commanderLost" && d.commanderId === squad.commanderId)
    : state.victory.some((v) => v.kind === "killCommander" && v.commanderId === squad.commanderId);
}

/**
 * 進攻方(對手靠「撐過 / 守住 N 回合」獲勝)要有時間壓力:越接近期限越不怕挨打。
 * 回傳 0(不急)~ 1(最後關頭)。
 */
export function urgency(state: BattleState, side: SideId): number {
  const deadlines = side === "enemy"
    ? state.victory.flatMap((v) => (v.kind === "survive" || v.kind === "holdUntil" ? [v.turn] : []))
    : state.defeat.flatMap((d) => (d.kind === "timeout" ? [d.turn] : []));
  // 沒有期限的戰役:回合拖越久越敢打,避免雙方隔著河對峙到天荒地老
  if (!deadlines.length) return Math.max(0, Math.min(1, (state.turn - 6) / 8));
  const T = Math.min(...deadlines);
  // 期限過了六成就全力進攻
  return Math.max(0.3, Math.min(1, (state.turn - 1) / (T * 0.6)));
}

/** 這一方想去的地方:斬首目標 > 目標格 > 最近的敵人 */
function goalHexes(state: BattleState, side: SideId): Hex[] {
  const heads = decapitationTargets(state, side);
  if (heads.length) return heads.map((s) => s.pos);
  if (state.objectiveHexes.length) {
    return state.objectiveHexes.map((k) => {
      const [q, r] = k.split(",").map(Number);
      return { q, r };
    });
  }
  void sideWins;
  return livingSquads(state, other(side)).map((s) => s.pos);
}

/**
 * 路徑距離場:從所有目標格往外做 Dijkstra(依地形移動成本、繞開河流,忽略部隊),
 * 讓 AI 知道要繞渡口、過橋,而不是擠在河岸邊看著對岸。每個 state × 目標組合只算一次。
 */
const fieldCache = new WeakMap<BattleState, Map<string, Map<string, number>>>();

function distanceField(state: BattleState, goals: Hex[]): Map<string, number> {
  const sig = goals.map(hexKey).sort().join("|");
  let perState = fieldCache.get(state);
  if (!perState) {
    perState = new Map();
    fieldCache.set(state, perState);
  }
  const hit = perState.get(sig);
  if (hit) return hit;
  const dist = new Map<string, number>();
  const frontier: { h: Hex; d: number }[] = [];
  for (const g of goals) {
    dist.set(hexKey(g), 0);
    frontier.push({ h: g, d: 0 });
  }
  while (frontier.length) {
    frontier.sort((x, y) => x.d - y.d);
    const { h, d } = frontier.shift()!;
    if (d > (dist.get(hexKey(h)) ?? Infinity)) continue;
    for (const n of hexNeighbors(h)) {
      const k = hexKey(n);
      const tid = state.terrain[k];
      if (tid === undefined) continue;
      const t = getTerrain(tid);
      if (t.impassable) continue;
      const nd = d + t.moveCost;
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd);
        frontier.push({ h: n, d: nd });
      }
    }
  }
  perState.set(sig, dist);
  return dist;
}

function distToGoal(state: BattleState, pos: Hex, goals: Hex[]): number {
  if (!goals.length) return 0;
  return distanceField(state, goals).get(hexKey(pos)) ?? 99;
}

/** 這一隊還在待命(預備隊未到出動回合,且沒有敵人逼近) */
function isDormant(state: BattleState, squad: Squad): boolean {
  if (squad.stance !== "reserve") return false;
  if ((squad.activateTurn ?? 0) <= state.turn) return false;
  const t = getSquadType(squad.typeId);
  return !livingSquads(state, other(squad.side)).some((o) => hexDistance(o.pos, squad.pos) <= t.move + t.range + 1);
}

// ── 評分 ──────────────────────────────────────────────────

function positionScore(state: BattleState, squad: Squad, pos: Hex, skill: number, goals: Hex[]): number {
  const t = getSquadType(squad.typeId);
  const terr = getTerrain(state.terrain[hexKey(pos)] ?? "plains");
  let score = terr.defense * 25;

  // 盾牆:站到其他盾牆隊旁邊
  if (t.traits.includes("shieldWall")) {
    const near = new Set(hexNeighbors(pos).map(hexKey));
    const walls = livingSquads(state, squad.side).filter(
      (a) => a.id !== squad.id && near.has(hexKey(a.pos)) && getSquadType(a.typeId).traits.includes("shieldWall"),
    ).length;
    score += Math.min(2, walls) * 7;
  }

  // 威脅:可能挨打的火力相對自身血量
  const threat = threatMap(state, squad.side).get(hexKey(pos)) ?? 0;
  const danger = Math.min(2, threat / Math.max(1, squad.hpPool));
  const caution = isVitalCommander(state, squad) ? 4 : squad.commanderId ? 2 : t.tags.includes("ranged") ? 1.6 : 1;
  const u = urgency(state, squad.side);
  // 對手靠「撐時間」獲勝時,進攻方從一開始就要敢推進(威脅只算三成,越接近期限越不怕)
  const pressure = u > 0 ? 0.3 * (1 - 0.8 * u) : 1;
  score -= danger * 30 * skill * caution * (isVitalCommander(state, squad) ? 1 : pressure);

  // 推進 / 固守
  if (isVitalCommander(state, squad)) {
    // 倒下就輸的指揮官:不帶頭衝,跟在自家部隊旁邊(光環照得到),離前線保持距離
    const allies = livingSquads(state, squad.side).filter((a) => a.id !== squad.id);
    const nearAlly = allies.length ? Math.min(...allies.map((a) => hexDistance(pos, a.pos))) : 0;
    score -= Math.max(0, nearAlly - 1) * 8;
    const foes = livingSquads(state, other(squad.side));
    const nearFoe = foes.length ? Math.min(...foes.map((f) => hexDistance(pos, f.pos))) : 9;
    if (nearFoe <= 1) score -= 20;
    if (squad.stance === "hold" && squad.anchor) score -= Math.max(0, hexDistance(pos, squad.anchor) - HOLD_RADIUS) * 10;
    else score -= distToGoal(state, pos, goals) * 1.5;
  } else if (squad.stance === "hold" && squad.anchor) {
    const d = hexDistance(pos, squad.anchor);
    score -= d > HOLD_RADIUS ? 40 + d * 5 : d * 2;
  } else if (t.range > 1) {
    // 遠程:離最近敵人保持在射程邊緣
    const foes = livingSquads(state, other(squad.side));
    const nearest = foes.length ? Math.min(...foes.map((f) => hexDistance(pos, f.pos))) : 0;
    score -= Math.abs(nearest - t.range) * 6;
    if (nearest <= 1) score -= 25;
  } else {
    score -= distToGoal(state, pos, goals) * (4 + 12 * urgency(state, squad.side)) * 0.6;
  }
  // 站上目標格
  if (state.objectiveHexes.includes(hexKey(pos))) score += 12;
  return score;
}

function attackScore(state: BattleState, squad: Squad, target: Squad, fromPos: Hex, movedHexes: number): number {
  const pv = previewAttack(state, squad, target, fromPos, movedHexes);
  const avgKills = (pv.minKills + pv.maxKills) / 2;
  const avgRet = (pv.retaliationMinKills + pv.retaliationMaxKills) / 2;
  const myWorth = soldierHp(squad.typeId, squad.level) / 10;
  const theirWorth = soldierHp(target.typeId, target.level) / 10;
  const head = decapitationTargets(state, squad.side).some((h) => h.id === target.id) ? 2 : 1;
  let score = avgKills * theirWorth * targetValue(target) * 10 * head;
  if (pv.minKills >= aliveSoldiers(target)) score += 45 + (target.commanderId ? 60 : 0) * head;
  score -= avgRet * myWorth * 9 * (isVitalCommander(state, squad) ? 3.5 : squad.commanderId ? 1.8 : 1);
  if (pv.usesMeleeFallback) score -= 15;
  return score;
}

interface Option {
  action: BattleAction;
  score: number;
}

export function chooseAiAction(
  state: BattleState,
  side: SideId = "enemy",
  opts: AiOptions = {},
): BattleAction | null {
  if (state.outcome !== "ongoing" || state.activeSide !== side) return null;
  const skill = opts.skill ?? (side === "enemy" ? getDifficulty(state.difficulty).aiSkill : 1);
  const rng = opts.rng ?? Math.random;
  const noise = () => (rng() - 0.5) * 40 * (1 - skill);

  const mine = livingSquads(state, side).filter((s) => !s.acted);
  if (mine.length === 0) return null;
  if (livingSquads(state, other(side)).length === 0) return null;
  const goals = goalHexes(state, side);

  let best: Option | null = null;
  const consider = (o: Option) => {
    if (!best || o.score > best.score) best = o;
  };
  // 划不來的攻擊(預期損失大於戰果)不做,讓它輸給移動或待命
  const considerAttack = (o: Option) => {
    if (o.score > -8) consider(o);
  };

  for (const squad of mine) {
    if (isDormant(state, squad)) {
      consider({ action: { type: "HOLD", squadId: squad.id }, score: -1000 });
      continue;
    }
    const t = getSquadType(squad.typeId);
    const here = positionScore(state, squad, squad.pos, skill, goals);

    // 原地攻擊
    if (canAttack(squad)) {
      for (const target of attackableFrom(state, squad)) {
        const s = attackScore(state, squad, target, squad.pos, squad.movedThisActivation) + here * 0.3 + 4;
        considerAttack({ action: { type: "ATTACK", squadId: squad.id, targetId: target.id }, score: s + noise() });
      }
    }

    if (!canMove(squad)) {
      consider({ action: { type: "HOLD", squadId: squad.id }, score: -500 });
      continue;
    }

    const reach = reachable(state, squad);
    const foes = livingSquads(state, other(squad.side));
    let bestMove: Option | null = null;
    for (const { pos } of reach.values()) {
      const posScore = positionScore(state, squad, pos, skill, goals);
      // 固守隊不離開錨點太遠去追人
      const leash = squad.stance === "hold" && squad.anchor && hexDistance(pos, squad.anchor) > HOLD_RADIUS + 1;

      // 倒下就輸的指揮官不衝出去打(只在原地出手),避免離開有利地形
      if (!leash && !isVitalCommander(state, squad)) {
        for (const target of foes) {
          if (hexDistance(pos, target.pos) > t.range) continue;
          const moved = tracePath(squad, reach, pos).length - 1;
          const s = attackScore(state, squad, target, pos, moved) + posScore * 0.3;
          considerAttack({
            action: { type: "MOVE_AND_ATTACK", squadId: squad.id, to: pos, movedHexes: moved, targetId: target.id },
            score: s + noise(),
          });
        }
      }

      const gain = posScore - here;
      if (!bestMove || gain > bestMove.score) {
        bestMove = {
          action: { type: "MOVE", squadId: squad.id, to: pos, movedHexes: tracePath(squad, reach, pos).length - 1 },
          score: gain,
        };
      }
    }

    // 純移動:只有真的比較好才走(分數壓低,讓攻擊優先)
    if (bestMove && bestMove.score > 1) {
      consider({ action: bestMove.action, score: Math.min(0, bestMove.score - 30) + noise() * 0.3 });
    } else {
      consider({ action: { type: "HOLD", squadId: squad.id }, score: -200 });
    }
  }

  return (best as Option | null)?.action ?? null;
}

/** 目標格(axial)給 UI 或測試用 */
export function objectiveHexList(state: BattleState): Hex[] {
  return state.objectiveHexes.map((k) => {
    const [q, r] = k.split(",").map(Number);
    return { q, r };
  });
}

export { cellToHex };
