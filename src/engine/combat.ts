/**
 * 戰鬥核心解算器
 *
 * 公式：
 *   攻擊值 = 2D6 + 攻擊屬性 + trait 修正總和
 *   防禦值 = 裝甲 + 地形防禦修正
 *   差值   = 攻擊值 − 防禦值
 *   差值 → CRT → 傷害（扣 strength）+ 是否觸發士氣檢定
 *
 * M2 範圍：
 *   ✓ 近戰 / 射擊 / 衝擊 三類攻擊
 *   ✓ Trait 條件匹配與 add 運算
 *   ✓ 地形防禦修正
 *   ✓ 目標死亡（strength <= 0 → destroyed）
 *   ✗ 士氣檢定（M3）
 *   ✗ 側翼/背後（M3，面向系統上線後）
 *   ✗ Effect 的 mul/set/cap/floor（目前只用 add）
 *   ✗ parthian-shot / deploy-required 等非數值 trait（需 schema 擴充）
 */
import { hexDistance, hexKey, type Hex } from "./hex";
import { getTerrain, getUnitType } from "./loadRules";
import type {
  GameState,
  Trait,
  Unit,
  UnitType,
} from "./types";

export type AttackType = "melee" | "ranged" | "shock";

export interface Modifier {
  source: string;
  value: number;
}

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  type: AttackType;
  diceRoll: [number, number];
  diceTotal: number;
  baseAttackStat: number;
  modifiers: Modifier[];
  attackValue: number;
  defenseValue: number;
  diff: number;
  damage: number;
  defenderDestroyed: boolean;
  moraleTriggered: boolean;
  log: string;
}

