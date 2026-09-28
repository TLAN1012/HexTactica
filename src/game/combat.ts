/**
 * 戰鬥結算 — 小隊制傷害公式
 *
 *   總傷害 = 存活人數 × 單兵傷害(min~max 隨機)
 *          × (1+衝鋒) × (1+克騎) × (1+狂暴) × (1+指揮官光環) × 距離衰減 × 劇本修正 × 難度
 *          × (1 − 有效減傷) × max(0.25, 1 − 地形減傷)
 *
 *   有效減傷 = 兵種減傷(穿甲時減半) + 盾牆 + 劇本修正,夾在 −0.3 ~ 0.75
 *
 * analyzeAttack 是唯一的情境分析:攻擊預覽、實際結算、AI 評分全部走它,三者永遠一致。
 */
import { hexDistance, hexKey, hexNeighbors, type Hex } from "../engine/hex";
import { COMMANDER_AURA } from "./factions";
import { getSquadType } from "./units";
import { getTerrain } from "./terrain";
import { aliveSoldiers, soldierHp, statMul } from "./progression";
import type { AttackPreview, BattleState, Squad } from "./types";

export const CHARGE_PER_HEX = 0.15;
export const CHARGE_CAP = 0.6;
export const RANGED_FALLOFF_PER_HEX = 0.1;
export const ANTI_CAVALRY_BONUS = 0.3;
export const BERSERK_BONUS = 0.25;
/** 盾牆:相鄰 1 個盾牆友軍 +15% 減傷,2 個以上 +25% */
export const SHIELDWALL_ONE = 0.15;
export const SHIELDWALL_TWO = 0.25;

export interface DamageContext {
  /** 是否為近戰接觸(距離 1) */
  isMelee: boolean;
  /** 遠程兵種被貼臉,改用近戰備用武器 */
  usesMeleeFallback: boolean;
  /** 衝鋒加成(0 = 無) */
  chargeBonus: number;
  /** 衝鋒被擋掉的原因(給預覽說明) */
  chargeBlockedBy?: string;
  /** 克制加成 */
  matchupBonus: number;
  berserkBonus: number;
  commanderBonus: number;
  /** 盾牆帶來的額外減傷 */
  shieldWall: number;
  pierce: boolean;
  /** 距離衰減倍率(1 = 不衰減) */
  falloff: number;
  /** 攻方劇本修正 × 難度倍率 */
  attackerMul: number;
  /** 守方劇本減傷修正 */
  defenseMod: number;
  notes: string[];
}

function alliesAdjacent(state: BattleState, squad: Squad, at: Hex): Squad[] {
  const keys = new Set(hexNeighbors(at).map(hexKey));
  return state.squads.filter(
    (s) => s.hpPool > 0 && s.side === squad.side && s.id !== squad.id && keys.has(hexKey(s.pos)),
  );
}

function activeMods(state: BattleState, squad: Squad) {
  return (squad.modifiers ?? []).filter((m) => m.untilTurn === undefined || state.turn <= m.untilTurn);
}

/** 盾牆:守方有盾牆特性,且相鄰友軍也有盾牆 */
export function shieldWallBonus(state: BattleState, defender: Squad): number {
  if (!getSquadType(defender.typeId).traits.includes("shieldWall")) return 0;
  const n = alliesAdjacent(state, defender, defender.pos).filter((a) =>
    getSquadType(a.typeId).traits.includes("shieldWall"),
  ).length;
  return n >= 2 ? SHIELDWALL_TWO : n === 1 ? SHIELDWALL_ONE : 0;
}

/** 指揮官光環:自己是指揮官隊,或與友軍指揮官隊相鄰 */
export function hasCommanderAura(state: BattleState, squad: Squad, at: Hex = squad.pos): boolean {
  if (squad.commanderId) return true;
  return alliesAdjacent(state, squad, at).some((a) => !!a.commanderId);
}

