/**
 * M0 預覽：純幾何測試用的六角地圖渲染
 * 目的：驗證 hex.ts 座標系統能正確映射到 SVG 畫面
 * 這個檔案在 M1 之後會被替換為真正的 HexMap 元件
 */
import { useState } from "react";
import {
  hexCorners,
  hexKey,
  hexToPixel,
  rectangleMap,
  type Hex,
} from "../engine/hex";

const HEX_SIZE = 32;
const MAP_WIDTH = 12;
const MAP_HEIGHT = 8;

export function HexMapPreview() {
  const [selected, setSelected] = useState<string | null>(null);
  const hexes = rectangleMap(MAP_WIDTH, MAP_HEIGHT);

  // 計算 viewBox，讓整個地圖置中
  const pixels = hexes.map((h) => hexToPixel(h, HEX_SIZE));
  const minX = Math.min(...pixels.map((p) => p.x)) - HEX_SIZE;
  const minY = Math.min(...pixels.map((p) => p.y)) - HEX_SIZE;
  const maxX = Math.max(...pixels.map((p) => p.x)) + HEX_SIZE;
  const maxY = Math.max(...pixels.map((p) => p.y)) + HEX_SIZE;
  const width = maxX - minX;
  const height = maxY - minY;

  const corners = hexCorners(HEX_SIZE);
  const pointsStr = corners.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: "0 0 8px 0", fontFamily: "system-ui, sans-serif" }}>
        HexTactica <span style={{ fontSize: 14, color: "#888" }}>M0 skeleton</span>
      </h1>
      <p style={{ margin: "0 0 16px 0", color: "#666", fontFamily: "system-ui, sans-serif" }}>
        點擊任一格測試座標系統。實際遊戲內容即將到來。
      </p>

      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        style={{
          width: "min(90vw, 900px)",
          height: "auto",
          background: "#f5efe1",
          border: "1px solid #ccc",
          borderRadius: 8,
        }}
      >
        {hexes.map((h: Hex) => {
          const { x, y } = hexToPixel(h, HEX_SIZE);
          const key = hexKey(h);
          const isSelected = selected === key;
          return (
            <g
              key={key}
              transform={`translate(${x}, ${y})`}
              onClick={() => setSelected(isSelected ? null : key)}
              style={{ cursor: "pointer" }}
            >
              <polygon
                points={pointsStr}
                fill={isSelected ? "#d4a76a" : "#e8dcc0"}
                stroke="#8b7355"
                strokeWidth={1}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize={10}
                fill="#666"
                fontFamily="monospace"
                style={{ pointerEvents: "none" }}
              >
                {h.q},{h.r}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 6,
          fontFamily: "system-ui, sans-serif",
          color: "#444",
        }}
      >
        <strong>選中格：</strong> {selected ?? "(尚未選擇)"}
        <br />
        <small style={{ color: "#888" }}>
          座標系：Pointy-top Axial (q, r)。距離公式、鄰居、A* 路徑將在 M1 實作。
        </small>
      </div>
    </div>
  );
}
