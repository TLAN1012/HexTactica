/**
 * 1066 諾曼征服 — 三場連戰
 *
 *   富爾福德 (9/20) → 斯坦福橋 (9/25) → 黑斯廷斯 (10/14)
 *
 * 玩家扮演英格蘭。史實上英格蘭贏了斯坦福橋、輸了另外兩場;
 * 遊戲的目標設計成「可以改寫歷史,但要夠會打」:
 *  - 富爾福德:守住就好(撐 8 回合、約克不失守),殺越多挪威兵,斯坦福橋的敵軍越殘
 *  - 斯坦福橋:奇襲沒穿甲的維京人,在奧里援軍趕到前擊殺挪威王
 *  - 黑斯廷斯:山脊上的盾牆守到天黑(第 12 回合),哈羅德不能倒
 *
 * 地圖字元:. 平原  h 丘陵  f 森林  s 沼澤  ~ 河  = 渡口  b 橋  v 村莊
 * 座標一律 [欄, 列],左上角 [0, 0];玩家從左側、敵軍從右側。
 */
import type { ScenarioDef, WarDef } from "../types";

const NO_ARMOR = { label: "盔甲留在船上 −25%", defense: -0.25 };
const WINDED = { label: "急行軍力竭", damageMul: 0.85, untilTurn: 9 };

export const FULFORD: ScenarioDef = {
  id: "1066-fulford",
  title: "富爾福德之戰",
  date: "1066 年 9 月 20 日・約克城南",
  art: "fulford.webp",
  briefing:
    "挪威王哈拉爾・哈德拉達帶著三百艘長船溯烏斯河而上,在里卡爾登陸,直撲約克。北方兩位伯爵埃德溫與莫卡沒有等國王南來,把軍隊擺在烏斯河與沼澤之間,前面是一道叫日耳曼溪的泥溝。國王的大軍還在四百公里外——你要替他爭取時間。",
  objectiveText: "撐過 8 回合,不讓挪威軍占領約克(左側村莊)。殺越多敵兵,下一戰的敵軍越殘。",
  playerFaction: "saxon",
  enemyFaction: "norse",
  useRoster: false,
  playerAiStance: "hold",
  mapRows: [
    "~~~~~~~~~~~~~~~~~~~~~~",
    "vv....h..s.......ff...",
    "v.....h..s........f...",
    "v.......ss............",
    "vv......s.......h.....",
    "v.......s......hh.....",
    "v.......s.............",
    "v.......s.............",
    "vv......s.....f.......",
    "v.......ss...fff......",
    "v........s............",
    "....ss...ss.....ss....",
    "..ssssssssssssssss....",
    "ssssssssssssssssssssss",
  ],
  playerFixed: [
    { typeId: "saxon-huscarl", level: 2, at: [6, 4], commanderId: "morcar" },
    { typeId: "saxon-huscarl", level: 2, at: [6, 8], commanderId: "edwin" },
    { typeId: "saxon-fyrd", level: 1, at: [7, 3] },
    { typeId: "saxon-fyrd", level: 1, at: [7, 6] },
    { typeId: "saxon-fyrd", level: 1, at: [7, 9] },
    { typeId: "saxon-fyrd", level: 1, at: [6, 10] },
    { typeId: "saxon-archer", level: 1, at: [4, 6] },
  ],
  enemies: [
    { typeId: "norse-hirdman", level: 3, at: [14, 5], commanderId: "hardrada" },
    { typeId: "norse-raider", level: 2, at: [14, 9], commanderId: "tostig" },
    { typeId: "norse-hirdman", level: 2, at: [13, 4] },
    { typeId: "norse-hirdman", level: 2, at: [13, 7] },
    { typeId: "norse-raider", level: 1, at: [13, 10] },
    { typeId: "norse-raider", level: 1, at: [15, 2] },
    { typeId: "norse-berserker", level: 2, at: [12, 6] },
    { typeId: "norse-archer", level: 1, at: [16, 5] },
    { typeId: "norse-archer", level: 1, at: [16, 9] },
  ],
  victory: [{ kind: "survive", turn: 8 }, { kind: "annihilate" }],
  defeat: [
    { kind: "annihilated" },
    { kind: "hexesLost", hexes: [[0, 5], [0, 6], [0, 7]] },
  ],
  reward: 400,
  intro: [
    { text: "1066 年 9 月。懺悔者愛德華駕崩才九個月,英格蘭的王冠已經有三個人想要。" },
    { speaker: "hardrada", text: "克努特大帝的北海帝國,本就該由我來延續。約克——就從你開始。" },
    { speaker: "morcar", text: "哥哥,國王還在南方防著諾曼人。我們等不到他了。" },
    { speaker: "edwin", text: "那就守住。背靠烏斯河、腳下是沼澤——讓北方人一步一步用血來換。" },
  ],
  outroVictory: [
    { speaker: "morcar", text: "撐住了……約克還在我們手裡。快馬告訴國王:北方人沒能一口吞下我們。" },
    { text: "五天後,哈羅德國王的大軍以驚人的速度抵達約克——比任何人預料的都快。" },
  ],
  outroDefeat: [
    { text: "史實上,北方伯爵在富爾福德慘敗,約克開城投降。但這場抵抗仍然拖住了挪威人——" },
    { text: "五天後,哈羅德國王的大軍以驚人的速度抵達約克。" },
  ],
};

