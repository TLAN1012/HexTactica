/**
 * 戰役層:任務清單、金幣經濟、名冊管理(招募/補兵/解散)、存檔。
 */
import { levelForXp, maxSoldiers } from "./progression";
import { getSquadType, SQUAD_TYPES } from "./units";
import type { BattleState, CampaignState, MissionDef, RosterSquad } from "./types";
import { aliveSoldiers } from "./progression";

export const SAVE_KEY = "hextactica-campaign-v1";
export const MAX_ROSTER = 6;
export const REPLAY_REWARD_RATE = 0.4;

// ═══════════════════════════════════════════════════════════
// 任務表 — 10 關,強度遞增
// ═══════════════════════════════════════════════════════════

export const MISSIONS: MissionDef[] = [
  {
    id: "m01", index: 1, title: "邊境哨站",
    briefing: "碎顱氏族的獸人燒了河谷的哨站。帶上你的第一批兵,把殘餘的綠皮趕出去 — 這是你成為戰團指揮官的第一戰。",
    mapSeed: 101, mapWidth: 11, mapHeight: 8,
    enemies: [
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-warrior", level: 1 },
    ],
    reward: 180,
  },
  {
    id: "m02", index: 2, title: "磨坊之爭",
    briefing: "獸人盯上了磨坊的存糧,這次還帶了射手。記住:近戰會挨反擊,先用自己的遠程削弱他們。",
    mapSeed: 202, mapWidth: 12, mapHeight: 8,
    enemies: [
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-archer", level: 1 },
    ],
    reward: 220,
  },
  {
    id: "m03", index: 3, title: "淺灘伏擊",
    briefing: "斥候回報座狼騎兵在淺灘附近遊蕩。長槍兵能先制反擊並克制騎兵 — 讓狼撞上槍陣。",
    mapSeed: 303, mapWidth: 12, mapHeight: 9,
    enemies: [
      { typeId: "wolf-rider", level: 1 },
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-warrior", level: 2 },
    ],
    reward: 260,
  },
  {
    id: "m04", index: 4, title: "焦土村莊",
    briefing: "他們開始成建制行動了:步弓混編、有人指揮。奪回村莊,別讓弓手站著白射 — 用騎兵繞過去。",
    mapSeed: 404, mapWidth: 13, mapHeight: 9,
    enemies: [
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-impaler", level: 1 },
      { typeId: "orc-archer", level: 1 },
      { typeId: "orc-archer", level: 1 },
    ],
    reward: 320,
  },
  {
    id: "m05", index: 5, title: "林道遭遇",
    briefing: "護送商隊穿越林道時撞上氏族主力的前鋒。森林能提供 25% 減傷 — 誰先佔住樹林,誰就佔便宜。",
    mapSeed: 505, mapWidth: 13, mapHeight: 9,
    enemies: [
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-axethrower", level: 2 },
      { typeId: "wolf-rider", level: 2 },
    ],
    reward: 380,
  },
  {
    id: "m06", index: 6, title: "斷橋防線",
    briefing: "獸人要渡河突襲糧倉,渡口只有一兩處。用地形卡住渡口,讓綠皮一隊一隊排隊送死。",
    mapSeed: 616, mapWidth: 14, mapHeight: 9,
    enemies: [
      { typeId: "orc-impaler", level: 2 },
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-archer", level: 2 },
      { typeId: "orc-archer", level: 2 },
      { typeId: "orc-axethrower", level: 1 },
    ],
    reward: 450,
  },
  {
    id: "m07", index: 7, title: "鐵蹄突襲",
    briefing: "座狼群和披甲巨魔湊成一支矛頭,打算一波沖垮我們。槍陣立正面、弓手置後排,反衝鋒的時機由你決定。",
    mapSeed: 707, mapWidth: 14, mapHeight: 10,
    enemies: [
      { typeId: "troll-crusher", level: 1 },
      { typeId: "wolf-rider", level: 2 },
      { typeId: "wolf-rider", level: 2 },
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-impaler", level: 2 },
    ],
    reward: 550,
  },
  {
    id: "m08", index: 8, title: "長弓之雨",
    briefing: "碎顱氏族帶來了巨魔投石手,巨石覆蓋半個戰場。躲在丘陵後推進,騎兵必須在兩回合內摸到他們。",
    mapSeed: 808, mapWidth: 15, mapHeight: 10,
    enemies: [
      { typeId: "troll-slinger", level: 2 },
      { typeId: "troll-slinger", level: 2 },
      { typeId: "orc-impaler", level: 2 },
      { typeId: "orc-impaler", level: 2 },
      { typeId: "orc-warrior", level: 3 },
      { typeId: "orc-warrior", level: 2 },
    ],
    reward: 700,
  },
  {
    id: "m09", index: 9, title: "碎顱大營",
    briefing: "直搗碎顱氏族大營。獸人傾巢而出,步、弓、狼騎俱全 — 這是總攻前最後的硬仗,別留手。",
    mapSeed: 909, mapWidth: 15, mapHeight: 10,
    enemies: [
      { typeId: "orc-warrior", level: 3 },
      { typeId: "orc-impaler", level: 3 },
      { typeId: "orc-archer", level: 3 },
      { typeId: "troll-slinger", level: 2 },
      { typeId: "wolf-rider", level: 3 },
      { typeId: "troll-crusher", level: 2 },
    ],
    reward: 900,
  },
  {
    id: "m10", index: 10, title: "碎顱大酋長",
    briefing: "大酋長親率披甲巨魔親衛出戰。巨魔的衝撞能踏平一切 — 但你已經知道怎麼接衝鋒了,對吧?終結這場戰爭。",
    mapSeed: 1010, mapWidth: 16, mapHeight: 10,
    enemies: [
      { typeId: "troll-crusher", level: 3 },
      { typeId: "troll-crusher", level: 3 },
      { typeId: "orc-impaler", level: 3 },
      { typeId: "orc-warrior", level: 4 },
      { typeId: "orc-warrior", level: 3 },
      { typeId: "troll-slinger", level: 3 },
    ],
    reward: 1500,
  },
];

