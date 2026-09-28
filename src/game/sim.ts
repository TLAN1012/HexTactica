/**
 * 自動對戰模擬:雙方都交給 AI 打完一場,用於測試與平衡調校。
 * 玩家方 AI 技巧預設 0.75(模擬「普通玩家」),敵方依難度。
 */
import { chooseAiAction } from "./ai";
import { battleReducer, initBattle } from "./battle";
import { seededRng } from "./maps";
import type { BattleState, DifficultyId, RosterSquad, ScenarioDef } from "./types";

export interface SimResult {
  outcome: BattleState["outcome"];
  reason?: string;
  turns: number;
  final: BattleState;
  actions: number;
}

export function simulateBattle(
  scenario: ScenarioDef,
  roster: RosterSquad[],
  difficulty: DifficultyId,
  seed: number,
  playerSkill = 0.75,
  maxTurns = 30,
): SimResult {
  const rng = seededRng(seed);
  let state = initBattle(scenario, roster, difficulty);
  let actions = 0;
  while (state.outcome === "ongoing" && state.turn <= maxTurns) {
    const side = state.activeSide;
    let guard = 0;
    while (state.outcome === "ongoing" && state.activeSide === side && guard++ < 200) {
      const action = chooseAiAction(state, side, { skill: side === "player" ? playerSkill : undefined, rng });
      const next = battleReducer(state, action ?? { type: "END_TURN" }, rng);
      actions++;
      if (next === state) {
        // AI 給了無效動作:保險起見結束回合(測試會抓這種情況)
        state = battleReducer(state, { type: "END_TURN" }, rng);
        break;
      }
      state = next;
    }
  }
  return { outcome: state.outcome, reason: state.outcomeReason, turns: state.turn, final: state, actions };
}
