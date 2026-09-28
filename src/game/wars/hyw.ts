/**
 * 百年戰爭(1337–1453)— 四場戰役
 *
 *   克雷西 (1346) → 普瓦捷 (1356) → 阿金庫爾 (1415) → 奧爾良之圍 (1429,貞德)
 *
 * 前三場扮演英格蘭:長弓對重騎兵的經典;第四場視角轉到法蘭西,由貞德扭轉戰局。
 * 指揮官依史實每場不同,以劇情固定部隊(playerFixed)上場;名冊是英軍常備部隊與前一時代傳來的老兵。
 *
 * 地圖字元:. 平原 h 丘陵 f 森林 s 沼澤 ~ 河 = 渡口 b 橋 v 村莊 m 泥濘田 x 木樁 g 樹籬 k 堡壘
 */
import type { ScenarioDef, WarDef } from "../types";

const WET = { label: "弓弦被雨淋濕 −40%", damageMul: 0.6, untilTurn: 3 };
const HEAVY_MUD = { label: "重甲陷入泥濘", damageMul: 0.9 };

export const CRECY: ScenarioDef = {
  id: "hyw-crecy",
  title: "克雷西之戰",
  date: "1346 年 8 月 26 日・克雷西森林外",
  art: "crecy.webp",
  briefing:
    "愛德華三世在諾曼第登陸後一路北撤,在克雷西與瓦迪庫爾之間的山脊上轉身迎戰。長弓手分列兩翼,騎士全部下馬,國王本人坐鎮後方的風車。午後一場暴雨剛停——熱那亞弩手的弓弦濕了,而英格蘭人把弓弦收在帽子裡。十六歲的黑太子,指揮最前線。",
  objectiveText: "守住山脊(金旗)直到第 12 回合,或擊敗法王腓力六世。黑太子與愛德華三世都不能陣亡。法軍騎士會一波一波衝上來。",
  playerFaction: "english",
  enemyFaction: "french",
  mapRows: [
    "~~~~~~~~~~~~~~~~~~~~~~",
    "fff.v...............f.",
    "ff..hhh............ff.",
    "f...hhh...............",
    "f..hhhh...............",
    "...hhhh........h......",
    "..hhhhh.......hh......",
    "..hhhhh.......hh......",
    "...hhhh........h......",
    "f..hhhh...............",
    "f...hhh...............",
    "ff..hhh............ff.",
    "fff.v.....s........f..",
    "ffff....sss...........",
  ],
  playerDeploy: [[5, 4], [5, 6], [5, 8], [5, 10], [4, 5], [4, 9], [6, 7], [4, 7]],
  playerAiStance: "hold",
  playerFixed: [
    { typeId: "eng-manatarms", level: 3, at: [3, 7], commanderId: "edward3" },
    { typeId: "eng-manatarms", level: 3, at: [5, 3], commanderId: "blackprince" },
  ],
  enemies: [
    { typeId: "genoese", level: 2, at: [12, 5], modifiers: [WET] },
    { typeId: "genoese", level: 2, at: [12, 7], modifiers: [WET] },
    { typeId: "fr-knight", level: 1, at: [16, 4] },
    { typeId: "fr-knight", level: 1, at: [16, 10] },
    { typeId: "fr-manatarms", level: 1, at: [17, 7] },
  ],
  reinforcements: [
    { turn: 3, side: "enemy", message: "法蘭西騎士等不及號令,第二波衝鋒從谷底湧上來!", squads: [
      { typeId: "fr-knight", level: 1, at: [21, 5] },
      { typeId: "fr-knight", level: 1, at: [21, 9] },
    ] },
    { turn: 5, side: "enemy", message: "盲眼的波希米亞王讓騎士把馬韁綁在一起,帶他衝進戰場!", squads: [
      { typeId: "fr-knight", level: 3, at: [21, 7], commanderId: "johnbohemia" },
      { typeId: "fr-knight", level: 2, at: [21, 6] },
    ] },
    { turn: 7, side: "enemy", message: "法王腓力六世親率王旗衛隊壓上!", squads: [
      { typeId: "fr-knight", level: 3, at: [21, 7], commanderId: "philip6" },
      { typeId: "fr-manatarms", level: 2, at: [21, 5] },
    ] },
  ],
  victory: [
    { kind: "holdUntil", turn: 12, hexes: [[5, 6], [5, 7], [5, 8]] },
    { kind: "killCommander", commanderId: "philip6" },
  ],
  defeat: [
    { kind: "commanderLost", commanderId: "blackprince" },
    { kind: "commanderLost", commanderId: "edward3" },
    { kind: "hexesLost", hexes: [[5, 6], [5, 7], [5, 8]] },
    { kind: "annihilated" },
  ],
  reward: 450,
  intro: [
    { text: "1346 年。愛德華三世宣稱自己才是法蘭西的合法國王——一場打了一百多年的戰爭,已經開始。" },
    { speaker: "edward3", text: "讓孩子贏得他的馬刺吧。前鋒交給太子,這一天的榮耀是他的。" },
    { speaker: "blackprince", text: "父王,您看著。長弓手——等騎士上坡,再放箭。" },
    { speaker: "philip6", text: "英格蘭人就在那裡!不必等了——騎士們,衝!" },
  ],
  outroVictory: [
    { text: "一千五百名法蘭西騎士倒在山坡上。盲王約翰的屍體與他綁在一起的騎士並排躺著。" },
    { speaker: "blackprince", text: "他的座右銘是「我服侍」……我會把它刻在我的紋章上。" },
    { text: "(史實:黑太子採用了盲王的鴕鳥羽毛與座右銘 Ich dien,至今仍是威爾斯親王的徽章。)" },
  ],
  outroDefeat: [{ text: "山脊失守。法蘭西騎士的衝鋒終究沖垮了長弓手——但歷史上,這一天屬於英格蘭。再試一次吧。" }],
};