export function getMission(id: string): MissionDef {
  const m = MISSIONS.find((m) => m.id === id);
  if (!m) throw new Error(`Unknown mission: ${id}`);
  return m;
}

/** 已解鎖 = 前一關已通關 */
export function isUnlocked(campaign: CampaignState, mission: MissionDef): boolean {
  if (mission.index === 1) return true;
  const prev = MISSIONS.find((m) => m.index === mission.index - 1);
  return !!prev && campaign.completedMissions.includes(prev.id);
}

// ═══════════════════════════════════════════════════════════
// 新戰役 / 存讀檔
// ═══════════════════════════════════════════════════════════

let squadSeq = 0;
function newSquadId(): string {
  squadSeq += 1;
  return `sq-${Date.now().toString(36)}-${squadSeq}`;
}

export function newCampaign(): CampaignState {
  return {
    version: 1,
    gold: 150,
    completedMissions: [],
    roster: [
      { id: newSquadId(), typeId: "infantry", level: 1, xp: 0, soldiers: maxSoldiers("infantry", 1) },
      { id: newSquadId(), typeId: "infantry", level: 1, xp: 0, soldiers: maxSoldiers("infantry", 1) },
      { id: newSquadId(), typeId: "archer", level: 1, xp: 0, soldiers: maxSoldiers("archer", 1) },
    ],
  };
}

export function saveCampaign(c: CampaignState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(c));
  } catch {
    // 私密模式等情況存不了就算了
  }
}

export function loadCampaign(): CampaignState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CampaignState;
    if (c.version !== 1 || !Array.isArray(c.roster)) return null;
    return c;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* noop */
  }
}

// ═══════════════════════════════════════════════════════════
// 經濟:招募 / 補兵 / 解散
// ═══════════════════════════════════════════════════════════

