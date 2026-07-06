/**
 * HexTactica「戰團戰役」核心型別
 *
 * 玩法骨架(致敬經典手機六角戰棋的小隊制):
 *  - 一支小隊 = N 名士兵;傷害 = 存活人數 × 單兵傷害
 *  - 受傷扣血池 → 減員 → 輸出下降
 *  - 每小隊每回合一次啟動:移動 + 攻擊(或只做其一)
 *  - 近戰攻擊會觸發防守方反擊(每回合一次);遠程不吃反擊
 *  - IGOUGO:玩家全部動完 → AI 回合
 */
import type { Hex } from "../engine/hex";

// ═══════════════════════════════════════════════════════════
// 兵種(小隊種類)
// ═══════════════════════════════════════════════════════════

export type TraitId =
  | "charge" //       衝鋒:本次啟動每移動 1 格 +15% 傷害(上限 +60%)
  | "firstStrike" //  先制:防守近戰時先反擊,再結算對方攻擊
  | "antiCavalry" //  克騎:對騎兵傷害 +30%,並使對方衝鋒加成失效
  | "volley" //       拋射:遠程傷害無距離衰減
  | "skirmisher"; //  散兵:貼臉仍可用投射武器(不改用近戰備用值)

export interface SquadType {
  id: string;
  name: string;
  namePlural?: string;
  /** public/art/units/<art>.png */
  art: string;
  move: number;
  /** 1 = 純近戰 */
  range: number;
  /** 1 級時的滿編人數 */
  soldiers: number;
  /** 單兵血量 */
  hp: number;
  /** 單兵傷害 [min, max](主武器;遠程兵種即弓箭) */
  dmg: [number, number];
  /** 遠程兵種被迫近戰時的單兵傷害;近戰兵種免填 */
  meleeDmg?: [number, number];
  /** 承傷減免 0~0.6 */
  defense: number;
  traits: TraitId[];
  tags: ("cavalry" | "infantry" | "ranged")[];
  /** 招募價格(金) */
  cost: number;
  /** 補一名士兵的價格(金) */
  soldierCost: number;
  desc: string;
}

// ═══════════════════════════════════════════════════════════
// 戰場上的小隊
// ═══════════════════════════════════════════════════════════

export type SideId = "player" | "enemy";

export interface Squad {
  id: string;
  typeId: string;
  side: SideId;
  pos: Hex;
  level: number; // 1~5
  xp: number;
  /** 目前總血池;存活人數 = ceil(hpPool / 單兵血量) */
  hpPool: number;
  /** 本次啟動已移動格數(衝鋒加成用) */
  movedThisActivation: number;
  /** 是否已完成本回合啟動(攻擊後即結束) */
  acted: boolean;
  /** 是否已移動(移動後仍可攻擊,但不能再移動) */
  moved: boolean;
  /** 本回合剩餘反擊次數 */
  retaliations: number;
}

// ═══════════════════════════════════════════════════════════
// 地形
// ═══════════════════════════════════════════════════════════

export interface TerrainDef {
  id: string;
  name: string;
  moveCost: number;
  /** 站在此格的承傷再減免(可為負) */
  defense: number;
  /** 完全不可進入 */
  impassable?: boolean;
  color: string;
  hasArt: boolean;
}

// ═══════════════════════════════════════════════════════════
// 戰鬥狀態
// ═══════════════════════════════════════════════════════════

export interface BattleState {
  missionId: string;
  turn: number;
  activeSide: SideId;
  terrain: Record<string, string>; // hexKey -> terrainId
  squads: Squad[];
  log: BattleLogEntry[];
  outcome: "ongoing" | "victory" | "defeat";
  /** 玩家本場擊殺的士兵數(結算獎勵用) */
  kills: Record<string, number>; // squadId -> 擊殺數
}

export interface BattleLogEntry {
  turn: number;
  text: string;
  kind: "move" | "attack" | "retaliate" | "info" | "death";
}

export interface AttackReport {
  damage: number;
  soldiersKilled: number;
  targetDestroyed: boolean;
  chargeBonus: number;
}

/** 攻擊預覽(WoA 的招牌:點人前先看預計殺傷) */
export interface AttackPreview {
  minKills: number;
  maxKills: number;
  willRetaliate: boolean;
  retaliationMinKills: number;
  retaliationMaxKills: number;
  usesMeleeFallback: boolean;
  chargeBonus: number;
}

// ═══════════════════════════════════════════════════════════
// 戰役(單機推關 + 軍隊經營)
// ═══════════════════════════════════════════════════════════

export interface RosterSquad {
  id: string;
  typeId: string;
  level: number;
  xp: number;
  /** 目前人數(戰損會留到下一關,要花錢補) */
  soldiers: number;
}

export interface MissionDef {
  id: string;
  index: number;
  title: string;
  briefing: string;
  mapSeed: number;
  mapWidth: number;
  mapHeight: number;
  /** 敵軍編成 */
  enemies: { typeId: string; level: number }[];
  /** 首次通關獎勵(金);重打 = 40% */
  reward: number;
}

export interface CampaignState {
  version: number;
  gold: number;
  completedMissions: string[];
  roster: RosterSquad[];
}
