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
    faction: "fantasy-human",
    art: "infantry.png",
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
    faction: "fantasy-human",
    art: "spearman.png",
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
    faction: "fantasy-human",
    art: "archer.png",
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
    faction: "fantasy-human",
    art: "longbow.png",
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
    faction: "fantasy-human",
    art: "velite.png",
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
    faction: "fantasy-human",
    art: "light-cavalry.png",
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
    faction: "fantasy-human",
    art: "heavy-cavalry.png",
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
    art: "orc-warrior.png",
    desc: "碎顱氏族的主力,揮著彎刀的綠皮蠻兵,靠人數與蠻力硬碾。",
  },
  {
    ...baseClone("spearman"),
    id: "orc-impaler",
    name: "獸人戳刺手",
    art: "orc-impaler.png",
    desc: "扛著削尖木樁的獸人,守勢時先戳再說,馬匹撞上去只有慘叫。",
  },
  {
    ...baseClone("archer"),
    id: "orc-archer",
    name: "獸人射手",
    art: "orc-archer.png",
    desc: "拿粗製短弓的獸人,箭頭髒得發黑,被貼臉就只會咬人。",
  },
  {
    ...baseClone("longbow"),
    id: "troll-slinger",
    name: "巨魔投石手",
    single: true,
    art: "troll-slinger.png",
    desc: "灰皮巨魔把磨盤大的石頭拋過半個戰場,砸到什麼都是一個坑。",
  },
  {
    ...baseClone("velite"),
    id: "orc-axethrower",
    name: "獸人擲斧手",
    art: "orc-axethrower.png",
    desc: "腰間掛滿飛斧的機動散兵,貼臉照丟不誤。",
  },
  {
    ...baseClone("light-cavalry"),
    id: "wolf-rider",
    name: "座狼騎兵",
    art: "wolf-rider.png",
    desc: "騎著座狼的獸人斥候,速度全場最快,最愛從背後咬斷弓手的喉嚨。",
  },
  {
    ...baseClone("heavy-cavalry"),
    id: "troll-crusher",
    name: "巨魔衝撞者",
    art: "troll-crusher.png",
    desc: "全身披掛廢鐵的巨魔,助跑起來像一堵會跑的城牆。",
  },
];