export function recruitSquad(c: CampaignState, typeId: string): CampaignState {
  const type = getSquadType(typeId);
  if (c.gold < type.cost || c.roster.length >= MAX_ROSTER) return c;
  return {
    ...c,
    gold: c.gold - type.cost,
    roster: [
      ...c.roster,
      { id: newSquadId(), typeId, level: 1, xp: 0, soldiers: maxSoldiers(typeId, 1) },
    ],
  };
}

export function replenishCost(r: RosterSquad): number {
  const missing = maxSoldiers(r.typeId, r.level) - r.soldiers;
  return missing * getSquadType(r.typeId).soldierCost;
}

/** 補滿一隊(錢不夠就補到錢用完) */
export function replenishSquad(c: CampaignState, squadId: string): CampaignState {
  const r = c.roster.find((r) => r.id === squadId);
  if (!r) return c;
  const unitCost = getSquadType(r.typeId).soldierCost;
  const missing = maxSoldiers(r.typeId, r.level) - r.soldiers;
  const affordable = Math.min(missing, Math.floor(c.gold / unitCost));
  if (affordable <= 0) return c;
  return {
    ...c,
    gold: c.gold - affordable * unitCost,
    roster: c.roster.map((x) =>
      x.id === squadId ? { ...x, soldiers: x.soldiers + affordable } : x,
    ),
  };
}

export function dismissSquad(c: CampaignState, squadId: string): CampaignState {
  return { ...c, roster: c.roster.filter((r) => r.id !== squadId) };
}

/**
 * 防軟鎖保底:名冊全空且金幣連最便宜的兵都招不起時,
 * 一隊流亡老兵免費來投,戰役永遠打得下去。
 */
export function ensureViable(c: CampaignState): CampaignState {
  const cheapest = Math.min(...SQUAD_TYPES.map((t) => t.cost));
  if (c.roster.length > 0 || c.gold >= cheapest) return c;
  return {
    ...c,
    roster: [
      { id: newSquadId(), typeId: "infantry", level: 1, xp: 0, soldiers: maxSoldiers("infantry", 1) },
    ],
  };
}

// ═══════════════════════════════════════════════════════════
// 戰後結算
// ═══════════════════════════════════════════════════════════

export interface BattleResult {
  victory: boolean;
  goldEarned: number;
  xpGains: { squadId: string; xp: number; leveledUp: boolean }[];
  casualties: { squadId: string; lost: number }[];
}

/** 把戰場結果寫回戰役(戰損保留、經驗結算、發獎金) */
export function applyBattleResult(
  c: CampaignState,
  battle: BattleState,
  mission: MissionDef,
): { campaign: CampaignState; result: BattleResult } {
  const victory = battle.outcome === "victory";
  const firstClear = victory && !c.completedMissions.includes(mission.id);
  const goldEarned = victory
    ? firstClear
      ? mission.reward
      : Math.round(mission.reward * REPLAY_REWARD_RATE)
    : 0;

  const xpGains: BattleResult["xpGains"] = [];
  const casualties: BattleResult["casualties"] = [];

  const roster = c.roster.map((r) => {
    const fielded = battle.squads.find((s) => s.id === r.id);
    if (!fielded) return r;
    const survivors = aliveSoldiers(fielded);
    const lost = r.soldiers - survivors;
    if (lost > 0) casualties.push({ squadId: r.id, lost });
    if (survivors <= 0) return null; // 全滅的小隊從名冊移除

    const gained = battle.kills[r.id] ?? 0;
    const newXp = r.xp + gained;
    const newLevel = levelForXp(newXp);
    if (gained > 0) {
      xpGains.push({ squadId: r.id, xp: gained, leveledUp: newLevel > r.level });
    }
    return { ...r, soldiers: survivors, xp: newXp, level: newLevel };
  });

  const campaign: CampaignState = {
    ...c,
    gold: c.gold + goldEarned,
    completedMissions: firstClear
      ? [...c.completedMissions, mission.id]
      : c.completedMissions,
    roster: roster.filter((r): r is RosterSquad => r !== null),
  };

  return { campaign, result: { victory, goldEarned, xpGains, casualties } };
}
