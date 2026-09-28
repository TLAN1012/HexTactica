/**
 * 劇本登錄:歷史戰爭 + 奇幻外傳(舊 MissionDef 在這裡轉成 ScenarioDef)。
 */
import { MISSIONS } from "./missions";
import { SCENARIOS_1066, WAR_1066 } from "./wars/1066";
import { SCENARIOS_HYW, WAR_HYW } from "./wars/hyw";
import type { MissionDef, ScenarioDef, WarDef } from "./types";

export const FANTASY_TRACK = "fantasy";

export function missionToScenario(m: MissionDef): ScenarioDef {
  return {
    id: m.id,
    title: m.title,
    briefing: m.briefing,
    objectiveText: "殲滅所有敵軍。",
    playerFaction: "fantasy-human",
    enemyFaction: "fantasy-orc",
    mapSeed: m.mapSeed,
    mapWidth: m.mapWidth,
    mapHeight: m.mapHeight,
    enemies: m.enemies.map((e) => ({ typeId: e.typeId, level: e.level })),
    victory: [{ kind: "annihilate" }],
    defeat: [{ kind: "annihilated" }],
    reward: m.reward,
  };
}

export const WARS: WarDef[] = [WAR_1066, WAR_HYW];

const ALL: ScenarioDef[] = [...SCENARIOS_1066, ...SCENARIOS_HYW, ...MISSIONS.map(missionToScenario)];
const byId = new Map(ALL.map((s) => [s.id, s]));

export function getScenario(id: string): ScenarioDef {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown scenario: ${id}`);
  return s;
}

export function getWar(id: string): WarDef {
  const w = WARS.find((w) => w.id === id);
  if (!w) throw new Error(`Unknown war: ${id}`);
  return w;
}

export function allScenarios(): ScenarioDef[] {
  return ALL;
}
