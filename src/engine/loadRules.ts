/**
 * 規則資料載入：把 src/engine/rules/*.json 集中提供型別安全的存取。
 * 未來要加新兵種只需要：
 *   1. 丟一個 JSON 到 src/engine/rules/units/
 *   2. 在下面 `unitImports` 加一行 import
 *   3. 在 `allUnitTypes` 陣列加入
 */
import type { TerrainType, UnitType, WeatherType } from "./types";

import heavyCavalry from "./rules/units/heavy-cavalry.json";
import lightCavalry from "./rules/units/light-cavalry.json";
import archer from "./rules/units/archer.json";
import longbow from "./rules/units/longbow.json";
import infantry from "./rules/units/infantry.json";
import spearman from "./rules/units/spearman.json";
import velite from "./rules/units/velite.json";

import terrainsData from "./rules/terrains.json";
import weathersData from "./rules/weathers.json";

export const allUnitTypes: UnitType[] = [
  heavyCavalry,
  lightCavalry,
  archer,
  longbow,
  infantry,
  spearman,
  velite,
] as UnitType[];

export const allTerrains: TerrainType[] = terrainsData as TerrainType[];
export const allWeathers: WeatherType[] = weathersData as WeatherType[];

const unitById = new Map(allUnitTypes.map((u) => [u.id, u]));
const terrainById = new Map(allTerrains.map((t) => [t.id, t]));
const weatherById = new Map(allWeathers.map((w) => [w.id, w]));

export function getUnitType(id: string): UnitType {
  const t = unitById.get(id);
  if (!t) throw new Error(`Unknown unit type: ${id}`);
  return t;
}

export function getTerrain(id: string): TerrainType {
  const t = terrainById.get(id);
  if (!t) throw new Error(`Unknown terrain: ${id}`);
  return t;
}

export function getWeather(id: string): WeatherType {
  const w = weatherById.get(id);
  if (!w) throw new Error(`Unknown weather: ${id}`);
  return w;
}
