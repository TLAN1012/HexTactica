/**
 * HexTactica 核心型別定義
 * 擴充原則：新兵種/地形/天氣只改 JSON + 加 trait，不改引擎
 */
import type { Hex } from "./hex";

// ═══════════════════════════════════════════════════════════════
// 兵種定義（擴充入口）
// ═══════════════════════════════════════════════════════════════

export interface UnitType {
  id: string;
  nameI18n: { zh: string; en: string };
  baseStats: BaseStats;
  traits: Trait[];
  stateMachine?: UnitStateMachineId;
  heroSlot?: boolean; // 預留：此兵種可否配 Hero
  tags: string[];
  emblem: EmblemSpec;
}

export interface BaseStats {
  move: number;
  shockAttack: number;
  meleeAttack: number;
  rangedAttack: number;
  range: number;
  armor: number;
  morale: number; // 1-10
  strength: number; // 1-10
}

// ═══════════════════════════════════════════════════════════════
// Trait 系統（資料驅動的規則擴充）
// ═══════════════════════════════════════════════════════════════

export type TriggerEvent =
  | "onShock"
  | "onMelee"
  | "onRanged"
  | "onTerrain"
  | "onWeather"
  | "onFlank"
  | "onRear"
  | "onTurnStart"
  | "onTurnEnd"
  | "onAdjacentRout"
  | "onDeploy"
  | "onCommitted"; // 標槍兵投擲後

export interface Trait {
  id: string;
  trigger: TriggerEvent;
  condition?: ConditionExpr;
  effect: Effect;
  description: string;
}

/**
 * 條件 DSL — 極簡版，未來可擴充
 * 例：{ targetTag: "cavalry" }、{ terrain: "plains" }、{ weather: "rain" }
 */
export interface ConditionExpr {
  targetTag?: string;
  terrain?: string;
  weather?: string;
  facing?: "front" | "flank" | "rear";
  state?: UnitState;
}

export interface Effect {
  stat: StatKey;
  op: "add" | "mul" | "set" | "cap" | "floor";
  value: number;
}

export type StatKey =
  | "move"
  | "shockAttack"
  | "meleeAttack"
  | "rangedAttack"
  | "range"
  | "armor"
  | "morale"
  | "strength";

// ═══════════════════════════════════════════════════════════════
// 狀態機（標槍兵的一次性衝鋒機制在此定義）
// ═══════════════════════════════════════════════════════════════

export type UnitStateMachineId = "velite" | "default";

export type UnitState =
  | "idle"
  | "moving"
  | "fighting"
  | "shaken"
  | "routing"
  | "rallying" // 預留：指揮官重組中
  | "destroyed"
  // Velite 專屬：
  | "ready"
  | "committed"
  | "spent";

// ═══════════════════════════════════════════════════════════════
// 戰場實體 — 某格上的某支部隊
// ═══════════════════════════════════════════════════════════════

export interface Unit {
  id: string; // 場上唯一 ID
  typeId: string; // 對應 UnitType.id
  sideId: string;
  pos: Hex;
  facing: Hex; // 面向方向（用 direction vector）
  state: UnitState;
  currentStrength: number; // 當前兵力（≤ baseStats.strength）
  currentMorale: number; // 當前士氣
  hasActedThisTurn: boolean;
  heroId?: string; // 預留

  // Velite 專屬
  committedTargetId?: string; // committed 狀態下的衝鋒目標
}

// ═══════════════════════════════════════════════════════════════
// 地形與天氣
// ═══════════════════════════════════════════════════════════════

export interface TerrainType {
  id: string;
  nameI18n: { zh: string; en: string };
  moveCost: number;
  defenseModifier: number;
  blocksCavalry?: boolean;
  visionModifier?: number;
  color: string; // SVG 填色
  traits?: Trait[]; // 地形賦予的效果
}

export interface WeatherType {
  id: string;
  nameI18n: { zh: string; en: string };
  traits: Trait[];
  icon?: string;
}

// ═══════════════════════════════════════════════════════════════
// 陣營
// ═══════════════════════════════════════════════════════════════

export interface Side {
  id: string;
  name: string;
  color: string; // 向量徽章底色
  controller: "human" | "ai";
  aiDifficulty?: "easy" | "normal" | "hard";
}

// ═══════════════════════════════════════════════════════════════
// 場景與遊戲狀態
// ═══════════════════════════════════════════════════════════════

export interface Scenario {
  id: string;
  name: string;
  date: string;
  mapWidth: number;
  mapHeight: number;
  terrain: { [hexKey: string]: string }; // hexKey -> terrainId
  weather: string; // weatherId
  sides: Side[];
  initialUnits: Omit<Unit, "hasActedThisTurn" | "state" | "currentStrength" | "currentMorale">[];
  victoryConditions: VictoryConditions;
  historicalNotes?: string;
}

export interface VictoryConditions {
  type: "rout" | "annihilation" | "hold" | "custom";
  routThreshold?: number; // 0-1，例如 0.6
  holdHex?: Hex;
  holdTurns?: number;
}

export interface GameState {
  scenario: Scenario;
  turn: number;
  activeSideId: string;
  phase: GamePhase;
  units: Unit[];
  combatLog: CombatLogEntry[];
  weather: string; // 當前天氣（可隨回合變）
}

export type GamePhase =
  | "command"
  | "movement"
  | "ranged"
  | "melee"
  | "morale"
  | "end";

export interface CombatLogEntry {
  turn: number;
  phase: GamePhase;
  attackerId?: string;
  defenderId?: string;
  diceRoll?: number[];
  modifiers?: Array<{ source: string; value: number }>;
  damage?: number;
  moraleTriggered?: boolean;
  moraleResult?: "held" | "shaken" | "routed";
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// 向量徽章
// ═══════════════════════════════════════════════════════════════

export interface EmblemSpec {
  shape: "shield" | "round" | "banner";
  /** 兵種符號，如 "horse-heavy" "arrow" "spear" "javelin" */
  symbol: string;
  strokeColor?: string;
}
