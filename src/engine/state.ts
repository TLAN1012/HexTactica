/**
 * GameState 建立與 reducer。
 * M1 只需要：
 *   - initGameState(scenario) 從 scenario 建立初始 GameState
 *   - reducer 處理：選單位、移動
 *
 * M2+ 會加入：射擊、近戰、士氣檢定、切換陣營、回合階段推進
 */
import { hexKey, type Hex } from "./hex";
import type {
  GameState,
  Scenario,
  Unit,
} from "./types";
import { getUnitType } from "./loadRules";
import { resolveAttack, type AttackType } from "./combat";

export function initGameState(scenario: Scenario): GameState {
  const units: Unit[] = scenario.initialUnits.map((u) => {
    const type = getUnitType(u.typeId);
    // Velite 起始於 "ready"，其餘 "idle"
    const initialState = type.stateMachine === "velite" ? "ready" : "idle";
    return {
      ...u,
      state: initialState,
      currentStrength: type.baseStats.strength,
      currentMorale: type.baseStats.morale,
      hasActedThisTurn: false,
    };
  });

  return {
    scenario,
    turn: 1,
    activeSideId: scenario.sides[0]?.id ?? "",
    phase: "command",
    units,
    combatLog: [],
    weather: scenario.weather,
  };
}

// ═════════════════════════════════════════════════════
// Actions
// ═════════════════════════════════════════════════════

export type GameAction =
  | { type: "SELECT_UNIT"; unitId: string | null }
  | { type: "MOVE_UNIT"; unitId: string; to: Hex }
  | { type: "ATTACK_UNIT"; attackerId: string; defenderId: string; attackType: AttackType }
  | { type: "END_TURN" };

// UI 選取狀態獨立於引擎 state，放在一個簡單的 slice
export interface UISelection {
  selectedUnitId: string | null;
  hoveredHex: Hex | null;
}

export const initialSelection: UISelection = {
  selectedUnitId: null,
  hoveredHex: null,
};

// ═════════════════════════════════════════════════════
// Reducer (M1 最小子集)
// ═════════════════════════════════════════════════════

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SELECT_UNIT":
      // 選取本身不改 GameState；留給 UISelection 管
      return state;

    case "MOVE_UNIT": {
      const idx = state.units.findIndex((u) => u.id === action.unitId);
      if (idx < 0) return state;
      const unit = state.units[idx];
      if (unit.hasActedThisTurn) return state;

      const newUnit: Unit = {
        ...unit,
        pos: action.to,
        hasActedThisTurn: true,
      };
      const newUnits = [...state.units];
      newUnits[idx] = newUnit;

      return {
        ...state,
        units: newUnits,
        combatLog: [
          ...state.combatLog,
          {
            turn: state.turn,
            phase: state.phase,
            attackerId: action.unitId,
            message: `${unit.id} 移動到 ${hexKey(action.to)}`,
          },
        ],
      };
    }

    case "ATTACK_UNIT": {
      const attackerIdx = state.units.findIndex((u) => u.id === action.attackerId);
      const defenderIdx = state.units.findIndex((u) => u.id === action.defenderId);
      if (attackerIdx < 0 || defenderIdx < 0) return state;
      if (state.units[attackerIdx].hasActedThisTurn) return state;

      const result = resolveAttack(
        state,
        action.attackerId,
        action.defenderId,
        action.attackType,
      );

      const newUnits = [...state.units];
      // 更新攻擊方：已行動
      newUnits[attackerIdx] = {
        ...newUnits[attackerIdx],
        hasActedThisTurn: true,
      };
      // 更新防禦方：扣兵力、必要時死亡
      const defender = newUnits[defenderIdx];
      const newStrength = Math.max(0, defender.currentStrength - result.damage);
      newUnits[defenderIdx] = {
        ...defender,
        currentStrength: newStrength,
        state: newStrength <= 0 ? "destroyed" : defender.state,
      };

      return {
        ...state,
        units: newUnits,
        combatLog: [
          ...state.combatLog,
          {
            turn: state.turn,
            phase: state.phase,
            attackerId: action.attackerId,
            defenderId: action.defenderId,
            diceRoll: [result.diceRoll[0], result.diceRoll[1]],
            modifiers: result.modifiers,
            damage: result.damage,
            moraleTriggered: result.moraleTriggered,
            message: result.log,
          },
        ],
      };
    }

    case "END_TURN": {
      // 切換到下一個陣營；所有單位 hasActedThisTurn 重置為 false
      const sides = state.scenario.sides;
      const currentIdx = sides.findIndex((s) => s.id === state.activeSideId);
      const nextIdx = (currentIdx + 1) % sides.length;
      const nextSideId = sides[nextIdx].id;
      const nextTurn = nextIdx === 0 ? state.turn + 1 : state.turn;

      return {
        ...state,
        turn: nextTurn,
        activeSideId: nextSideId,
        phase: "command",
        units: state.units.map((u) => ({ ...u, hasActedThisTurn: false })),
      };
    }

    default:
      return state;
  }
}

export function getActiveSideUnits(state: GameState): Unit[] {
  return state.units.filter(
    (u) => u.sideId === state.activeSideId && u.state !== "destroyed",
  );
}

export function findUnitAt(state: GameState, pos: Hex): Unit | undefined {
  return state.units.find(
    (u) => u.pos.q === pos.q && u.pos.r === pos.r && u.state !== "destroyed",
  );
}
