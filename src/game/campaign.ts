/**
 * 戰役層:存檔(多條戰役線)、金幣經濟、名冊管理(招募/補兵/解散)、戰後結算、戰爭推進。
 *
 * 存檔 v2:一個存檔裡有多條線(tracks)——'fantasy' 奇幻外傳,以及每場戰爭各一條。
 * 每條線有自己的金幣、名冊、進度;難度是整個存檔共用的。
 * 舊版 v1 存檔(只有奇幻戰役)載入時自動搬進 'fantasy' 線。
 */
import { getDifficulty } from "./difficulty";
import { levelForXp, maxHpPool, maxSoldiers, aliveSoldiers } from "./progression";
import { MISSIONS } from "./missions";
import { FANTASY_TRACK, getWar, WARS } from "./scenarios";
import { getSquadType, recruitableTypes } from "./units";
import type {
  BattleState,
  CampaignState,
  CampaignTrack,
  DifficultyId,
  MissionDef,
  RosterSquad,
  ScenarioDef,
  WarDef,
} from "./types";

export const SAVE_KEY = "hextactica-save-v2";
export const LEGACY_SAVE_KEY = "hextactica-campaign-v1";
export const MAX_ROSTER = 6;
export const REPLAY_REWARD_RATE = 0.4;

export { MISSIONS };

export function getMission(id: string): MissionDef {
  const m = MISSIONS.find((m) => m.id === id);
  if (!m) throw new Error(`Unknown mission: ${id}`);
  return m;
}

// ═══════════════════════════════════════════════════════════
// 建立 / 存讀檔
// ═══════════════════════════════════════════════════════════

let squadSeq = 0;
function newSquadId(): string {
  squadSeq += 1;
  return `sq-${Date.now().toString(36)}-${squadSeq}`;
}

function fantasyTrack(): CampaignTrack {
  return {
    gold: 150,
    completedMissions: [],
    roster: [
      { id: newSquadId(), typeId: "infantry", level: 1, xp: 0, soldiers: maxSoldiers("infantry", 1) },
      { id: newSquadId(), typeId: "infantry", level: 1, xp: 0, soldiers: maxSoldiers("infantry", 1) },
      { id: newSquadId(), typeId: "archer", level: 1, xp: 0, soldiers: maxSoldiers("archer", 1) },
    ],
  };
}

export function warTrack(war: WarDef): CampaignTrack {
  return {
    gold: war.startGold,
    completedMissions: [],
    stage: 0,
    flags: {},
    roster: war.startRoster.map((r) => ({ ...r, id: newSquadId() })),
  };
}

export function newCampaign(difficulty: DifficultyId = "knight"): CampaignState {
  const tracks: Record<string, CampaignTrack> = { [FANTASY_TRACK]: fantasyTrack() };
  for (const w of WARS) tracks[w.id] = warTrack(w);
  return { version: 2, difficulty, active: WARS[0].id, tracks };
}

export function saveCampaign(c: CampaignState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(c));
  } catch {
    // 私密模式等情況存不了就算了
  }
}

interface LegacyV1 {
  version: 1;
  gold: number;
  completedMissions: string[];
  roster: RosterSquad[];
}

/** 舊存檔(v1,只有奇幻戰役)→ v2 */
export function migrateV1(old: LegacyV1): CampaignState {
  const c = newCampaign("knight");
  c.tracks[FANTASY_TRACK] = { gold: old.gold, completedMissions: old.completedMissions, roster: old.roster };
  c.active = FANTASY_TRACK;
  return c;
}

export function loadCampaign(): CampaignState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const c = JSON.parse(raw) as CampaignState;
      if (c.version !== 2 || !c.tracks) return null;
      // 之後新增的戰爭補上空白進度
      for (const w of WARS) if (!c.tracks[w.id]) c.tracks[w.id] = warTrack(w);
      return c;
    }
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as LegacyV1;
      if (old.version === 1 && Array.isArray(old.roster)) return migrateV1(old);
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch {
    /* noop */
  }
}