export const STAMFORD: ScenarioDef = {
  id: "1066-stamford",
  title: "斯坦福橋之戰",
  date: "1066 年 9 月 25 日・德文特河",
  art: "stamford.webp",
  briefing:
    "哈羅德四天急行軍三百公里,在斯坦福橋撞上正在等待人質交換的挪威軍。天氣炎熱,維京人把鎖甲留在里卡爾的船上——他們沒想到英格蘭國王會來。唯一的橋上,一個巨漢狂戰士擋住了整支軍隊。奧里正帶著全副武裝的留守部隊從船隊狂奔而來。",
  objectiveText: "擊殺挪威王哈拉爾・哈德拉達。哈羅德不能陣亡。第 7 回合奧里援軍從東邊抵達,挪威軍將全線反攻——在那之前能削弱多少,就是勝負關鍵。",
  playerFaction: "saxon",
  enemyFaction: "norse",
  mapRows: [
    "......f....~..........",
    "..f........=....h.....",
    ".ff........~....hh....",
    "...........~..........",
    "....h......~.....f....",
    "...hh......~..........",
    "...........~..........",
    "...........b..........",
    "...........~........v.",
    "..f........~..........",
    ".ff........~.....h....",
    "...........~....hh....",
    "....s......=..........",
    "...sss.....~..........",
  ],
  playerDeploy: [[3, 7], [3, 5], [3, 9], [2, 6], [2, 8], [2, 4], [2, 10], [1, 7]],
  enemies: [
    { typeId: "norse-hirdman", level: 3, at: [15, 7], commanderId: "hardrada", stance: "hold", activateTurn: 7, modifiers: [NO_ARMOR] },
    { typeId: "norse-raider", level: 2, at: [15, 5], commanderId: "tostig", stance: "hold", activateTurn: 7, modifiers: [NO_ARMOR] },
    { typeId: "norse-berserker", level: 2, at: [11, 7], stance: "hold", activateTurn: 7 },
    { typeId: "norse-raider", level: 1, at: [8, 6], modifiers: [NO_ARMOR] },
    { typeId: "norse-hirdman", level: 2, at: [13, 7], stance: "hold", activateTurn: 7, modifiers: [NO_ARMOR] },
    { typeId: "norse-raider", level: 1, at: [14, 4], stance: "hold", activateTurn: 7, modifiers: [NO_ARMOR] },
    { typeId: "norse-raider", level: 1, at: [14, 10], stance: "hold", activateTurn: 7, modifiers: [NO_ARMOR] },
    { typeId: "norse-archer", level: 2, at: [17, 6], modifiers: [NO_ARMOR] },
    { typeId: "norse-archer", level: 1, at: [17, 8], modifiers: [NO_ARMOR] },
  ],
  reinforcements: [
    {
      turn: 7,
      side: "enemy",
      message: "號角從東方響起——埃斯坦・奧里帶著全副武裝的留守部隊殺到!(急行軍力竭,戰力 −15% 到第 9 回合)。挪威王下令全軍出擊!",
      squads: [
        { typeId: "norse-hirdman", level: 2, at: [21, 7], commanderId: "orri", modifiers: [WINDED] },
        { typeId: "norse-hirdman", level: 2, at: [21, 6], modifiers: [WINDED] },
        { typeId: "norse-raider", level: 2, at: [21, 8], modifiers: [WINDED] },
      ],
    },
  ],
  victory: [{ kind: "killCommander", commanderId: "hardrada" }, { kind: "annihilate" }],
  defeat: [{ kind: "commanderLost", commanderId: "harold" }, { kind: "annihilated" }],
  reward: 600,
  intro: [
    { speaker: "harold", text: "他們在河對岸曬太陽,盔甲全留在船上。這是上天給的機會——不能讓奧里趕到。" },
    { speaker: "tostig", text: "……那是哥哥的旗。他竟然四天就從倫敦殺到這裡。" },
    { speaker: "hardrada", text: "穿不穿甲又如何?挪威人死在戰場上,就是最好的死法。把旗升起來!" },
    { text: "橋上,一名巨漢揮著長斧,獨自擋住了整條路。" },
  ],
  outroVictory: [
    { speaker: "harold", text: "無情者倒下了。托斯提格……我給過你機會。" },
    { text: "三百艘長船來,只有二十四艘回得去。維京時代,在這一天畫下句點。" },
    { text: "三天後,消息傳來:諾曼第公爵威廉已在英格蘭南岸登陸。" },
  ],
  outroDefeat: [
    { text: "英格蘭軍沒能擊破挪威人。北方落入無情者之手,而南方,威廉的船帆已經出現在海平線上……" },
  ],
};

