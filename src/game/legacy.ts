/**
 * 跨時代傳承:
 *  - 番號傳承:戰爭結束時挑最多 2 支老兵隊,帶到下一個時代,轉成「同定位」的兵種(等級 −1,補滿),保留番號與戰功
 *  - 遺物:打完一場戰爭得到一件,在之後的戰役線裝備,給全軍一個小加成
 */
import { XP_THRESHOLDS, maxSoldiers } from "./progression";
import { getSquadType, recruitableTypes } from "./units";
import type { CampaignState, FactionId, HeirRecord, LegacyState, RosterSquad, SquadModifier } from "./types";

export const MAX_HEIRS = 2;

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  modifier: SquadModifier;
}

export const RELICS: RelicDef[] = [
  {
    id: "wessex-dragon",
    name: "威塞克斯龍旗",
    desc: "哈羅德在森拉克山脊上的金色龍旗。全軍傷害 +5%。",
    modifier: { label: "龍旗 +5%", damageMul: 1.05 },
  },
  {
    id: "maid-banner",
    name: "聖女的百合旗",
    desc: "貞德高舉衝上圖雷勒堡的白色軍旗。全軍承傷 −5%。",
    modifier: { label: "百合旗 −5%", defense: 0.05 },
  },
];

export function getRelic(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

export function legacyOf(c: CampaignState): LegacyState {
  return c.legacy ?? { heirs: [], relics: [] };
}

/** 番號:第一次傳承時依原兵種與戰功命名 */
export function lineageName(r: RosterSquad): string {
  if (r.lineage) return r.lineage;
  const t = getSquadType(r.typeId);
  const last = r.honors?.[r.honors.length - 1];
  return last ? `${last}老兵團(${t.name})` : `${t.name}老兵團`;
}

/** 把老兵隊轉成目標陣營「同定位」的兵種 */
export function convertHeir(r: RosterSquad, faction: FactionId, id: string): RosterSquad {
  const role = getSquadType(r.typeId).role;
  const pool = recruitableTypes(faction);
  const target = pool.find((t) => t.role === role) ?? pool.find((t) => t.role === "heavyInf") ?? pool[0];
  const level = Math.max(1, r.level - 1);
  return {
    id,
    typeId: target.id,
    level,
    xp: XP_THRESHOLDS[level - 1],
    soldiers: maxSoldiers(target.id, level),
    lineage: lineageName(r),
    honors: r.honors ?? [],
  };
}

/** 戰爭結束時選好的老兵存進傳承 */
export function recordHeirs(c: CampaignState, warId: string, squads: RosterSquad[]): CampaignState {
  const legacy = legacyOf(c);
  const heirs: HeirRecord[] = [
    ...legacy.heirs.filter((h) => h.fromWar !== warId),
    ...squads.slice(0, MAX_HEIRS).map((s) => ({ fromWar: warId, squad: { ...s, lineage: lineageName(s) } })),
  ];
  return { ...c, legacy: { ...legacy, heirs } };
}

export function grantRelic(c: CampaignState, relicId: string | undefined): CampaignState {
  if (!relicId) return c;
  const legacy = legacyOf(c);
  if (legacy.relics.includes(relicId)) return c;
  return { ...c, legacy: { ...legacy, relics: [...legacy.relics, relicId] } };
}