export const POITIERS: ScenarioDef = {
  id: "hyw-poitiers",
  title: "普瓦捷之戰",
  date: "1356 年 9 月 19 日・普瓦捷南郊",
  art: "poitiers.webp",
  briefing:
    "十年後,黑太子帶著劫掠後滿載而歸的小部隊,被法王約翰二世的大軍堵在普瓦捷。他把陣地擺在樹籬後面,只留幾個缺口,側翼是沼澤。法軍這次學乖了——大部分騎士下馬徒步進攻。黑太子手上還藏著一張牌:布赫領主的小隊騎兵。",
  objectiveText: "擊敗(生擒)法王約翰二世,或殲滅法軍。黑太子不能陣亡。第 4 回合布赫領主從法軍背後殺出。",
  playerFaction: "english",
  enemyFaction: "french",
  mapRows: [
    "ffff..................",
    "fff....g..............",
    "ff.....g......f.......",
    "f......g.....fff......",
    "f......g..............",
    "f.....................",
    "f......g..............",
    "f......g..............",
    "f......g..............",
    "f.....................",
    "f.....sg.........h....",
    "ff...ssg........hh....",
    "fff.sssg..............",
    "ffssssss..............",
  ],
  playerDeploy: [[7, 3], [7, 6], [7, 8], [7, 11], [7, 4], [7, 7], [7, 10], [6, 5]],
  playerAiStance: "hold",
  playerFixed: [{ typeId: "eng-manatarms", level: 3, at: [3, 7], commanderId: "blackprince" }],
  enemies: [
    { typeId: "fr-knight", level: 1, at: [12, 4] },
    { typeId: "genoese", level: 1, at: [14, 7] },
    { typeId: "fr-manatarms", level: 2, at: [16, 6] },
    { typeId: "fr-manatarms", level: 2, at: [16, 8] },
  ],
  reinforcements: [
    { turn: 4, side: "enemy", message: "奧爾良公爵的第二陣徒步壓上來了。", squads: [
      { typeId: "fr-manatarms", level: 1, at: [21, 6] },
    ] },
    { turn: 4, side: "player", message: "號角從法軍背後響起——布赫領主的騎兵繞過山丘殺到!", squads: [
      { typeId: "eng-knight", level: 3, at: [20, 12], commanderId: "captal" },
      { typeId: "eng-hobelar", level: 2, at: [21, 11] },
      { typeId: "eng-knight", level: 2, at: [21, 13] },
    ] },
    { turn: 6, side: "enemy", message: "法王約翰二世親自手持戰斧,率最後一陣徒步衝鋒!", squads: [
      { typeId: "fr-manatarms", level: 3, at: [21, 7], commanderId: "john2" },
      { typeId: "fr-manatarms", level: 2, at: [21, 5] },
      { typeId: "fr-manatarms", level: 1, at: [21, 9] },
    ] },
  ],
  victory: [{ kind: "killCommander", commanderId: "john2" }, { kind: "annihilate" }],
  defeat: [{ kind: "commanderLost", commanderId: "blackprince" }, { kind: "annihilated" }],
  reward: 550,
  intro: [
    { speaker: "blackprince", text: "我們人少,又累,又被包圍。很好——他們一定以為我們會逃。" },
    { speaker: "captal", text: "殿下,給我六十騎。我從山丘後面繞過去,等您的信號。" },
    { speaker: "john2", text: "這次不重蹈克雷西的覆轍。下馬!徒步前進,穿過那道樹籬!" },
  ],
  outroVictory: [
    { text: "法王約翰二世被團團圍住,最後把手套交給了一名騎士——法蘭西國王被俘了。" },
    { speaker: "blackprince", text: "陛下,今晚請與我同桌。您是這場戰鬥中最勇敢的人。" },
  ],
  outroDefeat: [{ text: "英軍被樹籬後湧來的法蘭西重甲兵淹沒……史實上,黑太子在這一天生擒了法王。再試一次吧。" }],
};

