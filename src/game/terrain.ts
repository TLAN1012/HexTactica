/**
 * 地形定義 — 沿用既有 tile 美術(plains/hills/forest/swamp/river)。
 */
import type { TerrainDef } from "./types";

export const TERRAINS: TerrainDef[] = [
  { id: "plains", name: "平原", moveCost: 1, defense: 0, color: "#d8c89a", hasArt: true },
  { id: "hills", name: "丘陵", moveCost: 2, defense: 0.15, color: "#c9a876", hasArt: true },
  { id: "forest", name: "森林", moveCost: 2, defense: 0.25, color: "#6b8e4e", hasArt: true },
  { id: "swamp", name: "沼澤", moveCost: 3, defense: -0.1, color: "#5d6b5d", hasArt: true },
  { id: "river", name: "深水", moveCost: 99, defense: 0, impassable: true, color: "#6b95b8", hasArt: true },
];

const byId = new Map(TERRAINS.map((t) => [t.id, t]));

export function getTerrain(id: string): TerrainDef {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown terrain: ${id}`);
  return t;
}