export const HASTINGS: ScenarioDef = {
  id: "1066-hastings",
  title: "黑斯廷斯之戰",
  date: "1066 年 10 月 14 日・森拉克山脊",
  art: "hastings.webp",
  briefing:
    "才剛擊敗挪威王,哈羅德又帶著疲憊的軍隊南下兩百五十英里。他在森拉克山脊上排出盾牆,背後是安德列德森林。山下,威廉把軍隊分成三路:左翼布列塔尼人、中軍諾曼人、右翼法蘭德斯人,弓手與弩手在前,騎士在後。這一仗從早上九點打到天黑。",
  objectiveText: "守住山脊上哈羅德的王旗(金色旗幟三格)直到第 12 回合天黑,且哈羅德不能陣亡。",
  playerFaction: "saxon",
  enemyFaction: "norman",
  mapRows: [
    "ffff.hhh...ss.........",
    "fff..hhh..sss...f.....",
    "ff...hhh...s.....f....",
    "f....hhh..............",
    "f....hhh..............",
    "ff...hhh.........h....",
    "f....hhh........hhh...",
    "f...hhhh........hhh...",
    "f....hhh........hhh...",
    "ff...hhh.........h....",
    "f....hhh..............",
    "f....hhh..............",
    "ff...hhh...s.....f....",
    "fff..hhh..sss...ff....",
    "ffff.hhh...ss.........",
  ],
  playerDeploy: [[4, 7], [6, 6], [6, 8], [5, 7], [6, 9], [6, 4], [6, 11], [5, 5]],
  playerAiStance: "hold",
  playerFixed: [
    { typeId: "saxon-huscarl", level: 2, at: [6, 5], commanderId: "gyrth" },
    { typeId: "saxon-fyrd", level: 1, at: [6, 2] },
    { typeId: "saxon-fyrd", level: 1, at: [6, 12] },
    { typeId: "saxon-fyrd", level: 1, at: [6, 10] },
  ],
  enemies: [
    { typeId: "norman-knight", level: 3, at: [17, 7], commanderId: "william", stance: "reserve", activateTurn: 4 },
    { typeId: "norman-knight", level: 2, at: [19, 7], commanderId: "odo", stance: "reserve", activateTurn: 7 },
    { typeId: "norman-knight", level: 2, at: [16, 6], stance: "reserve", activateTurn: 4 },
    { typeId: "norman-breton", level: 2, at: [15, 2] },
    { typeId: "norman-breton", level: 1, at: [16, 3] },
    { typeId: "norman-infantry", level: 2, at: [13, 6] },
    { typeId: "norman-infantry", level: 2, at: [13, 8] },
    { typeId: "norman-infantry", level: 1, at: [14, 11] },
    { typeId: "norman-archer", level: 2, at: [12, 5] },
    { typeId: "norman-archer", level: 2, at: [12, 9] },
    { typeId: "norman-crossbow", level: 2, at: [12, 7] },
  ],
  victory: [{ kind: "holdUntil", turn: 12, hexes: [[5, 6], [5, 7], [5, 8]] }, { kind: "annihilate" }],
  defeat: [
    { kind: "commanderLost", commanderId: "harold" },
    { kind: "hexesLost", hexes: [[5, 6], [5, 7], [5, 8]] },
    { kind: "annihilated" },
  ],
  reward: 900,
  intro: [
    { speaker: "gyrth", text: "兄長,讓我來打這一仗。您若有閃失,英格蘭就沒有國王了。" },
    { speaker: "harold", text: "我怎能讓英格蘭人替我去死,自己卻站在後面看?盾牆,就排在這道山脊上。" },
    { speaker: "william", text: "他們占著高地,那就讓他們下來。弓手先射——騎士,等我的號令。" },
    { speaker: "odo", text: "願天主庇佑諾曼第。……還有,別讓那道盾牆有機會喘氣。" },
    { text: "上午九點,諾曼人的號角響徹山谷。" },
  ],
  outroVictory: [
    { text: "夕陽沉入安德列德森林。盾牆沒有破,王旗仍在山脊上飄揚。" },
    { speaker: "william", text: "……撤兵。今天的英格蘭,不屬於我。" },
    { speaker: "harold", text: "我們守住了。回家吧——英格蘭還是英格蘭人的。" },
    { text: "(史實上,哈羅德在黃昏時陣亡,威廉於聖誕節加冕為英格蘭國王。你改寫了歷史。)" },
  ],
  outroDefeat: [
    { text: "黃昏時分,盾牆終於崩潰。傳說一支箭射中了哈羅德的眼睛。" },
    { text: "1066 年聖誕節,威廉在西敏寺加冕——史稱「征服者威廉」。盎格魯-撒克遜的英格蘭,就此落幕。" },
  ],
};