export const AGINCOURT: ScenarioDef = {
  id: "hyw-agincourt",
  title: "阿金庫爾之戰",
  date: "1415 年 10 月 25 日・聖克里斯賓節",
  art: "agincourt.webp",
  briefing:
    "亨利五世的軍隊被痢疾拖垮,只剩六千人,在阿金庫爾被兩萬法軍擋住去路。戰場是兩片森林之間一條剛犁過、又下了一整夜雨的田地。長弓手在陣前插下削尖的木樁。法軍穿著全歐洲最好的板甲——然後走進了爛泥裡。",
  objectiveText: "撐過 12 回合、擊敗統帥達爾布雷,或殲滅法軍。亨利五世不能陣亡,中央木樁陣(金旗)不能被攻破。泥濘會拖慢重甲兵、騎兵衝不起來。",
  playerFaction: "english",
  enemyFaction: "french",
  mapRows: [
    "ffffffffffffffffffffff",
    "ffffffffffffffffffffff",
    "ffffffffffffffffffffff",
    "......x.mmmmmmmmm.....",
    "......x.mmmmmmmmm.....",
    "......x.mmmmmmmmm.....",
    ".v....x.mmmmmmmmm.....",
    ".v....x.mmmmmmmmm.....",
    "......x.mmmmmmmmm.....",
    "......x.mmmmmmmmm.....",
    "......x.mmmmmmmmm.....",
    "......x.mmmmmmmmm.....",
    "ffffffffffffffffffffff",
    "ffffffffffffffffffffff",
    "ffffffffffffffffffffff",
  ],
  playerDeploy: [[6, 4], [6, 6], [6, 8], [6, 10], [5, 5], [5, 9], [4, 7], [4, 5]],
  playerAiStance: "hold",
  playerFixed: [{ typeId: "eng-manatarms", level: 3, at: [3, 7], commanderId: "henry5" }],
  enemies: [
    { typeId: "fr-knight", level: 2, at: [18, 3] },
    { typeId: "fr-knight", level: 2, at: [18, 11] },
    { typeId: "fr-manatarms", level: 2, at: [17, 5], modifiers: [HEAVY_MUD] },
    { typeId: "fr-manatarms", level: 2, at: [17, 7], modifiers: [HEAVY_MUD] },
    { typeId: "fr-manatarms", level: 2, at: [17, 9], modifiers: [HEAVY_MUD] },
    { typeId: "fr-manatarms", level: 3, at: [19, 7], commanderId: "dalbret", modifiers: [HEAVY_MUD] },
    { typeId: "genoese", level: 1, at: [19, 5] },
    { typeId: "fr-manatarms", level: 2, at: [18, 6], modifiers: [HEAVY_MUD] },
    { typeId: "fr-manatarms", level: 2, at: [18, 8], modifiers: [HEAVY_MUD] },
  ],
  reinforcements: [
    { turn: 2, side: "enemy", message: "法軍前鋒的貴族爭先恐後地擠上來——人人都想站第一排。", squads: [
      { typeId: "fr-manatarms", level: 2, at: [21, 5], modifiers: [HEAVY_MUD] },
      { typeId: "fr-manatarms", level: 2, at: [21, 9], modifiers: [HEAVY_MUD] },
      { typeId: "fr-knight", level: 2, at: [21, 7] },
    ] },
    { turn: 4, side: "enemy", message: "法軍第二線擠進泥地,前後推擠成一團。", squads: [
      { typeId: "fr-manatarms", level: 2, at: [21, 6], modifiers: [HEAVY_MUD] },
      { typeId: "fr-manatarms", level: 2, at: [21, 8], modifiers: [HEAVY_MUD] },
      { typeId: "fr-manatarms", level: 2, at: [21, 10], modifiers: [HEAVY_MUD] },
      { typeId: "genoese", level: 2, at: [21, 4] },
    ] },
    { turn: 7, side: "enemy", message: "法軍第三線的騎士終於出動。", squads: [
      { typeId: "fr-knight", level: 3, at: [21, 5] },
      { typeId: "fr-knight", level: 3, at: [21, 9] },
      { typeId: "fr-manatarms", level: 3, at: [21, 7], modifiers: [HEAVY_MUD] },
      { typeId: "fr-manatarms", level: 2, at: [21, 3], modifiers: [HEAVY_MUD] },
    ] },
  ],
  victory: [
    { kind: "survive", turn: 12 },
    { kind: "killCommander", commanderId: "dalbret" },
    { kind: "annihilate" },
  ],
  defeat: [{ kind: "commanderLost", commanderId: "henry5" }, { kind: "hexesLost", hexes: [[6, 6], [6, 7], [6, 8]] }, { kind: "annihilated" }],
  reward: 700,
  intro: [
    { speaker: "henry5", text: "今天是聖克里斯賓節。今天與我一同流血的人,就是我的兄弟。" },
    { speaker: "dalbret", text: "他們病懨懨的,人又少。等他們先動——不,我們人多,直接壓過去。" },
    { speaker: "henry5", text: "旗手,前進!長弓手——插下木樁!" },
  ],
  outroVictory: [
    { text: "法蘭西貴族在泥濘中被自己人擠倒、被長弓射穿,死者成堆。" },
    { speaker: "henry5", text: "我們這一小群人,我們這一群幸運的兄弟……" },
    { text: "五年後,亨利五世成為法蘭西王位的繼承人。英格蘭似乎贏定了——直到一位少女出現。" },
  ],
  outroDefeat: [{ text: "法軍的人數終究壓垮了疲憊的英軍……史實上,這一天是英格蘭最輝煌的勝利之一。再試一次吧。" }],
};