// ═══════════════════════════════════════════════════════════
// 戰役線存取
// ═══════════════════════════════════════════════════════════

export function getTrack(c: CampaignState, trackId = c.active): CampaignTrack {
  return c.tracks[trackId];
}

export function updateTrack(
  c: CampaignState,
  trackId: string,
  fn: (t: CampaignTrack) => CampaignTrack,
): CampaignState {
  return { ...c, tracks: { ...c.tracks, [trackId]: fn(c.tracks[trackId]) } };
}

/** 這條線的陣營(決定軍營能招哪些兵) */
export function trackFaction(trackId: string): string {
  return trackId === FANTASY_TRACK ? "fantasy-human" : getWar(trackId).playerFaction;
}

/** 奇幻外傳:前一關通關才解鎖 */
export function isUnlocked(track: CampaignTrack, mission: MissionDef): boolean {
  if (mission.index === 1) return true;
  const prev = MISSIONS.find((m) => m.index === mission.index - 1);
  return !!prev && track.completedMissions.includes(prev.id);
}

// ═══════════════════════════════════════════════════════════
// 經濟:招募 / 補兵 / 解散
// ═══════════════════════════════════════════════════════════

export function recruitSquad(t: CampaignTrack, typeId: string): CampaignTrack {
  const type = getSquadType(typeId);
  if (t.gold < type.cost || t.roster.length >= MAX_ROSTER) return t;
  return {
    ...t,
    gold: t.gold - type.cost,
    roster: [...t.roster, { id: newSquadId(), typeId, level: 1, xp: 0, soldiers: maxSoldiers(typeId, 1) }],
  };
}

export function replenishCost(r: RosterSquad): number {
  const missing = maxSoldiers(r.typeId, r.level) - r.soldiers;
  return missing * getSquadType(r.typeId).soldierCost;
}

/** 補滿一隊(錢不夠就補到錢用完) */
export function replenishSquad(t: CampaignTrack, squadId: string): CampaignTrack {
  const r = t.roster.find((r) => r.id === squadId);
  if (!r) return t;
  const unitCost = getSquadType(r.typeId).soldierCost;
  const missing = maxSoldiers(r.typeId, r.level) - r.soldiers;
  const affordable = Math.min(missing, Math.floor(t.gold / unitCost));
  if (affordable <= 0) return t;
  return {
    ...t,
    gold: t.gold - affordable * unitCost,
    roster: t.roster.map((x) => (x.id === squadId ? { ...x, soldiers: x.soldiers + affordable } : x)),
  };
}

/** 解散(指揮官隊不能解散) */
export function dismissSquad(t: CampaignTrack, squadId: string): CampaignTrack {
  return { ...t, roster: t.roster.filter((r) => r.id !== squadId || !!r.commanderId) };
}

/**
 * 防軟鎖保底:名冊全空且金幣連最便宜的兵都招不起時,
 * 一隊老兵免費來投,戰役永遠打得下去。
 */
export function ensureViable(t: CampaignTrack, trackId: string): CampaignTrack {
  const types = recruitableTypes(trackFaction(trackId));
  const cheapest = types.reduce((a, b) => (a.cost <= b.cost ? a : b));
  if (t.roster.length > 0 || t.gold >= cheapest.cost) return t;
  return {
    ...t,
    roster: [{ id: newSquadId(), typeId: cheapest.id, level: 1, xp: 0, soldiers: maxSoldiers(cheapest.id, 1) }],
  };
}

// ═══════════════════════════════════════════════════════════
// 戰爭:依前面戰役的結果調整劇本
// ═══════════════════════════════════════════════════════════

/**
 * 開戰前的劇本調整:
 *  - 1066 斯坦福橋:富爾福德殺掉的挪威兵,部分帶到這一戰(開場減員)
 */
