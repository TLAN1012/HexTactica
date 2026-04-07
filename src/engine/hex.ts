/**
 * 六角座標與幾何 — pointy-top, axial (q, r)
 * 參考：https://www.redblobgames.com/grids/hexagons/
 */

export interface Hex {
  q: number;
  r: number;
}

/** s = -q - r，用於 cube 距離計算 */
export function hexS(h: Hex): number {
  return -h.q - h.r;
}

/** 六鄰居方向向量：順時針自正右方起 */
export const HEX_DIRECTIONS: ReadonlyArray<Hex> = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0, r: +1 },
];

export function hexAdd(a: Hex, b: Hex): Hex {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function hexSub(a: Hex, b: Hex): Hex {
  return { q: a.q - b.q, r: a.r - b.r };
}

export function hexEq(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

/** 六角距離 */
export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = hexS(a) - hexS(b);
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

/** 回傳某格的六個鄰居 */
export function hexNeighbors(h: Hex): Hex[] {
  return HEX_DIRECTIONS.map((d) => hexAdd(h, d));
}

/** 字串 key，供 Map 使用 */
export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`;
}

export function parseHexKey(k: string): Hex {
  const [q, r] = k.split(",").map(Number);
  return { q, r };
}

/**
 * Axial 座標轉像素座標（pointy-top）
 * size = 六角格的外接圓半徑（= 邊長）
 */
export function hexToPixel(h: Hex, size: number): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * h.q + (Math.sqrt(3) / 2) * h.r);
  const y = size * ((3 / 2) * h.r);
  return { x, y };
}

/** 像素座標轉 Axial，含四捨五入到最近格 */
export function pixelToHex(x: number, y: number, size: number): Hex {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound({ q, r });
}

/** 浮點 axial 座標取整到最近的六角格 */
export function hexRound(h: { q: number; r: number }): Hex {
  const s = -h.q - h.r;
  let rq = Math.round(h.q);
  let rr = Math.round(h.r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - h.q);
  const dr = Math.abs(rr - h.r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

/** pointy-top 六角形六個頂點，相對於中心 */
export function hexCorners(size: number): Array<{ x: number; y: number }> {
  const corners: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top offset
    corners.push({
      x: size * Math.cos(angle),
      y: size * Math.sin(angle),
    });
  }
  return corners;
}

/** 產生一個矩形範圍的六角格清單 */
export function rectangleMap(width: number, height: number): Hex[] {
  const hexes: Hex[] = [];
  for (let r = 0; r < height; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < width - rOffset; q++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}
