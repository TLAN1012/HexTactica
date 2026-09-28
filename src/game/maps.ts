/**
 * 地圖:
 *  - 歷史戰役用「手繪地圖」:每列一個字串、每個字元一格地形(TERRAIN_CHARS),照真實戰場畫
 *  - 奇幻外傳沿用種子隨機地圖,同一關每次進入都長一樣
 *
 * 座標:手繪地圖與劇本裡的位置用 offset「欄, 列」(Cell),和字串位置一一對應;
 * 引擎內部一律用 axial (q, r)。rectangleMap 的排法是 q = 欄 − floor(列/2)。
 */
import { hexKey, rectangleMap, type Hex } from "../engine/hex";
import type { Cell } from "./types";

/** 手繪地圖字元 → 地形 id */
export const TERRAIN_CHARS: Record<string, string> = {
  ".": "plains",
  h: "hills",
  f: "forest",
  s: "swamp",
  "~": "river",
  "=": "ford",
  b: "bridge",
  v: "village",
};

export function cellToHex([col, row]: Cell): Hex {
  return { q: col - Math.floor(row / 2), r: row };
}

export function hexToCell(h: Hex): Cell {
  return [h.q + Math.floor(h.r / 2), h.r];
}

/** 解析手繪地圖;字元不認得、列長不一致都直接丟錯(讓劇本測試抓到) */
export function parseMapRows(rows: string[]): GeneratedMap {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const terrain: Record<string, string> = {};
  const hexes: Hex[] = [];
  rows.forEach((line, row) => {
    if (line.length !== width) throw new Error(`地圖第 ${row} 列長度 ${line.length} ≠ ${width}`);
    [...line].forEach((ch, col) => {
      const id = TERRAIN_CHARS[ch];
      if (!id) throw new Error(`地圖第 ${row} 列第 ${col} 欄:不認得的字元「${ch}」`);
      const h = cellToHex([col, row]);
      terrain[hexKey(h)] = id;
      hexes.push(h);
    });
  });
  return { terrain, hexes, width, height };
}

/** mulberry32 — 種子式 PRNG,確保關卡地圖固定 */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GeneratedMap {
  terrain: Record<string, string>;
  hexes: Hex[];
  width: number;
  height: number;
}

/**
 * 佈局規則:
 *  - 兩側各留 2 欄開闊地當出兵區,不放不可通行地形
 *  - 中央撒森林/丘陵叢、少量沼澤,偶爾一條蜿蜒深水
 */
export function generateMap(seed: number, width: number, height: number): GeneratedMap {
  const rng = seededRng(seed);
  const hexes = rectangleMap(width, height);
  const terrain: Record<string, string> = {};

  // 以 offset 座標(col = q + floor(r/2))判斷左右出兵區
  const colOf = (h: Hex) => h.q + Math.floor(h.r / 2);

  for (const h of hexes) {
    terrain[hexKey(h)] = "plains";
  }

  // 中央地形叢:森林與丘陵各撒 3~5 叢
  const clusters = 6 + Math.floor(rng() * 3);
  for (let c = 0; c < clusters; c++) {
    const kind = rng() < 0.55 ? "forest" : rng() < 0.75 ? "hills" : "swamp";
    const cx = 3 + Math.floor(rng() * (width - 6));
    const cy = Math.floor(rng() * height);
    const size = 2 + Math.floor(rng() * 4);
    // 從中心向外隨機擴散
    let placed = 0;
    const queue: Hex[] = [];
    const start = hexes.find((h) => colOf(h) === cx && h.r === cy);
    if (start) queue.push(start);
    while (queue.length > 0 && placed < size) {
      const cur = queue.shift()!;
      const col = colOf(cur);
      if (col < 2 || col > width - 3) continue; // 出兵區保持開闊
      terrain[hexKey(cur)] = kind;
      placed++;
      for (const d of [
        { q: 1, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 1 },
        { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 },
      ]) {
        if (rng() < 0.5) {
          const n = { q: cur.q + d.q, r: cur.r + d.r };
          if (terrain[hexKey(n)] !== undefined) queue.push(n);
        }
      }
    }
  }

  // 30% 機率有一條縱向深水河(留 1~2 個渡口)
  if (rng() < 0.3) {
    const riverCol = Math.floor(width * (0.35 + rng() * 0.3));
    const fordRows = new Set<number>();
    fordRows.add(Math.floor(rng() * height));
    fordRows.add(Math.floor(rng() * height));
    for (const h of hexes) {
      if (colOf(h) === riverCol && !fordRows.has(h.r)) {
        terrain[hexKey(h)] = "river";
      }
    }
  }

  return { terrain, hexes, width, height };
}

/** 佈署格:左側兩欄給玩家、右側兩欄給敵軍,由上往下排 */
export function deploymentHexes(
  map: GeneratedMap,
  side: "player" | "enemy",
  count: number,
): Hex[] {
  const colOf = (h: Hex) => h.q + Math.floor(h.r / 2);
  const cols = side === "player" ? [0, 1] : [map.width - 1, map.width - 2];
  const midRow = (map.height - 1) / 2;
  const candidates = map.hexes
    .filter((h) => cols.includes(colOf(h)))
    .sort(
      (a, b) =>
        Math.abs(a.r - midRow) - Math.abs(b.r - midRow) ||
        (side === "player" ? colOf(a) - colOf(b) : colOf(b) - colOf(a)),
    );
  return candidates.slice(0, count);
}
