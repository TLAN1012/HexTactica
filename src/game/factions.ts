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
  { id: "english", name: "英格蘭", color: "#b8323a", tint: "rgba(184,50,58,0.2)", era: "百年戰爭" },
  { id: "french", name: "法蘭西", color: "#3a6fb8", tint: "rgba(58,111,184,0.2)", era: "百年戰爭" },
];

export const COMMANDERS: CommanderDef[] = [
  {
    id: "harold",
    name: "哈羅德二世",
    title: "英格蘭國王",
    faction: "saxon",
    portrait: "harold.webp",
    facing: "left",
    bio: "懺悔者愛德華駕崩後由賢人會議推舉為王。即位不到十個月,就得在北方迎戰挪威王、在南方迎戰諾曼公爵。",
  },
  {
    id: "gyrth",
    name: "吉爾斯",
    title: "東盎格利亞伯爵・哈羅德之弟",
    faction: "saxon",
    portrait: "gyrth.webp",
    facing: "left",
    bio: "哈羅德最信任的弟弟。史載他曾勸兄長留守倫敦、由自己領兵迎擊威廉。",
  },
  {
    id: "morcar",
    name: "莫卡",
    title: "諾森布里亞伯爵",
    faction: "saxon",
    portrait: "morcar.webp",
    facing: "right",
    bio: "與兄長埃德溫共守北方。挪威大軍在約克城外登陸時,他們沒有等國王南來,決定正面迎擊。",
  },
  {
    id: "edwin",
    name: "埃德溫",
    title: "麥西亞伯爵",
    faction: "saxon",
    portrait: "edwin.webp",
    facing: "left",
    bio: "莫卡之兄。富爾福德一戰與弟弟並肩,在烏斯河與沼澤之間布陣。",
  },
  {
    id: "hardrada",
    name: "哈拉爾・哈德拉達",
    title: "挪威國王「無情者」",
    faction: "norse",
    portrait: "hardrada.webp",
    facing: "right",
    bio: "曾任拜占庭瓦蘭吉衛隊統領,傳奇一生的北方戰王。他主張自己才是英格蘭王位的合法繼承人。",
  },
  {
    id: "tostig",
    name: "托斯提格",
    title: "前諾森布里亞伯爵・哈羅德之弟",
    faction: "norse",
    portrait: "tostig.webp",
    facing: "left",
    bio: "被放逐的哈羅德親弟,投靠挪威王回來奪取故土。兄弟最終在斯坦福橋兵戎相見。",
  },
  {
    id: "orri",
    name: "埃斯坦・奧里",
    title: "挪威將領",
    faction: "norse",
    portrait: "orri.webp",
    facing: "right",
    bio: "率兵留守船隊。聽聞國王遇襲,帶著全副盔甲一路狂奔來援——史稱「奧里的風暴」。",
  },
  {
    id: "william",
    name: "威廉",
    title: "諾曼第公爵",
    faction: "norman",
    portrait: "william.webp",
    facing: "right",
    bio: "私生子出身、少年即位,在內戰中磨成最冷靜的指揮官。渡海而來,要奪取他認為被許諾的王冠。",
  },
  {
    id: "odo",
    name: "厄德",
    title: "巴約主教・威廉之弟",
    faction: "norman",
    portrait: "odo.webp",
    facing: "right",
    bio: "手持權杖上陣的主教(據說教士不可見血)。戰況危急時策馬穩住了動搖的諾曼軍。",
  },
  // ── 百年戰爭 ──
  { id: "edward3", name: "愛德華三世", title: "英格蘭國王", faction: "english", portrait: "edward3.webp", facing: "left",
    bio: "宣稱擁有法蘭西王位繼承權,點燃了百年戰爭。克雷西之戰時親自坐鎮風車山丘指揮。" },
  { id: "blackprince", name: "黑太子愛德華", title: "威爾斯親王", faction: "english", portrait: "blackprince.webp", facing: "left",
    bio: "十六歲在克雷西指揮前鋒;十年後在普瓦捷生擒法王。一身黑甲,是那個時代的騎士典範。" },
  { id: "henry5", name: "亨利五世", title: "英格蘭國王", faction: "english", portrait: "henry5.webp", facing: "left",
    bio: "年輕的國王帶著疲病交加的軍隊,在阿金庫爾面對數倍於己的法軍。「我們這一小群人,我們這群兄弟。」" },
  { id: "captal", name: "讓・德・格拉伊", title: "布赫領主(加斯科涅)", faction: "english", portrait: "captal.webp", facing: "left",
    bio: "黑太子麾下的加斯科涅名將。普瓦捷之戰率小隊騎兵繞到法軍背後,一擊定勝負。" },
  { id: "glasdale", name: "威廉・格拉斯戴爾", title: "圖雷勒堡守將", faction: "english", portrait: "glasdale.webp", facing: "left",
    bio: "守著奧爾良南岸的橋頭堡壘。曾對貞德破口大罵——最後在撤退時落入羅亞爾河。" },
  { id: "philip6", name: "腓力六世", title: "法蘭西國王", faction: "french", portrait: "philip6.webp", facing: "left",
    bio: "瓦盧瓦王朝的第一位國王。在克雷西,他的騎士不等號令就一波波衝上山坡。" },
  { id: "johnbohemia", name: "盲王約翰", title: "波希米亞國王", faction: "french", portrait: "johnbohemia.webp", facing: "right",
    bio: "雙目失明,仍讓騎士把馬韁綁在一起,帶他衝進戰場——「好讓我能揮出一劍」。" },
  { id: "john2", name: "約翰二世", title: "法蘭西國王「好人」", faction: "french", portrait: "john2.webp", facing: "right",
    bio: "腓力六世之子。普瓦捷一戰,他徒步手持戰斧死戰,最終被俘。" },
  { id: "dalbret", name: "夏爾・達爾布雷", title: "法蘭西王室統帥", faction: "french", portrait: "dalbret.webp", facing: "left",
    bio: "阿金庫爾的法軍統帥。數倍兵力、全歐最好的甲冑——卻陷在一片爛泥田裡。" },
  { id: "joan", name: "貞德", title: "奧爾良的少女", faction: "french", portrait: "joan.webp", facing: "right",
    bio: "十七歲的農家少女,說自己聽見了天使的聲音。她舉著白旗走到軍隊最前面,奧爾良之圍九天就解除了。" },
  { id: "dunois", name: "讓・德・杜諾瓦", title: "奧爾良的私生子", faction: "french", portrait: "dunois.webp", facing: "left",
    bio: "奧爾良守軍的實際指揮官。起初懷疑這位少女,後來成了她最忠實的戰友。" },
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