export const ORLEANS: ScenarioDef = {
  id: "hyw-orleans",
  title: "奧爾良之圍",
  date: "1429 年 5 月 7 日・圖雷勒堡",
  art: "orleans.webp",
  briefing:
    "英軍圍困奧爾良已經半年,法蘭西眼看就要亡國。一位十七歲的農家少女來到王太子面前,說天使要她解救奧爾良。現在她穿著白色盔甲、舉著百合旗,站在南岸圖雷勒堡壘前。守將格拉斯戴爾在城牆上咒罵她——她回答:「投降吧,否則你會死。」",
  objectiveText: "(本戰你指揮法軍)攻下圖雷勒堡:同時占領兩格堡壘金旗。貞德不能陣亡,限 14 回合。",
  playerFaction: "french",
  enemyFaction: "english",
  useRoster: false,
  mapRows: [
    "~~~~~~~~~~~~~~~b~~~~~~",
    "~~~~~~~~~~~~~~~b~~~~~~",
    "......................",
    "...ff..............v..",
    "...f..................",
    ".............x........",
    ".............x.kk.....",
    ".............x.kk.....",
    ".............x.kk.....",
    ".............x........",
    "....f..............v..",
    "...ff.................",
    "...f..............ss..",
    ".................sss..",
  ],
  playerFixed: [
    { typeId: "fr-manatarms", level: 3, at: [3, 7], commanderId: "joan" },
    { typeId: "fr-knight", level: 3, at: [2, 8], commanderId: "dunois" },
    { typeId: "fr-manatarms", level: 2, at: [4, 6] },
    { typeId: "fr-manatarms", level: 2, at: [4, 8] },
    { typeId: "fr-militia", level: 2, at: [5, 5] },
    { typeId: "fr-militia", level: 2, at: [5, 9] },
    { typeId: "fr-militia", level: 1, at: [5, 7] },
    { typeId: "genoese", level: 2, at: [2, 6] },
  ],
  enemies: [
    { typeId: "eng-manatarms", level: 3, at: [16, 7], commanderId: "glasdale", stance: "hold" },
    { typeId: "eng-longbow", level: 2, at: [15, 6], stance: "hold" },
    { typeId: "eng-longbow", level: 2, at: [15, 8], stance: "hold" },
    { typeId: "eng-billman", level: 2, at: [13, 6], stance: "hold" },
    { typeId: "eng-billman", level: 2, at: [13, 8], stance: "hold" },
    { typeId: "eng-manatarms", level: 2, at: [14, 7], stance: "hold" },
  ],
  reinforcements: [
    { turn: 5, side: "enemy", message: "英軍從北岸經橋上增援圖雷勒堡。", squads: [
      { typeId: "eng-longbow", level: 2, at: [15, 2] },
      { typeId: "eng-manatarms", level: 2, at: [16, 2] },
    ] },
    { turn: 8, side: "player", message: "貞德被箭射中肩膀,拔出箭頭後又回到最前線!奧爾良城的民兵受到鼓舞,紛紛趕來。", squads: [
      { typeId: "fr-militia", level: 2, at: [0, 7] },
      { typeId: "fr-militia", level: 2, at: [0, 9] },
    ] },
  ],
  victory: [{ kind: "capture", hexes: [[15, 7], [16, 7]] }, { kind: "annihilate" }],
  defeat: [{ kind: "commanderLost", commanderId: "joan" }, { kind: "annihilated" }, { kind: "timeout", turn: 14 }],
  reward: 800,
  intro: [
    { text: "1429 年。十四年過去,亨利五世已死,英軍深入法蘭西腹地,奧爾良是最後的門戶。" },
    { speaker: "dunois", text: "……你真的要走在最前面?箭可是不長眼的。" },
    { speaker: "joan", text: "上帝會眷顧我們。跟著我的旗子走——今天,奧爾良就會得救。" },
    { speaker: "glasdale", text: "一個放牛的丫頭也敢來攻堡?抓到她,就把她燒死!" },
  ],
  outroVictory: [
    { text: "黃昏時分,百合旗插上了圖雷勒堡。格拉斯戴爾在撤退時連人帶甲落入羅亞爾河。" },
    { speaker: "joan", text: "奧爾良自由了。接下來——去蘭斯,讓王太子加冕。" },
    { text: "英軍隔天撤圍。百年戰爭的潮水,從這一天開始倒流。" },
  ],
  outroDefeat: [{ text: "攻勢在堡壘前受挫……史實上,貞德在這一天攻下了圖雷勒堡。再試一次吧。" }],
};