/** 攻擊情境分析(攻擊與預覽共用,和實際結算完全一致) */
export function analyzeAttack(
  state: BattleState,
  attacker: Squad,
  defender: Squad,
  /** 攻擊發起格(可能是移動後的位置) */
  fromPos = attacker.pos,
  movedHexes = attacker.movedThisActivation,
  isRetaliation = false,
): DamageContext {
  const atkType = getSquadType(attacker.typeId);
  const defType = getSquadType(defender.typeId);
  const dist = hexDistance(fromPos, defender.pos);
  const isMelee = dist <= 1;
  const usesMeleeFallback =
    isMelee && atkType.range > 1 && !atkType.traits.includes("skirmisher");
  const notes: string[] = [];

  const shieldWall = shieldWallBonus(state, defender);
  if (shieldWall > 0) notes.push(`盾牆 −${Math.round(shieldWall * 100)}%`);

  let chargeBonus = 0;
  let chargeBlockedBy: string | undefined;
  if (isMelee && !isRetaliation && atkType.traits.includes("charge") && movedHexes > 0) {
    chargeBonus = Math.min(CHARGE_CAP, movedHexes * CHARGE_PER_HEX);
    const fromTerrain = getTerrain(state.terrain[hexKey(fromPos)] ?? "plains");
    const defTerrain = getTerrain(state.terrain[hexKey(defender.pos)] ?? "plains");
    if (defType.traits.includes("antiCavalry")) chargeBlockedBy = "長槍陣";
    else if (shieldWall > 0) chargeBlockedBy = "盾牆";
    else if (fromTerrain.noCharge) chargeBlockedBy = fromTerrain.name;
    else if (defTerrain.noCharge) chargeBlockedBy = defTerrain.name;
    if (chargeBlockedBy) {
      chargeBonus = 0;
      notes.push(`衝鋒被${chargeBlockedBy}擋下`);
    } else if (defTerrain.id === "hills" && fromTerrain.id !== "hills") {
      // 仰攻:從低處衝上山坡,衝鋒減半(黑斯廷斯的諾曼騎士就吃了這個虧)
      chargeBonus /= 2;
      notes.push("仰攻,衝鋒減半");
    }
  }

  let matchupBonus = 0;
  if (atkType.traits.includes("antiCavalry") && defType.tags.includes("cavalry")) {
    matchupBonus = ANTI_CAVALRY_BONUS;
    notes.push("克制騎兵 +30%");
  }

  const berserkBonus = isMelee && !isRetaliation && atkType.traits.includes("berserk") ? BERSERK_BONUS : 0;
  if (berserkBonus) notes.push("狂暴 +25%");

  const commanderBonus = hasCommanderAura(state, attacker, fromPos) ? COMMANDER_AURA : 0;
  if (commanderBonus) notes.push("指揮官激勵 +15%");

  const pierce = !isMelee && atkType.traits.includes("pierce");
  if (pierce && defType.defense > 0) notes.push("穿甲");

  let falloff = 1;
  if (!isMelee && !atkType.traits.includes("volley")) {
    falloff = Math.max(0.5, 1 - RANGED_FALLOFF_PER_HEX * (dist - 1));
  }

  let attackerMul = 1;
  for (const m of activeMods(state, attacker)) {
    if (m.damageMul) {
      attackerMul *= m.damageMul;
      notes.push(m.label);
    }
  }
  let defenseMod = 0;
  for (const m of activeMods(state, defender)) {
    if (m.defense) {
      defenseMod += m.defense;
      notes.push(m.label);
    }
  }
  // 難度:敵方出手 × 倍率,敵方挨打 ÷ 倍率(等效於敵軍血量與傷害同時縮放,又不影響人數)
  if (attacker.side === "enemy") attackerMul *= state.enemyStatMul;
  if (defender.side === "enemy") attackerMul /= state.enemyStatMul;

  return {
    isMelee, usesMeleeFallback, chargeBonus, chargeBlockedBy, matchupBonus, berserkBonus,
    commanderBonus, shieldWall, pierce, falloff, attackerMul, defenseMod, notes,
  };
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
  const unitDef = ctx.pierce ? defType.defense / 2 : defType.defense;
  const effDef = Math.min(0.75, Math.max(-0.3, unitDef + ctx.shieldWall + ctx.defenseMod));
  return (
    (1 + ctx.chargeBonus) *
    (1 + ctx.matchupBonus) *
    (1 + ctx.berserkBonus) *
    (1 + ctx.commanderBonus) *
    ctx.falloff *
    ctx.attackerMul *
    (1 - effDef) *
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
  if (n <= 0) return 0;
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
  // 攻方移動後的樣子(盾牆、光環都要用移動後的位置判斷)
  const atkAtFrom = { ...attacker, pos: fromPos };
  const view: BattleState = fromPos === attacker.pos
    ? state
    : { ...state, squads: state.squads.map((s) => (s.id === attacker.id ? atkAtFrom : s)) };

  const ctx = analyzeAttack(view, atkAtFrom, defender, fromPos, movedHexes);
  const [dLo, dHi] = damageBounds(view, atkAtFrom, defender, ctx);

  const defType = getSquadType(defender.typeId);
  const firstStrike = ctx.isMelee && defType.traits.includes("firstStrike");
  const retaliates = willRetaliate(attacker, defender, ctx);

  // 反擊情境:防守方對攻擊方,從防守方位置打(必為近戰)
  const retCtx = analyzeAttack(view, defender, atkAtFrom, defender.pos, 0, true);

  let minKills: number;
  let maxKills: number;
  let retMinKills = 0;
  let retMaxKills = 0;

  const defHp = soldierHp(defender.typeId, defender.level);
  const atkHp = soldierHp(attacker.typeId, attacker.level);

  if (retaliates && firstStrike) {
    // 先制:防守方全額先打,攻擊方以殘餘人數出手
    const [rLo, rHi] = damageBounds(view, defender, atkAtFrom, retCtx);
    retMinKills = Math.min(aliveSoldiers(attacker), Math.floor(rLo / atkHp));
    retMaxKills = Math.min(aliveSoldiers(attacker), Math.ceil(rHi / atkHp));
    const worst = { ...atkAtFrom, hpPool: Math.max(0, attacker.hpPool - rHi) };
    const best = { ...atkAtFrom, hpPool: Math.max(0, attacker.hpPool - rLo) };
    const [wLo] = damageBounds(view, worst, defender, ctx);
    const [, bHi] = damageBounds(view, best, defender, ctx);
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
        const [rLo] = damageBounds(view, hurtLo, atkAtFrom, retCtx);
        const [, rHi] = damageBounds(view, hurtHi, atkAtFrom, retCtx);
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
    notes: ctx.notes,
  };
}
