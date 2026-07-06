/**
 * 兵種資料 — 小隊制數值
 *
 * 平衡基準:劍盾兵(infantry)為中軸。
 * 升級成長:每級 +10% 血/傷,滿編 +2 人(見 progression.ts)。
 */
import type { SquadType } from "./types";

export const SQUAD_TYPES: SquadType[] = [
  {
    id: "infantry",
    name: "劍盾兵",
    art: "infantry",
    move: 3,
    range: 1,
    soldiers: 20,
    hp: 12,
    dmg: [3, 5],
    defense: 0.25,
    traits: [],
    tags: ["infantry"],
    cost: 100,
    soldierCost: 5,
    desc: "戰線中堅。盾牆提供最穩定的承傷能力,適合頂在最前排吸收攻擊。",
  },
  {
    id: "spearman",
    name: "長槍兵",
    art: "spearman",
    move: 3,
    range: 1,
    soldiers: 20,
    hp: 11,
    dmg: [3, 4],
    defense: 0.15,
    traits: ["firstStrike", "antiCavalry"],
    tags: ["infantry"],
    cost: 120,
    soldierCost: 6,
    desc: "防守時先制反擊(先捅再挨打)。對騎兵 +30% 傷害,並讓對方衝鋒加成失效。",
  },
  {
    id: "archer",
    name: "弓兵",
    art: "archer",
    move: 3,
    range: 3,
    soldiers: 15,
    hp: 7,
    dmg: [3, 5],
    meleeDmg: [1, 2],
    defense: 0.05,
    traits: [],
    tags: ["ranged"],
    cost: 120,
    soldierCost: 7,
    desc: "中程火力。射擊不會被反擊,但距離越遠傷害衰減;被貼臉只能用小刀。",
  },
  {
    id: "longbow",
    name: "長弓兵",
    art: "longbow",
    move: 2,
    range: 4,
    soldiers: 12,
    hp: 7,
    dmg: [4, 7],
    meleeDmg: [1, 2],
    defense: 0.05,
    traits: ["volley"],
    tags: ["ranged"],
    cost: 180,
    soldierCost: 11,
    desc: "超遠拋射,傷害不因距離衰減。腳程慢、近身脆,務必保護好。",
  },
  {
    id: "velite",
    name: "標槍兵",
    art: "velite",
    move: 4,
    range: 2,
    soldiers: 15,
    hp: 9,
    dmg: [3, 5],
    meleeDmg: [2, 4],
    defense: 0.1,
    traits: ["skirmisher"],
    tags: ["ranged"],
    cost: 140,
    soldierCost: 8,
    desc: "機動散兵。短射程但貼臉照樣投標槍不減值,近戰也堪用。",
  },
  {
    id: "light-cavalry",
    name: "輕騎兵",
    art: "light-cavalry",
    move: 6,
    range: 1,
    soldiers: 12,
    hp: 13,
    dmg: [4, 6],
    defense: 0.15,
    traits: ["charge"],
    tags: ["cavalry"],
    cost: 200,
    soldierCost: 14,
    desc: "全場最快。繞後獵殺弓兵與殘隊的利器,小心別撞上長槍。",
  },
  {
    id: "heavy-cavalry",
    name: "重騎兵",
    art: "heavy-cavalry",
    move: 5,
    range: 1,
    soldiers: 10,
    hp: 18,
    dmg: [5, 8],
    defense: 0.3,
    traits: ["charge"],
    tags: ["cavalry"],
    cost: 300,
    soldierCost: 24,
    desc: "衝鋒之王:助跑越遠撞得越痛(每格 +15%,上限 +60%)。造價高昂。",
  },
];

/**
 * 獸人戰團(敵方專屬)— 數值與對應人類兵種完全相同(僅換皮),
 * 確保平衡模擬結果直接沿用;差異只在名稱、美術與風味描述。
 */
export const ORC_TYPES: SquadType[] = [
  {
    ...baseClone("infantry"),
    id: "orc-warrior",
    name: "獸人戰士",
    art: "orc-warrior",
    desc: "碎顱氏族的主力,揮著彎刀的綠皮蠻兵,靠人數與蠻力硬碾。",
  },
  {
    ...baseClone("spearman"),
    id: "orc-impaler",
    name: "獸人戳刺手",
    art: "orc-impaler",
    desc: "扛著削尖木樁的獸人,守勢時先戳再說,馬匹撞上去只有慘叫。",
  },
  {
    ...baseClone("archer"),
    id: "orc-archer",
    name: "獸人射手",
    art: "orc-archer",
    desc: "拿粗製短弓的獸人,箭頭髒得發黑,被貼臉就只會咬人。",
  },
  {
    ...baseClone("longbow"),
    id: "troll-slinger",
    name: "巨魔投石手",
    art: "troll-slinger",
    desc: "灰皮巨魔把磨盤大的石頭拋過半個戰場,砸到什麼都是一個坑。",
  },
  {
    ...baseClone("velite"),
    id: "orc-axethrower",
    name: "獸人擲斧手",
    art: "orc-axethrower",
    desc: "腰間掛滿飛斧的機動散兵,貼臉照丟不誤。",
  },
  {
    ...baseClone("light-cavalry"),
    id: "wolf-rider",
    name: "座狼騎兵",
    art: "wolf-rider",
    desc: "騎著座狼的獸人斥候,速度全場最快,最愛從背後咬斷弓手的喉嚨。",
  },
  {
    ...baseClone("heavy-cavalry"),
    id: "troll-crusher",
    name: "巨魔衝撞者",
    art: "troll-crusher",
    desc: "全身披掛廢鐵的巨魔,助跑起來像一堵會跑的城牆。",
  },
];

function baseClone(id: string): Omit<SquadType, "id" | "name" | "art" | "desc"> {
  const t = SQUAD_TYPES.find((t) => t.id === id)!;
  return {
    move: t.move,
    range: t.range,
    soldiers: t.soldiers,
    hp: t.hp,
    dmg: t.dmg,
    meleeDmg: t.meleeDmg,
    defense: t.defense,
    traits: t.traits,
    tags: t.tags,
    cost: t.cost,
    soldierCost: t.soldierCost,
    recruitable: false,
  };
}

const byId = new Map([...SQUAD_TYPES, ...ORC_TYPES].map((t) => [t.id, t]));

export function getSquadType(id: string): SquadType {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown squad type: ${id}`);
  return t;
}
