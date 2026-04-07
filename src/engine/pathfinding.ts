/**
 * 路徑計算：
 *  - reachableRange(): 以 BFS/Dijkstra 計算某單位此回合能抵達的所有格
 *  - findPath(): A* 最短路徑（M2 才會用到，先實作 BFS 版）
 *
 * 地形成本來自 loadRules.getTerrain(..).moveCost
 * 阻擋條件：
 *  - 被其他單位佔據的格不能進入（除非為友軍，但仍不可停留）
 *  - moveCost >= 99 視為不可進入（例如城牆）
 *  - 若單位有 "cavalry" tag 且地形 blocksCavalry，亦不可進入
 */
import { hexKey, hexNeighbors, type Hex } from "./hex";
import type { GameState, Unit, UnitType } from "./types";
import { getTerrain, getUnitType } from "./loadRules";

export interface ReachableHex {
  pos: Hex;
  cost: number;
}

export function reachableRange(
  state: GameState,
  unit: Unit,
): ReachableHex[] {
  const unitType = getUnitType(unit.typeId);
  const maxMove = unitType.baseStats.move;

  // 場上所有被佔據的格（用於阻擋）
  const occupied = new Set(
    state.units
      .filter((u) => u.id !== unit.id && u.state !== "destroyed")
      .map((u) => hexKey(u.pos)),
  );

  // 合法地圖範圍（有地形定義才算在地圖上）
  const validHexes = new Set(Object.keys(state.scenario.terrain));

  // Dijkstra：cost 可能為小數（道路 0.5）
  const dist = new Map<string, number>();
  const startKey = hexKey(unit.pos);
  dist.set(startKey, 0);

  // 最小堆用簡單陣列替代（地圖小，不影響效能）
  const frontier: Array<{ pos: Hex; cost: number }> = [
    { pos: unit.pos, cost: 0 },
  ];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift()!;
    const currentKey = hexKey(current.pos);

    if (current.cost > (dist.get(currentKey) ?? Infinity)) continue;

    for (const neighbor of hexNeighbors(current.pos)) {
      const nKey = hexKey(neighbor);

      if (!validHexes.has(nKey)) continue;
      if (occupied.has(nKey)) continue;

      const terrainId = state.scenario.terrain[nKey];
      const terrain = getTerrain(terrainId);

      if (terrain.moveCost >= 99) continue;
      if (terrain.blocksCavalry && unitType.tags.includes("cavalry")) continue;

      const newCost = current.cost + terrain.moveCost;
      if (newCost > maxMove) continue;

      const existing = dist.get(nKey);
      if (existing === undefined || newCost < existing) {
        dist.set(nKey, newCost);
        frontier.push({ pos: neighbor, cost: newCost });
      }
    }
  }

  // 轉換為結果；排除起點（原地不能算移動目標）
  const result: ReachableHex[] = [];
  for (const [key, cost] of dist.entries()) {
    if (key === startKey) continue;
    const [q, r] = key.split(",").map(Number);
    result.push({ pos: { q, r }, cost });
  }
  return result;
}

/** 檢查某單位類型在某地形上的移動成本（未考慮佔據） */
export function moveCostFor(unitType: UnitType, terrainId: string): number {
  const terrain = getTerrain(terrainId);
  if (terrain.moveCost >= 99) return Infinity;
  if (terrain.blocksCavalry && unitType.tags.includes("cavalry")) return Infinity;
  return terrain.moveCost;
}
