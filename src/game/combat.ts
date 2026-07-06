/**
 * 戰鬥結算 — 小隊制傷害公式
 *
 *   總傷害 = 存活人數 × 單兵傷害(min~max 隨機)
 *          × 衝鋒加成 × 克制加成 × 距離衰減
 *          × (1 − 兵種減傷) × (1 − 地形減傷)
 *
 *   減員 = 血池扣完一個單兵血量就倒一人
 */
import { hexDistance } from "../engine/hex";
import { hexKey } from "../engine/hex";
import { getSquadType } from "./units";
import { getTerrain } from "./terrain";
import { aliveSoldiers, soldierHp, statMul } from "./progression";
import type { AttackPreview, BattleState, Squad } from "./types";

export const CHARGE_PER_HEX = 0.15;
export const CHARGE_CAP = 0.6;
export const RANGED_FALLOFF_PER_HEX = 0.1;
export const ANTI_CAVALRY_BONUS = 0.3;

export interface DamageContext {
  /** 是否為近戰接觸(距離 1) */
  isMelee: boolean;
  /** 遠程兵種被貼臉,改用近戰備用武器 */
  usesMeleeFallback: boolean;
  /** 衝鋒加成(0 = 無) */
  chargeBonus: number;
  /** 克制加成 */
  matchupBonus: number;
  /** 距離衰減倍率(1 = 不衰減) */
  falloff: number;
}

/** 攻擊情境分析(攻擊與預覽共用,和實際結算完全一致) */
export function analyzeAttack(
  _state: BattleState,
  attacker: Squad,
  defender: Squad,
  /** 攻擊發起格(可能是移動後的位置) */
  fromPos = attacker.pos,
  movedHexes = attacker.movedThisActivation,
): DamageContext {
  const atkType = getSquadType(attacker.typeId);
  const defType = getSquadType(defender.typeId);
  const dist = hexDistance(fromPos, defender.pos);
  const isMelee = dist <= 1;
  const usesMeleeFallback =
    isMelee && atkType.range > 1 && !atkType.traits.includes("skirmisher");

  let chargeBonus = 0;
  if (isMelee && atkType.traits.includes("charge") && movedHexes > 0) {
    chargeBonus = Math.min(CHARGE_CAP, movedHexes * CHARGE_PER_HEX);
    // 長槍陣前衝鋒無效
    if (defType.traits.includes("antiCavalry")) chargeBonus = 0;
  }

  let matchupBonus = 0;
  if (atkType.traits.includes("antiCavalry") && defType.tags.includes("cavalry")) {
    matchupBonus = ANTI_CAVALRY_BONUS;
  }

  let falloff = 1;
  if (!isMelee && !atkType.traits.includes("volley")) {
    falloff = Math.max(0.5, 1 - RANGED_FALLOFF_PER_HEX * (dist - 1));
  }

  return { isMelee, usesMeleeFallback, chargeBonus, matchupBonus, falloff };
}

function dmgRange(squad: Squad, ctx: DamageContext): [number, number] {
  const type = getSquadType(squad.typeId);
  const base = ctx.usesMeleeFallback && type.meleeDmg ? type.meleeDmg : type.dmg;
  const mul = statMul(squad.level);
  return [base[0] * mul, base[1] * mul];
}

function damageMultiplier(state: BattleState, defender: Squad, ctx: DamageContext): number {
  const defType = getSquadType(defender.typeId);
  const terrainDef = getTerrain(state.terrain[hexKey(defender.pos)] ?? "plains").defense;
  return (
    (1 + ctx.chargeBonus) *
    (1 + ctx.matchupBonus) *
    ctx.falloff *
    (1 - defType.defense) *
    Math.max(0.25, 1 - terrainDef)
  );
}

/** 傷害上下界(預覽用) */
export function damageBounds(
  state: BattleState,
  attacker: Squad,
  defender: Squad,
  ctx: DamageContext,
): [number, number] {
  const n = aliveSoldiers(attacker);
  const [lo, hi] = dmgRange(attacker, ctx);
  const mul = damageMultiplier(state, defender, ctx);
  return [Math.round(n * lo * mul), Math.round(n * hi * mul)];
}

