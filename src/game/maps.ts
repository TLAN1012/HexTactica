/**
 * 地圖產生 — 以任務種子決定地形,同一關每次進入都長一樣。
 */
import { hexKey, rectangleMap, type Hex } from "../engine/hex";

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
