/**
 * 地形定義。美術在 public/art/terrain/<id>.webp(哥德風手繪 tile)。
 *
 * 渡口與橋是咽喉:只能慢慢擠過去,而且不能在上面發動衝鋒;
 * 村莊的石牆木屋提供最好的掩護,但同樣不利騎兵衝鋒。
 */
import type { TerrainDef } from "./types";

export const TERRAINS: TerrainDef[] = [
  { id: "plains", name: "平原", moveCost: 1, defense: 0, color: "#b9ab7c", hasArt: true, desc: "開闊地,騎兵的天下。" },
  { id: "hills", name: "丘陵", moveCost: 2, defense: 0.15, color: "#a8895e", hasArt: true, desc: "居高臨下,承傷 −15%。" },
  { id: "forest", name: "森林", moveCost: 2, defense: 0.25, color: "#4f6b3c", hasArt: true, desc: "林木掩護,承傷 −25%。" },
  { id: "swamp", name: "沼澤", moveCost: 3, defense: -0.1, color: "#4d5a4d", hasArt: true, desc: "陷足泥濘,承傷 +10%。" },
  { id: "river", name: "河流", moveCost: 99, defense: 0, impassable: true, color: "#4f7898", hasArt: true, desc: "不可通行。只能從渡口或橋過河。" },
  { id: "ford", name: "渡口", moveCost: 3, defense: -0.1, noCharge: true, color: "#6f93a8", hasArt: true, desc: "涉水過河:移動慢、承傷 +10%、不能衝鋒。" },
  { id: "bridge", name: "橋", moveCost: 1, defense: 0, noCharge: true, color: "#8a7458", hasArt: true, desc: "唯一的快速通道,也是天然的咽喉。不能在橋上衝鋒。" },
  { id: "mud", name: "泥濘田", moveCost: 2, defense: -0.1, noCharge: true, color: "#5a4632", hasArt: true, desc: "剛犁過又下過雨的爛泥,重甲兵寸步難行,騎兵衝不起來。" },
  { id: "stakes", name: "木樁陣", moveCost: 2, defense: 0.15, noCharge: true, color: "#7a6a4a", hasArt: true, desc: "長弓手插在陣前的削尖木樁,騎兵不能衝鋒。" },
  { id: "hedge", name: "樹籬", moveCost: 2, defense: 0.2, noCharge: true, color: "#4a5e36", hasArt: true, desc: "濃密的灌木籬笆,只有幾個缺口能通過。" },
  { id: "fort", name: "堡壘", moveCost: 2, defense: 0.4, noCharge: true, color: "#6a6660", hasArt: true, desc: "石造堡壘,守軍承傷大減。" },
  { id: "village", name: "村莊", moveCost: 1, defense: 0.3, noCharge: true, color: "#9a7a5a", hasArt: true, desc: "屋舍與圍籬,承傷 −30%,不能衝鋒。" },
];

const byId = new Map(TERRAINS.map((t) => [t.id, t]));

export function getTerrain(id: string): TerrainDef {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown terrain: ${id}`);
  return t;
}