export function prepareScenario(scenario: ScenarioDef, track: CampaignTrack): ScenarioDef {
  const losses = track.flags?.norseLosses ?? 0;
  if (scenario.id === "1066-stamford" && losses > 0) {
    const carry = Math.min(0.45, losses * 0.6);
    return {
      ...scenario,
      enemies: scenario.enemies.map((e) => ({ ...e, casualties: Math.max(e.casualties ?? 0, carry) })),
      briefing: `${scenario.briefing}\n\n富爾福德的抵抗沒有白費:挪威軍開戰前就少了約 ${Math.round(carry * 100)}% 的兵力。`,
    };
  }
  return scenario;
}

/** 敵方初始部隊的平均損失比例(給下一戰用) */
export function enemyLossFraction(battle: BattleState): number {
  const initial = battle.squads.filter((s) => s.side === "enemy" && /^enemy-\d+$/.test(s.id));
  if (!initial.length) return 0;
  const lost = initial.reduce((sum, s) => sum + (1 - s.hpPool / maxHpPool(s.typeId, s.level)), 0);
  return lost / initial.length;
}

// ═══════════════════════════════════════════════════════════
// 戰後結算
// ═══════════════════════════════════════════════════════════

export interface BattleResult {
  victory: boolean;
  reason?: string;
  goldEarned: number;
  xpGains: { squadId: string; xp: number; leveledUp: boolean }[];
  casualties: { squadId: string; lost: number }[];
  /** 戰爭:是否推進到下一場 */
  advanced?: boolean;
  /** 戰爭:整場戰爭結束 */
  warFinished?: boolean;
}

/** 把戰場結果寫回戰役線(戰損保留、經驗結算、發獎金、推進戰爭) */
export function applyBattleResult(
  c: CampaignState,
  trackId: string,
  battle: BattleState,
  scenario: ScenarioDef,
): { campaign: CampaignState; result: BattleResult } {
  const track = c.tracks[trackId];
  const victory = battle.outcome === "victory";
  const firstClear = victory && !track.completedMissions.includes(scenario.id);
  const goldMul = getDifficulty(c.difficulty).goldMul;
  const goldEarned = victory
    ? Math.round((firstClear ? scenario.reward : scenario.reward * REPLAY_REWARD_RATE) * goldMul)
    : 0;

  const xpGains: BattleResult["xpGains"] = [];
  const casualties: BattleResult["casualties"] = [];

  const roster = track.roster.map((r) => {
    const fielded = battle.squads.find((s) => s.id === r.id);
    if (!fielded) return r;
    const survivors = aliveSoldiers(fielded);
    const lost = r.soldiers - survivors;
    if (lost > 0) casualties.push({ squadId: r.id, lost });
    if (survivors <= 0) return null; // 全滅的小隊從名冊移除

    const gained = battle.kills[r.id] ?? 0;
    const newXp = r.xp + gained;
    const newLevel = levelForXp(newXp);
    if (gained > 0) xpGains.push({ squadId: r.id, xp: gained, leveledUp: newLevel > r.level });
    return { ...r, soldiers: survivors, xp: newXp, level: newLevel };
  });

  let next: CampaignTrack = {
    ...track,
    gold: track.gold + goldEarned,
    completedMissions: firstClear ? [...track.completedMissions, scenario.id] : track.completedMissions,
    roster: roster.filter((r): r is RosterSquad => r !== null),
  };

  const result: BattleResult = { victory, reason: battle.outcomeReason, goldEarned, xpGains, casualties };

  // 戰爭推進
  if (trackId !== FANTASY_TRACK) {
    const war = getWar(trackId);
    const stage = next.stage ?? 0;
    const battleDef = war.battles[stage];
    if (battleDef && battleDef.scenarioId === scenario.id && (victory || battleDef.advanceOnDefeat)) {
      const flags = { ...(next.flags ?? {}) };
      if (scenario.id === "1066-fulford") flags.norseLosses = enemyLossFraction(battle);
      next = { ...next, stage: stage + 1, flags };
      result.advanced = true;
      result.warFinished = stage + 1 >= war.battles.length;
    }
  }

  next = ensureViable(next, trackId);
  return { campaign: updateTrack(c, trackId, () => next), result };
}

export { recruitableTypes };
