/**
 * 教學課程 — 一場固定的小戰鬥 + 依戰場狀態自動推進的步驟卡。
 * 設計原則:一次只講一件事、句子短、下一步永遠明確
 * (對初學者與需要清楚結構的孩子都友善)。
 */
import type { BattleState, MissionDef, RosterSquad } from "./types";
import { maxSoldiers } from "./progression";

export const TUTORIAL_MISSION: MissionDef = {
  id: "tutorial",
  index: 0,
  title: "訓練場",
  briefing: "老兵教頭帶你熟悉戰場。",
  mapSeed: 42,
  mapWidth: 9,
  mapHeight: 7,
  enemies: [
    { typeId: "orc-warrior", level: 1 },
    { typeId: "orc-archer", level: 1 },
  ],
  reward: 0,
};

/** 教學用臨時名冊(與戰役名冊無關,打完不留任何影響) */
export function tutorialRoster(): RosterSquad[] {
  return [
    { id: "tut-inf", typeId: "infantry", level: 1, xp: 0, soldiers: maxSoldiers("infantry", 1) },
    { id: "tut-arc", typeId: "archer", level: 1, xp: 0, soldiers: maxSoldiers("archer", 1) },
  ];
}

export interface TutorialStep {
  title: string;
  text: string;
  /** 回傳 true 表示此步驟已完成,前進到下一步 */
  done: (b: BattleState) => boolean;
}

const playerMoved = (b: BattleState) =>
  b.log.some((e) => e.kind === "move" && e.text.startsWith("我方"));
const playerAttacked = (b: BattleState) =>
  b.log.some((e) => e.kind === "attack" && e.text.startsWith("我方"));
const enemyTurnStarted = (b: BattleState) =>
  b.activeSide === "enemy" || b.turn >= 2 || b.outcome !== "ongoing";
const backToPlayer = (b: BattleState) =>
  (b.turn >= 2 && b.activeSide === "player") || b.outcome !== "ongoing";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "1|移動",
    text: "點一下藍框的劍盾兵。黃色格子是它走得到的地方 — 點一個黃格,讓它往獸人走。",
    done: playerMoved,
  },
  {
    title: "2|攻擊",
    text: "選一支部隊,然後直接點紅框的獸人 — 部隊會自己走過去打。出手前上方會先告訴你「大概能打倒幾個人」。",
    done: playerAttacked,
  },
  {
    title: "3|反擊",
    text: "看到戰鬥紀錄了嗎?用刀劍近身打,對方會反擊回來;用弓箭遠遠射就不會挨反擊。讓弓兵在後面射,劍盾兵在前面擋。",
    done: enemyTurnStarted,
  },
  {
    title: "4|換對方",
    text: "所有部隊都動完後,按右下角「結束回合」。現在輪到獸人行動 — 看著就好。",
    done: backToPlayer,
  },
  {
    title: "5|獲勝",
    text: "很好!繼續指揮:每回合每支部隊都能「移動+攻擊」一次。把獸人全部打倒就贏了!",
    done: (b) => b.outcome === "victory",
  },
];

export const TUTORIAL_FINALE = {
  victory: {
    title: "🏆|教學完成",
    text: "你已經學會打仗了!記住最後一件事:戰死的士兵不會自己回來 — 每場仗打完,回「軍營」花金幣補兵,再去接下一關。",
  },
  defeat: {
    title: "💀|再試一次",
    text: "沒關係,教頭說輸了才記得住:近戰會被反擊、弓兵要躲在後面。再開一次教學試試看!",
  },
};