/** 擲一次實際傷害 */
export function rollDamage(
  state: BattleState,
  attacker: Squad,
  defender: Squad,
  ctx: DamageContext,
  rng: () => number = Math.random,
): number {
  const n = aliveSoldiers(attacker);
  const [lo, hi] = dmgRange(attacker, ctx);
  const perSoldier = lo + rng() * (hi - lo);
  return Math.max(1, Math.round(n * perSoldier * damageMultiplier(state, defender, ctx)));
}

export function killsFromDamage(defender: Squad, damage: number): number {
  const before = aliveSoldiers(defender);
  const after = aliveSoldiers({ ...defender, hpPool: defender.hpPool - damage });
  return before - after;
}

/** 防守方是否會反擊 */
export function willRetaliate(_attacker: Squad, defender: Squad, ctx: DamageContext): boolean {
  if (!ctx.isMelee) return false;
  if (defender.retaliations <= 0) return false;
  return true;
}

/** 完整攻擊預覽(含反擊預估),與實際結算共用同一套公式 */
export function previewAttack(
  state: BattleState,
  attacker: Squad,
  defender: Squad,
  fromPos = attacker.pos,
  movedHexes = attacker.movedThisActivation,
): AttackPreview {
  const ctx = analyzeAttack(state, attacker, defender, fromPos, movedHexes);
  const [dLo, dHi] = damageBounds(state, attacker, defender, ctx);

  const defType = getSquadType(defender.typeId);
  const firstStrike = ctx.isMelee && defType.traits.includes("firstStrike");
  const retaliates = willRetaliate(attacker, defender, ctx);

  // 反擊情境:防守方對攻擊方,從防守方位置打(必為近戰)
  const atkAtFrom = { ...attacker, pos: fromPos };
  const retCtx = analyzeAttack(state, defender, atkAtFrom, defender.pos, 0);

  let minKills: number;
  let maxKills: number;
  let retMinKills = 0;
  let retMaxKills = 0;

  const defHp = soldierHp(defender.typeId, defender.level);
  const atkHp = soldierHp(attacker.typeId, attacker.level);

  if (retaliates && firstStrike) {
    // 先制:防守方全額先打,攻擊方以殘餘人數出手
    const [rLo, rHi] = damageBounds(state, defender, atkAtFrom, retCtx);
    retMinKills = Math.min(aliveSoldiers(attacker), Math.floor(rLo / atkHp));
    retMaxKills = Math.min(aliveSoldiers(attacker), Math.ceil(rHi / atkHp));
    const worst = { ...attacker, pos: fromPos, hpPool: Math.max(0, attacker.hpPool - rHi) };
    const best = { ...attacker, pos: fromPos, hpPool: Math.max(0, attacker.hpPool - rLo) };
    const [wLo] = damageBounds(state, worst, defender, ctx);
    const [, bHi] = damageBounds(state, best, defender, ctx);
    minKills = Math.min(aliveSoldiers(defender), Math.floor(wLo / defHp));
    maxKills = Math.min(aliveSoldiers(defender), Math.ceil(bHi / defHp));
  } else {
    minKills = Math.min(aliveSoldiers(defender), Math.floor(dLo / defHp));
    maxKills = Math.min(aliveSoldiers(defender), Math.ceil(dHi / defHp));
    if (retaliates) {
      // 一般反擊:防守方以受創後人數還手
      const hurtLo = { ...defender, hpPool: Math.max(0, defender.hpPool - dHi) };
      const hurtHi = { ...defender, hpPool: Math.max(0, defender.hpPool - dLo) };
      if (aliveSoldiers(hurtLo) > 0 || aliveSoldiers(hurtHi) > 0) {
        const [rLo] = damageBounds(state, hurtLo, atkAtFrom, retCtx);
        const [, rHi] = damageBounds(state, hurtHi, atkAtFrom, retCtx);
        retMinKills = aliveSoldiers(hurtLo) > 0
          ? Math.min(aliveSoldiers(attacker), Math.floor(rLo / atkHp))
          : 0;
        retMaxKills = aliveSoldiers(hurtHi) > 0
          ? Math.min(aliveSoldiers(attacker), Math.ceil(rHi / atkHp))
          : 0;
      }
    }
  }

  return {
    minKills,
    maxKills,
    willRetaliate: retaliates,
    retaliationMinKills: retMinKills,
    retaliationMaxKills: retMaxKills,
    usesMeleeFallback: ctx.usesMeleeFallback,
    chargeBonus: ctx.chargeBonus,
  };
}
