/**
 * 難度:同一張地圖、同一批敵軍,靠四個旋鈕調整手感。
 *  - 敵軍數值倍率與等級加值(硬實力)
 *  - AI 技巧(會不會集火、會不會躲威脅、失誤率)
 *  - 獎金倍率(經營的寬裕程度)
 *  - 見習難度允許悔棋
 */
import type { DifficultyDef, DifficultyId } from "./types";

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "squire",
    name: "見習",
    desc: "第一次玩戰棋。敵軍較弱、AI 常失誤、獎金多,而且可以悔棋。",
    enemyStatMul: 0.85,
    enemyLevelBonus: 0,
    aiSkill: 0.35,
    goldMul: 1.3,
    allowUndo: true,
  },
  {
    id: "knight",
    name: "騎士",
    desc: "標準難度。AI 會集火、會保護弓手,但偶爾貪心。",
    enemyStatMul: 1,
    enemyLevelBonus: 0,
    aiSkill: 0.75,
    goldMul: 1,
    allowUndo: false,
  },
  {
    id: "lord",
    name: "領主",
    desc: "AI 會評估你的威脅範圍、不白白送頭,敵軍多一級。",
    enemyStatMul: 1.05,
    enemyLevelBonus: 1,
    aiSkill: 0.95,
    goldMul: 0.9,
    allowUndo: false,
  },
  {
    id: "legend",
    name: "傳奇",
    desc: "史詩難度:敵軍更強更精,錢更少。每一格站位都要算。",
    enemyStatMul: 1.15,
    enemyLevelBonus: 1,
    aiSkill: 1,
    goldMul: 0.75,
    allowUndo: false,
  },
];

const byId = new Map(DIFFICULTIES.map((d) => [d.id, d]));

export function getDifficulty(id: DifficultyId): DifficultyDef {
  return byId.get(id) ?? byId.get("knight")!;
}
