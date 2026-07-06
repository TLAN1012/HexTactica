/**
 * 敵方 AI — 啟發式:
 *  1. 對每個未行動小隊,枚舉「原地攻擊 / 移動後攻擊」所有選項
 *  2. 評分 = 預期擊殺價值 − 預期反擊損失 − 位置風險
 *  3. 沒有攻擊選項 → 近戰往最近敵人推進;遠程與敵保持射程邊緣
 *
 * chooseAiAction 一次回傳一個動作,UI 逐步執行(帶延遲),打完回 null。
 */
import { hexDistance, hexKey, type Hex } from "../engine/hex";
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
import { aliveSoldiers } from "./progression";
import { getSquadType } from "./units";
import type { BattleState, SideId, Squad } from "./types";

/** 目標價值:遠程與殘血優先 */
function targetValue(target: Squad): number {
  const t = getSquadType(target.typeId);
  let v = 1;
  if (t.tags.includes("ranged")) v += 0.6;
  const alive = aliveSoldiers(target);
  if (alive <= 5) v += 0.5; // 收頭優先
  return v;
}

interface Option {
  action: BattleAction;
  score: number;
}

function evalAttack(
  state: BattleState,
  squad: Squad,
  target: Squad,
  fromPos: Hex,
  movedHexes: number,
): number {
  const pv = previewAttack(state, squad, target, fromPos, movedHexes);
  const avgKills = (pv.minKills + pv.maxKills) / 2;
  const avgRet = (pv.retaliationMinKills + pv.retaliationMaxKills) / 2;
  const targetAlive = aliveSoldiers(target);
  let score = avgKills * targetValue(target) * 10;
  if (avgKills >= targetAlive) score += 40; // 能全滅大加分
  score -= avgRet * 8;
  if (pv.usesMeleeFallback) score -= 15;
  return score;
}

export function chooseAiAction(state: BattleState, side: SideId = "enemy"): BattleAction | null {
  if (state.outcome !== "ongoing") return null;
  const mySquads = livingSquads(state, side).filter((s) => !s.acted);
  if (mySquads.length === 0) return null;

  const players = livingSquads(state, side === "player" ? "enemy" : "player");
  if (players.length === 0) return null;

  // 先攻擊有利的隊,再移動沒事做的隊:全域挑最高分選項
  let best: Option | null = null;

  for (const squad of mySquads) {
    const type = getSquadType(squad.typeId);

    // 原地攻擊
    if (canAttack(squad)) {
      for (const t of attackableFrom(state, squad)) {
        const score = evalAttack(state, squad, t, squad.pos, squad.movedThisActivation);
        const opt: Option = {
          action: { type: "ATTACK", squadId: squad.id, targetId: t.id },
          score: score + 5, // 不用移動,小加分
        };
        if (!best || opt.score > best.score) best = opt;
      }
    }

    // 移動後攻擊
    if (canMove(squad)) {
      const reach = reachable(state, squad);
      for (const { pos } of reach.values()) {
        for (const t of players) {
          if (hexDistance(pos, t.pos) > type.range) continue;
          const path = tracePath(squad, reach, pos);
          const movedHexes = path.length - 1;
          const score = evalAttack(state, squad, t, pos, movedHexes);
          const opt: Option = {
            action: {
              type: "MOVE_AND_ATTACK",
              squadId: squad.id,
              to: pos,
              movedHexes,
              targetId: t.id,
            },
            score,
          };
          if (!best || opt.score > best.score) best = opt;
        }
      }
    }
  }

  // 有像樣的攻擊(分數 > 0)就執行
  if (best && best.score > 0) return best.action;

  // 否則:挑一個還能移動的隊往敵人推進 / 遠程拉開站位
  for (const squad of mySquads) {
    if (!canMove(squad)) continue;
    const type = getSquadType(squad.typeId);
    const nearest = players.reduce((a, b) =>
      hexDistance(squad.pos, a.pos) <= hexDistance(squad.pos, b.pos) ? a : b,
    );
    const reach = reachable(state, squad);
    let bestPos: { pos: Hex; score: number } | null = null;
    for (const { pos } of reach.values()) {
      const d = hexDistance(pos, nearest.pos);
      let score: number;
      if (type.range > 1) {
        // 遠程:貼近到射程邊緣,不要更近
        score = -Math.abs(d - type.range) * 10 - d;
      } else {
        score = -d * 10;
      }
      // 地形順路加一點分(站防禦地形)
      const terr = state.terrain[hexKey(pos)];
      if (terr === "hills" || terr === "forest") score += 2;
      if (!bestPos || score > bestPos.score) bestPos = { pos, score };
    }
    const curD = hexDistance(squad.pos, nearest.pos);
    if (bestPos && hexDistance(bestPos.pos, nearest.pos) !== curD) {
      const path = tracePath(squad, reach, bestPos.pos);
      return {
        type: "MOVE",
        squadId: squad.id,
        to: bestPos.pos,
        movedHexes: path.length - 1,
      };
    }
    // 動不了也標記行動結束:用原地 MOVE 會被擋,改用 ATTACK 不可行 → 直接跳過
  }

  // 沒有任何有意義的動作:回 null(UI 端會 END_TURN)
  return null;
}
