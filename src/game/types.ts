/**
 * HexTactica 核心型別
 *
 * 玩法骨架(小隊制六角戰棋):
 *  - 一支小隊 = N 名士兵;傷害 = 存活人數 × 單兵傷害
 *  - 受傷扣血池 → 減員 → 輸出下降
 *  - 每小隊每回合一次啟動:移動 + 攻擊(或只做其一)
 *  - 近戰攻擊會觸發防守方反擊(每回合一次);遠程不吃反擊
 *  - IGOUGO:玩家全部動完 → AI 回合
 *
 * 兩種模式共用同一套引擎:
 *  - 歷史戰爭:手繪真實戰場、勝利條件、指揮官、援軍,多場戰役串成一場戰爭
 *  - 奇幻外傳:原本 10 關獸人戰役(種子隨機地圖、全滅勝)
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
  | "skirmisher" //   散兵:貼臉仍可用投射武器(不改用近戰備用值)
  | "shieldWall" //   盾牆:與相鄰友軍盾牆互相掩護,承傷減免、衝鋒失效
  | "berserk" //      狂暴:近戰主動攻擊傷害 +25%
  | "pierce" //       穿甲:無視目標一半的兵種減傷(弩)
  | "levy"; //        民兵:便宜量多,但滿編後升級成長較慢(僅說明用)

export type UnitTag = "cavalry" | "infantry" | "ranged";

export interface SquadType {
  id: string;
  name: string;
  namePlural?: string;
  /** 陣營(決定軍營能招哪些兵、棋子美術) */
  faction: FactionId;
  /** public/art/units/<art>.png(或 .webp) */
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
  tags: UnitTag[];
  /** 招募價格(金) */
  cost: number;
  /** 補一名士兵的價格(金) */
  soldierCost: number;
  desc: string;
  /** false = 不可招募(敵方專屬、劇情專屬) */
  recruitable?: boolean;
  /** 戰場上只畫一個(火砲、投石車等器械) */
  single?: boolean;
}

// ═══════════════════════════════════════════════════════════
// 陣營與指揮官
// ═══════════════════════════════════════════════════════════

export type FactionId =
  | "fantasy-human"
  | "fantasy-orc"
  | "saxon" //    盎格魯-撒克遜英格蘭
  | "norse" //    挪威維京
  | "norman"; //  諾曼第

export interface FactionDef {
  id: FactionId;
  name: string;
  /** 棋子外框與旗幟顏色 */
  color: string;
  /** 淡色(地圖陣營 tint) */
  tint: string;
  era: string;
}

export interface CommanderDef {
  id: string;
  name: string;
  /** 稱號,如「英格蘭國王」 */
  title: string;
  faction: FactionId;
  /** public/art/portraits/<portrait> */
  portrait: string;
  /** 立繪中人物臉朝的方向;劇情畫面:朝右擺左邊、朝左擺右邊 */
  facing?: "left" | "right";
  bio: string;
}

// ═══════════════════════════════════════════════════════════
// 戰場上的小隊
// ═══════════════════════════════════════════════════════════

export type SideId = "player" | "enemy";

/** AI 姿態:進攻、固守陣地、預備隊(指定回合後才出動) */
export type Stance = "attack" | "hold" | "reserve";

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
  /** 由指揮官親率(光環、陣亡條件) */
  commanderId?: string;
  /** AI 用 */
  stance?: Stance;
  /** hold:固守的中心格;reserve:出動前待命 */
  anchor?: Hex;
  /** reserve:第幾回合起出動 */
  activateTurn?: number;
  /** 劇本臨時修正(如「盔甲留在船上」的減傷懲罰),到期回合後失效 */
  modifiers?: SquadModifier[];
}

export interface SquadModifier {
  label: string;
  /** 加到兵種減傷上(負值 = 更容易挨打) */
  defense?: number;
  /** 乘到傷害上 */
  damageMul?: number;
  /** 最後生效回合(含) */
  untilTurn?: number;
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
  /** 在此格發動的攻擊不能衝鋒(渡口、橋、村莊巷戰) */
  noCharge?: boolean;
  color: string;
  hasArt: boolean;
  desc?: string;
}

