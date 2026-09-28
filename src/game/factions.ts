/**
 * 陣營與歷史指揮官。
 * 指揮官以哥德風少年少女重新詮釋,但姓名、身分與事蹟依史實。
 */
import type { CommanderDef, FactionDef, FactionId } from "./types";

export const FACTIONS: FactionDef[] = [
  { id: "fantasy-human", name: "河谷戰團", color: "#2e6fd8", tint: "rgba(46,111,216,0.18)", era: "奇幻" },
  { id: "fantasy-orc", name: "碎顱氏族", color: "#c23b2b", tint: "rgba(194,59,43,0.18)", era: "奇幻" },
  { id: "saxon", name: "英格蘭(撒克遜)", color: "#b8323a", tint: "rgba(184,50,58,0.2)", era: "1066" },
  { id: "norse", name: "挪威(維京)", color: "#3a6fb8", tint: "rgba(58,111,184,0.2)", era: "1066" },
  { id: "norman", name: "諾曼第", color: "#c9a13a", tint: "rgba(201,161,58,0.22)", era: "1066" },
];

export const COMMANDERS: CommanderDef[] = [
  {
    id: "harold",
    name: "哈羅德二世",
    title: "英格蘭國王",
    faction: "saxon",
    portrait: "harold.webp",
    bio: "懺悔者愛德華駕崩後由賢人會議推舉為王。即位不到十個月,就得在北方迎戰挪威王、在南方迎戰諾曼公爵。",
  },
  {
    id: "gyrth",
    name: "吉爾斯",
    title: "東盎格利亞伯爵・哈羅德之弟",
    faction: "saxon",
    portrait: "gyrth.webp",
    bio: "哈羅德最信任的弟弟。史載他曾勸兄長留守倫敦、由自己領兵迎擊威廉。",
  },
  {
    id: "morcar",
    name: "莫卡",
    title: "諾森布里亞伯爵",
    faction: "saxon",
    portrait: "morcar.webp",
    bio: "與兄長埃德溫共守北方。挪威大軍在約克城外登陸時,他們沒有等國王南來,決定正面迎擊。",
  },
  {
    id: "edwin",
    name: "埃德溫",
    title: "麥西亞伯爵",
    faction: "saxon",
    portrait: "edwin.webp",
    bio: "莫卡之兄。富爾福德一戰與弟弟並肩,在烏斯河與沼澤之間布陣。",
  },
  {
    id: "hardrada",
    name: "哈拉爾・哈德拉達",
    title: "挪威國王「無情者」",
    faction: "norse",
    portrait: "hardrada.webp",
    bio: "曾任拜占庭瓦蘭吉衛隊統領,傳奇一生的北方戰王。他主張自己才是英格蘭王位的合法繼承人。",
  },
  {
    id: "tostig",
    name: "托斯提格",
    title: "前諾森布里亞伯爵・哈羅德之弟",
    faction: "norse",
    portrait: "tostig.webp",
    bio: "被放逐的哈羅德親弟,投靠挪威王回來奪取故土。兄弟最終在斯坦福橋兵戎相見。",
  },
  {
    id: "orri",
    name: "埃斯坦・奧里",
    title: "挪威將領",
    faction: "norse",
    portrait: "orri.webp",
    bio: "率兵留守船隊。聽聞國王遇襲,帶著全副盔甲一路狂奔來援——史稱「奧里的風暴」。",
  },
  {
    id: "william",
    name: "威廉",
    title: "諾曼第公爵",
    faction: "norman",
    portrait: "william.webp",
    bio: "私生子出身、少年即位,在內戰中磨成最冷靜的指揮官。渡海而來,要奪取他認為被許諾的王冠。",
  },
  {
    id: "odo",
    name: "厄德",
    title: "巴約主教・威廉之弟",
    faction: "norman",
    portrait: "odo.webp",
    bio: "手持權杖上陣的主教(據說教士不可見血)。戰況危急時策馬穩住了動搖的諾曼軍。",
  },
];

const factionById = new Map(FACTIONS.map((f) => [f.id, f]));
const commanderById = new Map(COMMANDERS.map((c) => [c.id, c]));

export function getFaction(id: FactionId): FactionDef {
  const f = factionById.get(id);
  if (!f) throw new Error(`Unknown faction: ${id}`);
  return f;
}

export function getCommander(id: string): CommanderDef {
  const c = commanderById.get(id);
  if (!c) throw new Error(`Unknown commander: ${id}`);
  return c;
}

/** 指揮官光環:本隊與相鄰友軍的傷害加成 */
export const COMMANDER_AURA = 0.15;