export const WAR_1066: WarDef = {
  id: "war-1066",
  title: "1066 王冠之爭",
  subtitle: "一年、三王、三場決戰",
  years: "1066",
  playerFaction: "saxon",
  startGold: 200,
  mapArt: "war-1066.webp",
  startRoster: [
    { typeId: "saxon-huscarl", level: 4, xp: 40, soldiers: 22, commanderId: "harold" },
    { typeId: "saxon-huscarl", level: 2, xp: 8, soldiers: 18 },
    { typeId: "saxon-fyrd", level: 1, xp: 0, soldiers: 22 },
    { typeId: "saxon-fyrd", level: 1, xp: 0, soldiers: 22 },
    { typeId: "saxon-thegn", level: 1, xp: 0, soldiers: 12 },
    { typeId: "saxon-archer", level: 1, xp: 0, soldiers: 14 },
  ],
  battles: [
    { scenarioId: FULFORD.id, mapPos: { x: 36, y: 42 }, advanceOnDefeat: true },
    { scenarioId: STAMFORD.id, mapPos: { x: 45, y: 33 } },
    { scenarioId: HASTINGS.id, mapPos: { x: 47, y: 76 } },
  ],
  intro: [
    { text: "1066 年 1 月 5 日,懺悔者愛德華駕崩,沒有留下子嗣。" },
    { text: "賢人會議推舉威塞克斯伯爵哈羅德為王。但海峽對岸的諾曼第公爵威廉、北海彼岸的挪威王哈拉爾,都宣稱王冠屬於自己。" },
    { speaker: "harold", text: "王冠不是誰許諾的,是英格蘭人給的。那就讓我證明——我守得住它。" },
  ],
  epilogue: [
    { text: "這一年,英格蘭在九月與十月之間,接連面對兩支入侵大軍。" },
    { text: "無論結局如何,1066 年都是英格蘭歷史上最關鍵的一年。" },
  ],
};

export const SCENARIOS_1066: ScenarioDef[] = [FULFORD, STAMFORD, HASTINGS];