// ═══════════════════════════════════════════════════════════
// 劇本(一場戰鬥的完整定義)
// ═══════════════════════════════════════════════════════════

/** 地圖座標用「欄, 列」(offset,和手繪地圖字元位置一致),載入時轉 axial */
export type Cell = [col: number, row: number];

export interface ScenarioSquad {
  typeId: string;
  level: number;
  at?: Cell;
  commanderId?: string;
  stance?: Stance;
  /** hold 的中心(預設 = 自己的出生點) */
  anchor?: Cell;
  activateTurn?: number;
  /** 開場減員比例 0~1(承接上一戰的戰損) */
  casualties?: number;
  modifiers?: SquadModifier[];
}

export type VictoryCondition =
  | { kind: "annihilate" }
  | { kind: "killCommander"; commanderId: string }
  /** 撐到第 N 回合結束時,我方仍占有任一目標格(或目標格沒有被敵方占領) */
  | { kind: "holdUntil"; turn: number; hexes: Cell[]; requireOccupied?: boolean }
  /** 撐過第 N 回合即勝 */
  | { kind: "survive"; turn: number };

export type DefeatCondition =
  | { kind: "annihilated" }
  | { kind: "commanderLost"; commanderId: string }
  /** 回合結束時敵方占有全部目標格 */
  | { kind: "hexesLost"; hexes: Cell[] }
  /** 超過第 N 回合仍未達成勝利 */
  | { kind: "timeout"; turn: number };

export interface Reinforcement {
  turn: number;
  side: SideId;
  squads: ScenarioSquad[];
  message: string;
}

export interface StoryPage {
  /** 說話者指揮官 id(顯示立繪),省略 = 旁白 */
  speaker?: string;
  text: string;
  /** 插畫(public/art/story/<image>) */
  image?: string;
}

export interface ScenarioDef {
  id: string;
  title: string;
  /** 日期與地點,如「1066 年 9 月 25 日・約克郡」 */
  date?: string;
  briefing: string;
  /** 目標說明(顯示在戰鬥畫面) */
  objectiveText: string;
  playerFaction: FactionId;
  enemyFaction: FactionId;
  /** 手繪地圖:每列一個字串,字元對應地形(見 maps.ts 的 TERRAIN_CHARS) */
  mapRows?: string[];
  /** 或種子隨機地圖(奇幻外傳沿用) */
  mapSeed?: number;
  mapWidth?: number;
  mapHeight?: number;
  /** false = 不帶名冊上場,只用 playerFixed(例如富爾福德是北方伯爵的軍隊) */
  useRoster?: boolean;
  /** 我方可佈署的格;省略則用左側兩欄 */
  playerDeploy?: Cell[];
  /** 劇情固定上場的我方部隊(不佔名冊) */
  playerFixed?: ScenarioSquad[];
  enemies: ScenarioSquad[];
  reinforcements?: Reinforcement[];
  victory: VictoryCondition[];
  defeat: DefeatCondition[];
  /** 首次勝利獎金;重打 40% */
  reward: number;
  intro?: StoryPage[];
  outroVictory?: StoryPage[];
  outroDefeat?: StoryPage[];
  /** 背景插畫 */
  art?: string;
  /**
   * 只給自動模擬 / AI 代打用的提示:玩家方部隊的姿態(守勢戰役填 hold,錨點 = 佈署位置)。
   * 真人玩家操作不受影響。
   */
  playerAiStance?: Stance;
}

// ═══════════════════════════════════════════════════════════
// 難度
// ═══════════════════════════════════════════════════════════