export const WAR_HYW: WarDef = {
  id: "war-hyw",
  title: "百年戰爭",
  subtitle: "長弓、泥濘,與奧爾良的少女",
  years: "1346–1429",
  playerFaction: "english",
  startGold: 250,
  mapArt: "war-hyw.webp",
  prevWar: "war-1066",
  relic: "maid-banner",
  startRoster: [
    { typeId: "eng-longbow", level: 2, xp: 8, soldiers: 16 },
    { typeId: "eng-longbow", level: 2, xp: 8, soldiers: 16 },
    { typeId: "eng-manatarms", level: 2, xp: 8, soldiers: 18 },
    { typeId: "eng-billman", level: 1, xp: 0, soldiers: 20 },
    { typeId: "eng-billman", level: 1, xp: 0, soldiers: 20 },
    { typeId: "eng-hobelar", level: 1, xp: 0, soldiers: 12 },
  ],
  battles: [
    { scenarioId: CRECY.id, mapPos: { x: 42, y: 24 } },
    { scenarioId: POITIERS.id, mapPos: { x: 35, y: 60 } },
    { scenarioId: AGINCOURT.id, mapPos: { x: 45, y: 18 } },
    { scenarioId: ORLEANS.id, mapPos: { x: 46, y: 45 } },
  ],
  intro: [
    { text: "1337 年,英格蘭國王愛德華三世宣稱法蘭西王位屬於自己。" },
    { text: "接下來的一百多年,兩國打了一場又一場的仗。英格蘭人有一樣法蘭西人沒有的武器:長弓。" },
    { speaker: "edward3", text: "法蘭西的騎士很驕傲。驕傲的人,不看腳下的泥巴。" },
  ],
  epilogue: [
    { text: "1453 年,英格蘭失去了在法蘭西大陸上的幾乎所有領地。百年戰爭結束。" },
    { text: "長弓讓騎士的時代走向黃昏;而一位少女證明了,信念也能改變戰局。" },
  ],
};

export const SCENARIOS_HYW: ScenarioDef[] = [CRECY, POITIERS, AGINCOURT, ORLEANS];