/** 擲一次 2D6，回傳兩顆骰子與總和 */
export function roll2d6(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

// ═══════════════════════════════════════════════════════════
// Trait 修正計算
// ═══════════════════════════════════════════════════════════

function traitAppliesTo(
  trait: Trait,
  type: AttackType,
  attacker: Unit,
  defenderType: UnitType,
  state: GameState,
): boolean {
  // trigger 配對
  const triggerMap: Record<AttackType, string> = {
    melee: "onMelee",
    ranged: "onRanged",
    shock: "onShock",
  };
  if (trait.trigger !== triggerMap[type]) return false;

  const cond = trait.condition;
  if (!cond) return true;

  // targetTag：被攻擊方的 tags 包含
  if (cond.targetTag && !defenderType.tags.includes(cond.targetTag)) {
    return false;
  }

  // terrain：攻擊方所在地形
  if (cond.terrain) {
    const attackerTerrainId = state.scenario.terrain[hexKey(attacker.pos)];
    if (attackerTerrainId !== cond.terrain) return false;
  }

  // weather：當前天氣
  if (cond.weather && state.weather !== cond.weather) return false;

  // state：攻擊方自身狀態
  if (cond.state && attacker.state !== cond.state) return false;

  // facing：M3 再實作，暫時略過
  // if (cond.facing) { ... }

  return true;
}

function computeAttackerModifiers(
  type: AttackType,
  attacker: Unit,
  defender: Unit,
  state: GameState,
): Modifier[] {
  const attackerType = getUnitType(attacker.typeId);
  const defenderType = getUnitType(defender.typeId);
  const mods: Modifier[] = [];

  for (const trait of attackerType.traits) {
    if (!traitAppliesTo(trait, type, attacker, defenderType, state)) {
      continue;
    }

    // 只處理影響當前攻擊類型對應屬性的 effect
    const relevantStat =
      type === "melee"
        ? "meleeAttack"
        : type === "ranged"
          ? "rangedAttack"
          : "shockAttack";
    if (trait.effect.stat !== relevantStat) continue;

    if (trait.effect.op === "add") {
      mods.push({
        source: trait.description,
        value: trait.effect.value,
      });
    }
    // mul/set/cap/floor 暫不處理
  }

  return mods;
}

function computeDefenderTerrainBonus(defender: Unit, state: GameState): Modifier | null {
  const terrainId = state.scenario.terrain[hexKey(defender.pos)];
  if (!terrainId) return null;
  const terrain = getTerrain(terrainId);
  if (terrain.defenseModifier === 0) return null;
  return {
    source: `${terrain.nameI18n.zh}地形`,
    value: terrain.defenseModifier,
  };
}

// ═══════════════════════════════════════════════════════════
// CRT：差值 → 傷害
// ═══════════════════════════════════════════════════════════

function diffToDamage(diff: number): { damage: number; moraleTriggered: boolean } {
  if (diff < 0) return { damage: 0, moraleTriggered: false };
  if (diff <= 2) return { damage: 1, moraleTriggered: false };
  if (diff <= 5) return { damage: 2, moraleTriggered: false };
  if (diff <= 8) return { damage: 3, moraleTriggered: true };
  if (diff <= 11) return { damage: 4, moraleTriggered: true };
  return { damage: 5, moraleTriggered: true };
}

// ═══════════════════════════════════════════════════════════
// 合法性檢查
// ═══════════════════════════════════════════════════════════

export function canAttack(
  attacker: Unit,
  defender: Unit,
  type: AttackType,
): boolean {
  if (attacker.hasActedThisTurn) return false;
  if (attacker.state === "destroyed" || defender.state === "destroyed") return false;
  if (attacker.sideId === defender.sideId) return false;

  const attackerType = getUnitType(attacker.typeId);
  const distance = hexDistance(attacker.pos, defender.pos);

  if (type === "ranged") {
    if (attackerType.baseStats.rangedAttack <= 0) return false;
    if (distance < 1 || distance > attackerType.baseStats.range) return false;
  } else {
    // melee / shock 都需要相鄰
    if (distance !== 1) return false;
    if (type === "melee" && attackerType.baseStats.meleeAttack <= 0) return false;
    if (type === "shock" && attackerType.baseStats.shockAttack <= 0) return false;
  }
  return true;
}

/** 列舉某單位當前能攻擊的所有敵軍與可用的攻擊類型 */
export interface AttackOption {
  targetId: string;
  targetPos: Hex;
  type: AttackType;
}

export function listAttackOptions(
  state: GameState,
  attacker: Unit,
): AttackOption[] {
  if (attacker.hasActedThisTurn) return [];
  const attackerType = getUnitType(attacker.typeId);
  const options: AttackOption[] = [];

  for (const target of state.units) {
    if (target.sideId === attacker.sideId) continue;
    if (target.state === "destroyed") continue;

    const distance = hexDistance(attacker.pos, target.pos);

    // 近戰（相鄰）
    if (distance === 1 && attackerType.baseStats.meleeAttack > 0) {
      options.push({
        targetId: target.id,
        targetPos: target.pos,
        type: "melee",
      });
    }

    // 射擊（在射程內且 > 0 攻擊）
    if (
      distance >= 1 &&
      distance <= attackerType.baseStats.range &&
      attackerType.baseStats.rangedAttack > 0
    ) {
      options.push({
        targetId: target.id,
        targetPos: target.pos,
        type: "ranged",
      });
    }
  }
  return options;
}

// ═══════════════════════════════════════════════════════════
// 主解算：執行一次攻擊
// ═══════════════════════════════════════════════════════════

export function resolveAttack(
  state: GameState,
  attackerId: string,
  defenderId: string,
  type: AttackType,
): CombatResult {
  const attacker = state.units.find((u) => u.id === attackerId)!;
  const defender = state.units.find((u) => u.id === defenderId)!;
  const attackerType = getUnitType(attacker.typeId);
  const defenderType = getUnitType(defender.typeId);

  const dice = roll2d6();
  const diceTotal = dice[0] + dice[1];

  const baseAttackStat =
    type === "melee"
      ? attackerType.baseStats.meleeAttack
      : type === "ranged"
        ? attackerType.baseStats.rangedAttack
        : attackerType.baseStats.shockAttack;

  const modifiers = computeAttackerModifiers(type, attacker, defender, state);
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
  const attackValue = diceTotal + baseAttackStat + modifierTotal;

  // 防禦方：裝甲 + 地形
  const defenseMods: Modifier[] = [];
  const terrainBonus = computeDefenderTerrainBonus(defender, state);
  if (terrainBonus) defenseMods.push(terrainBonus);
  const defenseValue =
    defenderType.baseStats.armor +
    defenseMods.reduce((s, m) => s + m.value, 0);

  const diff = attackValue - defenseValue;
  const { damage, moraleTriggered } = diffToDamage(diff);

  const newStrength = Math.max(0, defender.currentStrength - damage);
  const defenderDestroyed = newStrength <= 0;

  const typeLabel = type === "melee" ? "近戰" : type === "ranged" ? "射擊" : "衝擊";
  const modSummary =
    modifiers.length > 0
      ? " (" +
        modifiers
          .map((m) => `${m.value >= 0 ? "+" : ""}${m.value} ${m.source}`)
          .join(", ") +
        ")"
      : "";
  const terrainLabel = terrainBonus
    ? `，${terrainBonus.source} +${terrainBonus.value}`
    : "";

  const log =
    `${attackerType.nameI18n.zh}對${defenderType.nameI18n.zh}發動${typeLabel}：` +
    `${dice[0]}+${dice[1]}=${diceTotal} +${baseAttackStat}${modSummary} vs 甲 ${defenderType.baseStats.armor}${terrainLabel} → ` +
    `傷害 ${damage}` +
    (defenderDestroyed ? "，目標被殲滅！" : `（剩 ${newStrength} 兵力）`);

  return {
    attackerId,
    defenderId,
    type,
    diceRoll: dice,
    diceTotal,
    baseAttackStat,
    modifiers,
    attackValue,
    defenseValue,
    diff,
    damage,
    defenderDestroyed,
    moraleTriggered,
    log,
  };
}