function baseClone(id: string): Omit<SquadType, "id" | "name" | "art" | "desc"> {
  const t = SQUAD_TYPES.find((t) => t.id === id)!;
  return {
    faction: "fantasy-orc",
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

/**
 * 1066 諾曼征服 — 撒克遜、挪威、諾曼三方兵種。
 * 數值以奇幻版為基準微調:家臣兵與維京親衛有盾牆,狂戰士近戰爆發,
 * 諾曼弩手穿甲、騎士衝鋒;撒克遜軍幾乎全是步兵(史實如此)。
 */
export const HISTORICAL_TYPES: SquadType[] = [
  // ── 撒克遜 ──
  {
    id: "saxon-huscarl", name: "王室家臣兵", faction: "saxon", art: "saxon-huscarl.webp",
    move: 3, range: 1, soldiers: 16, hp: 14, dmg: [4, 6], defense: 0.3,
    traits: ["shieldWall"], tags: ["infantry"], cost: 180, soldierCost: 11,
    desc: "國王與伯爵的職業親兵,揮舞長柄丹麥斧。與相鄰的盾牆部隊互相掩護,騎兵正面撞不動。",
  },
  {
    id: "saxon-fyrd", name: "民兵(弗德)", faction: "saxon", art: "saxon-fyrd.webp",
    move: 3, range: 1, soldiers: 22, hp: 9, dmg: [2, 4], defense: 0.1,
    traits: ["shieldWall", "antiCavalry", "levy"], tags: ["infantry"], cost: 80, soldierCost: 4,
    desc: "各郡徵召的自由農民,拿長矛與圓盾。單兵不強但人多便宜,排進盾牆就是一道厚牆。",
  },
  {
    id: "saxon-archer", name: "撒克遜弓手", faction: "saxon", art: "saxon-archer.webp",
    move: 3, range: 3, soldiers: 14, hp: 7, dmg: [3, 5], meleeDmg: [1, 2], defense: 0.05,
    traits: [], tags: ["ranged"], cost: 110, soldierCost: 7,
    desc: "人數不多的輕裝弓手。躲在盾牆後面放箭,被貼身就危險了。",
  },
  {
    id: "saxon-thegn", name: "騎乘鄉紳", faction: "saxon", art: "saxon-thegn.webp",
    move: 5, range: 1, soldiers: 12, hp: 13, dmg: [4, 6], defense: 0.2,
    traits: ["charge"], tags: ["cavalry"], cost: 200, soldierCost: 14,
    desc: "騎馬趕路的地方貴族。英格蘭軍少數的機動力量,適合追擊與包抄。",
  },
  // ── 挪威 ──
  {
    id: "norse-hirdman", name: "維京親衛", faction: "norse", art: "norse-hirdman.webp",
    move: 3, range: 1, soldiers: 16, hp: 14, dmg: [4, 6], defense: 0.3,
    traits: ["shieldWall"], tags: ["infantry"], cost: 180, soldierCost: 11, recruitable: false,
    desc: "挪威王的親兵衛隊。圓盾相扣結成盾牆,是維京軍的骨幹。",
  },
  {
    id: "norse-raider", name: "維京戰士", faction: "norse", art: "norse-raider.webp",
    move: 3, range: 1, soldiers: 20, hp: 11, dmg: [3, 5], defense: 0.2,
    traits: ["shieldWall"], tags: ["infantry"], cost: 120, soldierCost: 6, recruitable: false,
    desc: "隨王出征的自由戰士,劍、斧、圓盾樣樣來。",
  },
  {
    id: "norse-berserker", name: "狂戰士", faction: "norse", art: "norse-berserker.webp",
    move: 4, range: 1, soldiers: 12, hp: 13, dmg: [5, 7], defense: 0.1,
    traits: ["berserk"], tags: ["infantry"], cost: 200, soldierCost: 14, recruitable: false,
    desc: "披著熊皮、陷入狂怒的戰士。主動近戰傷害 +25%,但幾乎不穿甲。",
  },
  {
    id: "norse-archer", name: "維京弓手", faction: "norse", art: "norse-archer.webp",
    move: 3, range: 3, soldiers: 14, hp: 7, dmg: [3, 5], meleeDmg: [1, 2], defense: 0.05,
    traits: [], tags: ["ranged"], cost: 110, soldierCost: 7, recruitable: false,
    desc: "北地獵手出身的弓手。",
  },
  // ── 諾曼 ──
  {
    id: "norman-knight", name: "諾曼騎士", faction: "norman", art: "norman-knight.webp",
    move: 5, range: 1, soldiers: 10, hp: 18, dmg: [5, 8], defense: 0.3,
    traits: ["charge"], tags: ["cavalry"], cost: 300, soldierCost: 24, recruitable: false,
    desc: "披鎖甲、持風箏盾與騎槍的騎士。助跑衝鋒極痛,但正面撞上盾牆會吃大虧。",
  },
  {
    id: "norman-breton", name: "布列塔尼輕騎", faction: "norman", art: "norman-breton.webp",
    move: 6, range: 1, soldiers: 12, hp: 13, dmg: [4, 6], defense: 0.15,
    traits: ["charge"], tags: ["cavalry"], cost: 200, soldierCost: 14, recruitable: false,
    desc: "威廉左翼的布列塔尼盟軍。來去如風,擅長引誘敵人追出陣線。",
  },
  {
    id: "norman-crossbow", name: "諾曼弩手", faction: "norman", art: "norman-crossbow.webp",
    move: 3, range: 3, soldiers: 12, hp: 8, dmg: [4, 6], meleeDmg: [1, 2], defense: 0.1,
    traits: ["pierce"], tags: ["ranged"], cost: 160, soldierCost: 10, recruitable: false,
    desc: "當時英格蘭少見的弩。穿甲:無視目標一半的兵種減傷,專剋重甲家臣兵。",
  },
  {
    id: "norman-archer", name: "諾曼弓手", faction: "norman", art: "norman-archer.webp",
    move: 3, range: 3, soldiers: 15, hp: 7, dmg: [3, 5], meleeDmg: [1, 2], defense: 0.05,
    traits: [], tags: ["ranged"], cost: 120, soldierCost: 7, recruitable: false,
    desc: "威廉陣列最前排的弓手。黑斯廷斯傍晚那支「射中哈羅德眼睛」的箭,傳說就來自他們。",
  },
  {
    id: "norman-infantry", name: "諾曼步兵", faction: "norman", art: "norman-infantry.webp",
    move: 3, range: 1, soldiers: 18, hp: 12, dmg: [3, 5], defense: 0.25,
    traits: ["firstStrike"], tags: ["infantry"], cost: 130, soldierCost: 7, recruitable: false,
    desc: "持矛與風箏盾的步兵,負責在騎士衝鋒前後撕開敵陣。",
  },
];

const byId = new Map([...SQUAD_TYPES, ...ORC_TYPES, ...HISTORICAL_TYPES].map((t) => [t.id, t]));

/** 某陣營可招募的兵種(軍營用) */
export function recruitableTypes(faction: string): SquadType[] {
  return [...SQUAD_TYPES, ...HISTORICAL_TYPES].filter((t) => t.faction === faction && t.recruitable !== false);
}

export function getSquadType(id: string): SquadType {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown squad type: ${id}`);
  return t;
}
