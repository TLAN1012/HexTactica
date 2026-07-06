/**
 * 小隊等級成長:經驗來自擊殺敵兵,升級提升血量/傷害與滿編上限。
 */
import { getSquadType } from "./units";
import type { RosterSquad, Squad } from "./types";

export const MAX_LEVEL = 5;

/** 升到 2/3/4/5 級所需累計經驗 */
export const XP_THRESHOLDS = [0, 8, 20, 40, 70];

export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) lvl = i + 1;
  }
  return Math.min(lvl, MAX_LEVEL);
}

/** 每級 +10% 血/傷 */
export function statMul(level: number): number {
  return 1 + 0.1 * (level - 1);
}

/** 滿編人數:每級 +2 */
export function maxSoldiers(typeId: string, level: number): number {
  return getSquadType(typeId).soldiers + 2 * (level - 1);
}

export function soldierHp(typeId: string, level: number): number {
  return Math.round(getSquadType(typeId).hp * statMul(level));
}

export function maxHpPool(typeId: string, level: number): number {
  return maxSoldiers(typeId, level) * soldierHp(typeId, level);
}

/** 目前存活人數 */
export function aliveSoldiers(squad: Pick<Squad, "typeId" | "level" | "hpPool">): number {
  if (squad.hpPool <= 0) return 0;
  return Math.ceil(squad.hpPool / soldierHp(squad.typeId, squad.level));
}

/** 名冊小隊 → 戰場血池(帶著戰損上場) */
export function rosterHpPool(r: RosterSquad): number {
  return r.soldiers * soldierHp(r.typeId, r.level);
}
