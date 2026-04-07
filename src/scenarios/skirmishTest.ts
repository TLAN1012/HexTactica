/**
 * M1 測試場景：前哨遭遇戰
 * 20×12 地圖（16:9 比例），混合地形，雙方各 4 支部隊。
 *
 * 之所以用程式碼生成而非純 JSON：一張 20×12 = 240 格地形用 JSON 寫會極冗長，
 * 歷史場景等 M6 確定格式後會有適當的 level editor 或壓縮格式。
 */
import { hexKey, rectangleMap, type Hex } from "../engine/hex";
import type { Scenario, Unit } from "../engine/types";

const WIDTH = 20;
const HEIGHT = 12;

/** 基於 (q,r) 的確定性偽亂數，用於可重現地形 */
function seededRandom(q: number, r: number, seed: number): number {
  const x = Math.sin(q * 374761393 + r * 668265263 + seed * 2147483647) * 10000;
  return x - Math.floor(x);
}

function pickTerrain(h: Hex): string {
  const { q, r } = h;

  // 上下邊緣森林（提供地形多樣）
  if (r === 0 || r === HEIGHT - 1) {
    if (seededRandom(q, r, 1) > 0.4) return "forest";
  }

  // 左右一座丘陵（符合歷史戰場典型）
  if ((q <= 2 || q >= WIDTH - 3) && r >= 3 && r <= HEIGHT - 4) {
    if (seededRandom(q, r, 2) > 0.5) return "hills";
  }

  // 中央橫貫一條淺溪
  if (r === Math.floor(HEIGHT / 2) - 1 && q >= 5 && q <= WIDTH - 5) {
    if (seededRandom(q, r, 3) > 0.3) return "river";
  }

  // 左側一個村落
  if (q === 4 && r === 5) return "village";
  if (q === 15 && r === 6) return "village";

  // 零散沼澤
  if (seededRandom(q, r, 4) > 0.96) return "swamp";

  // 零散森林點
  if (seededRandom(q, r, 5) > 0.92) return "forest";

  return "plains";
}

function buildTerrain(): { [hexKey: string]: string } {
  const terrain: { [hexKey: string]: string } = {};
  for (const h of rectangleMap(WIDTH, HEIGHT)) {
    terrain[hexKey(h)] = pickTerrain(h);
  }
  return terrain;
}

function buildInitialUnits(): Scenario["initialUnits"] {
  // 紅軍部署左側，藍軍部署右側
  const units: Scenario["initialUnits"] = [
    // 紅軍
    unit("r1", "heavy-cavalry", "red", 2, 3),
    unit("r2", "infantry", "red", 2, 5),
    unit("r3", "spearman", "red", 2, 7),
    unit("r4", "archer", "red", 1, 6),
    unit("r5", "velite", "red", 3, 4),
    // 藍軍
    unit("b1", "heavy-cavalry", "blue", 17, 3),
    unit("b2", "infantry", "blue", 17, 5),
    unit("b3", "longbow", "blue", 18, 6),
    unit("b4", "light-cavalry", "blue", 17, 8),
    unit("b5", "velite", "blue", 16, 7),
  ];
  return units;
}

function unit(
  id: string,
  typeId: string,
  sideId: string,
  q: number,
  r: number,
): Omit<Unit, "hasActedThisTurn" | "state" | "currentStrength" | "currentMorale"> {
  return {
    id,
    typeId,
    sideId,
    pos: { q, r },
    facing: { q: sideId === "red" ? 1 : -1, r: 0 },
  };
}

export function buildSkirmishScenario(): Scenario {
  return {
    id: "skirmish-test",
    name: "前哨遭遇戰（M1 測試）",
    date: "M1-placeholder",
    mapWidth: WIDTH,
    mapHeight: HEIGHT,
    weather: "clear",
    terrain: buildTerrain(),
    sides: [
      { id: "red", name: "紅軍", color: "#a01818", controller: "human" },
      {
        id: "blue",
        name: "藍軍",
        color: "#1e3a8a",
        controller: "ai",
        aiDifficulty: "easy",
      },
    ],
    initialUnits: buildInitialUnits(),
    victoryConditions: { type: "rout", routThreshold: 0.6 },
    historicalNotes:
      "M1 測試場景：驗證地圖渲染、地形成本、單位放置與移動範圍計算。",
  };
}
