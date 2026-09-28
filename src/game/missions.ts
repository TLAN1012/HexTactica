/**
 * 奇幻外傳:原本的 10 關獸人戰役(種子隨機地圖、全滅勝)。
 * 載入時由 scenarios.ts 轉成 ScenarioDef,跑新引擎。
 */
import type { MissionDef } from "./types";

export const MISSIONS: MissionDef[] = [
  {
    id: "m01", index: 1, title: "邊境哨站",
    briefing: "碎顱氏族的獸人燒了河谷的哨站。帶上你的第一批兵,把殘餘的綠皮趕出去 — 這是你成為戰團指揮官的第一戰。",
    mapSeed: 101, mapWidth: 11, mapHeight: 8,
    enemies: [
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-warrior", level: 1 },
    ],
    reward: 180,
  },
  {
    id: "m02", index: 2, title: "磨坊之爭",
    briefing: "獸人盯上了磨坊的存糧,這次還帶了射手。記住:近戰會挨反擊,先用自己的遠程削弱他們。",
    mapSeed: 202, mapWidth: 12, mapHeight: 8,
    enemies: [
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-archer", level: 1 },
    ],
    reward: 220,
  },
  {
    id: "m03", index: 3, title: "淺灘伏擊",
    briefing: "斥候回報座狼騎兵在淺灘附近遊蕩。長槍兵能先制反擊並克制騎兵 — 讓狼撞上槍陣。",
    mapSeed: 303, mapWidth: 12, mapHeight: 9,
    enemies: [
      { typeId: "wolf-rider", level: 1 },
      { typeId: "orc-warrior", level: 1 },
      { typeId: "orc-warrior", level: 2 },
    ],
    reward: 260,
  },
  {
    id: "m04", index: 4, title: "焦土村莊",
    briefing: "他們開始成建制行動了:步弓混編、有人指揮。奪回村莊,別讓弓手站著白射 — 用騎兵繞過去。",
    mapSeed: 404, mapWidth: 13, mapHeight: 9,
    enemies: [
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-impaler", level: 1 },
      { typeId: "orc-archer", level: 1 },
      { typeId: "orc-archer", level: 1 },
    ],
    reward: 320,
  },
  {
    id: "m05", index: 5, title: "林道遭遇",
    briefing: "護送商隊穿越林道時撞上氏族主力的前鋒。森林能提供 25% 減傷 — 誰先佔住樹林,誰就佔便宜。",
    mapSeed: 505, mapWidth: 13, mapHeight: 9,
    enemies: [
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-axethrower", level: 2 },
      { typeId: "wolf-rider", level: 2 },
    ],
    reward: 380,
  },
  {
    id: "m06", index: 6, title: "斷橋防線",
    briefing: "獸人要渡河突襲糧倉,渡口只有一兩處。用地形卡住渡口,讓綠皮一隊一隊排隊送死。",
    mapSeed: 616, mapWidth: 14, mapHeight: 9,
    enemies: [
      { typeId: "orc-impaler", level: 2 },
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-archer", level: 2 },
      { typeId: "orc-archer", level: 2 },
      { typeId: "orc-axethrower", level: 1 },
    ],
    reward: 450,
  },
  {
    id: "m07", index: 7, title: "鐵蹄突襲",
    briefing: "座狼群和披甲巨魔湊成一支矛頭,打算一波沖垮我們。槍陣立正面、弓手置後排,反衝鋒的時機由你決定。",
    mapSeed: 707, mapWidth: 14, mapHeight: 10,
    enemies: [
      { typeId: "troll-crusher", level: 1 },
      { typeId: "wolf-rider", level: 2 },
      { typeId: "wolf-rider", level: 2 },
      { typeId: "orc-warrior", level: 2 },
      { typeId: "orc-impaler", level: 2 },
    ],
    reward: 550,
  },
  {
    id: "m08", index: 8, title: "長弓之雨",
    briefing: "碎顱氏族帶來了巨魔投石手,巨石覆蓋半個戰場。躲在丘陵後推進,騎兵必須在兩回合內摸到他們。",
    mapSeed: 808, mapWidth: 15, mapHeight: 10,
    enemies: [
      { typeId: "troll-slinger", level: 2 },
      { typeId: "troll-slinger", level: 2 },
      { typeId: "orc-impaler", level: 2 },
      { typeId: "orc-impaler", level: 2 },
      { typeId: "orc-warrior", level: 3 },
      { typeId: "orc-warrior", level: 2 },
    ],
    reward: 700,
  },
  {
    id: "m09", index: 9, title: "碎顱大營",
    briefing: "直搗碎顱氏族大營。獸人傾巢而出,步、弓、狼騎俱全 — 這是總攻前最後的硬仗,別留手。",
    mapSeed: 909, mapWidth: 15, mapHeight: 10,
    enemies: [
      { typeId: "orc-warrior", level: 3 },
      { typeId: "orc-impaler", level: 3 },
      { typeId: "orc-archer", level: 3 },
      { typeId: "troll-slinger", level: 2 },
      { typeId: "wolf-rider", level: 3 },
      { typeId: "troll-crusher", level: 2 },
    ],
    reward: 900,
  },
  {
    id: "m10", index: 10, title: "碎顱大酋長",
    briefing: "大酋長親率披甲巨魔親衛出戰。巨魔的衝撞能踏平一切 — 但你已經知道怎麼接衝鋒了,對吧?終結這場戰爭。",
    mapSeed: 1010, mapWidth: 16, mapHeight: 10,
    enemies: [
      { typeId: "troll-crusher", level: 3 },
      { typeId: "troll-crusher", level: 3 },
      { typeId: "orc-impaler", level: 3 },
      { typeId: "orc-warrior", level: 4 },
      { typeId: "orc-warrior", level: 3 },
      { typeId: "troll-slinger", level: 3 },
    ],
    reward: 1500,
  },
];