export type DifficultyId = "squire" | "knight" | "lord" | "legend";

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  desc: string;
  /** 敵軍單兵血/傷倍率 */
  enemyStatMul: number;
  /** 敵軍等級加值 */
  enemyLevelBonus: number;
  /** AI 技巧 0~1:越低越常選次佳、越不看威脅 */
  aiSkill: number;
  /** 獎金倍率 */
  goldMul: number;
  /** 允許悔棋(我方回合內) */
  allowUndo: boolean;
}

// ═══════════════════════════════════════════════════════════
// 戰鬥狀態
// ═══════════════════════════════════════════════════════════

export interface BattleState {
  scenarioId: string;
  /** 舊欄位名稱(奇幻外傳相容) */
  missionId: string;
  turn: number;
  activeSide: SideId;
  terrain: Record<string, string>; // hexKey -> terrainId
  width: number;
  height: number;
  squads: Squad[];
  log: BattleLogEntry[];
  outcome: "ongoing" | "victory" | "defeat";
  /** 勝負原因(結算畫面顯示) */
  outcomeReason?: string;
  /** 玩家本場擊殺的士兵數(結算獎勵用) */
  kills: Record<string, number>; // squadId -> 擊殺數
  difficulty: DifficultyId;
  /** 敵方統計倍率(由難度帶入,避免每次查表) */
  enemyStatMul: number;
  victory: VictoryCondition[];
  defeat: DefeatCondition[];
  /** 尚未抵達的援軍 */
  pendingReinforcements: Reinforcement[];
  /** 目標格(axial key),戰場上畫旗 */
  objectiveHexes: string[];
  /** 戰場上可用的金幣(緊急整補用) */
  gold: number;
  /** 本場已花掉的金幣(結算時從戰役線扣) */
  goldSpent: number;
  /** 本場已整補過的小隊 */
  reinforced: string[];
}

export interface BattleLogEntry {
  turn: number;
  text: string;
  kind: "move" | "attack" | "retaliate" | "info" | "death" | "event";
}

export interface AttackReport {
  damage: number;
  soldiersKilled: number;
  targetDestroyed: boolean;
  chargeBonus: number;
}

/** 攻擊預覽(點人前先看預計殺傷) */
export interface AttackPreview {
  minKills: number;
  maxKills: number;
  willRetaliate: boolean;
  retaliationMinKills: number;
  retaliationMaxKills: number;
  usesMeleeFallback: boolean;
  chargeBonus: number;
  /** 其他加成說明(盾牆、指揮官、穿甲…) */
  notes: string[];
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
  /** 指揮官隊(陣亡 = 劇情失敗條件) */
  commanderId?: string;
}

/** 奇幻外傳的關卡定義(舊格式,載入時轉成 ScenarioDef) */
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

/** 一條戰役線(奇幻外傳或某場戰爭)的存檔 */
export interface CampaignTrack {
  gold: number;
  completedMissions: string[];
  roster: RosterSquad[];
  /** 戰爭進行到第幾場(0 起算);奇幻外傳不用 */
  stage?: number;
  /** 戰爭中前一戰留下的影響(例如敵軍戰損比例) */
  flags?: Record<string, number>;
}

export interface CampaignState {
  version: number;
  difficulty: DifficultyId;
  /** 目前在哪條線:'fantasy' 或戰爭 id */
  active: string;
  tracks: Record<string, CampaignTrack>;
}

// ═══════════════════════════════════════════════════════════
// 戰爭(多場戰役串起來)
// ═══════════════════════════════════════════════════════════

export interface WarBattle {
  scenarioId: string;
  /** 打輸也能繼續下一場(史實上輸掉、但劇情照走的戰役,例如富爾福德) */
  advanceOnDefeat?: boolean;
  /** 戰爭地圖上的位置(0~100 百分比) */
  mapPos: { x: number; y: number };
}

export interface WarDef {
  id: string;
  title: string;
  subtitle: string;
  years: string;
  playerFaction: FactionId;
  startGold: number;
  startRoster: Omit<RosterSquad, "id">[];
  battles: WarBattle[];
  /** 戰爭地圖插畫 */
  mapArt: string;
  intro: StoryPage[];
  epilogue: StoryPage[];
}
