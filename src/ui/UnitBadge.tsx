/**
 * UnitBadge — 純 SVG 向量徽章元件
 *
 * 設計：以徽章中心 (0,0) 為原點，外框與符號皆相對 size 繪製。
 * viewBox 統一為 "-50 -50 100 100"，這樣 size 只控制最終 px 尺寸，內部座標固定。
 * 符號 path 使用 ±40 範圍（即 size*0.4）。
 */
import type { EmblemSpec, UnitState } from "../engine/types";

export interface UnitBadgeProps {
  emblem: EmblemSpec;
  sideColor: string;
  size?: number;
  state?: UnitState;
}

const VIEWBOX = "-50 -50 100 100";

// ───────────────────────────────────────────────
// 外框形狀
// ───────────────────────────────────────────────

function ShapeFrame({
  shape,
  fill,
  stroke,
}: {
  shape: EmblemSpec["shape"];
  fill: string;
  stroke: string;
}) {
  const strokeWidth = 4;
  if (shape === "round") {
    return (
      <circle
        cx={0}
        cy={0}
        r={44}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (shape === "shield") {
    // 盾牌：頂端水平、兩側微內凹、底部尖角
    const shieldPath =
      "M -38 -42 L 38 -42 L 38 8 Q 38 38 0 46 Q -38 38 -38 8 Z";
    return (
      <path
        d={shieldPath}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    );
  }
  // banner：旗幟（上方矩形 + 下方燕尾）
  const bannerPath =
    "M -38 -44 L 38 -44 L 38 32 L 0 18 L -38 32 Z";
  return (
    <path
      d={bannerPath}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}

// ───────────────────────────────────────────────
// 兵種符號
// 每個符號獨立 <g>，內部以 (0,0) 為中心，範圍約 ±40
// ───────────────────────────────────────────────

function SymbolHorseHeavy({ color }: { color: string }) {
  // 厚實馬頭剪影：粗線條 + 鬃毛
  return (
    <g fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round">
      <path d="M -22 18 L -22 -8 Q -22 -28 0 -28 Q 18 -28 22 -10 L 28 -4 L 22 4 L 22 18 L 10 18 L 10 6 L -10 6 L -10 18 Z" />
      <circle cx={12} cy={-14} r={3} fill="#000" stroke="none" />
    </g>
  );
}

function SymbolHorseLight({ color }: { color: string }) {
  // 細瘦躍馬剪影
  return (
    <g fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M -28 22 L -10 -6 Q 4 -22 22 -16 L 30 -22" />
      <path d="M -22 22 L -16 6" />
      <path d="M 6 22 L 12 4" />
      <path d="M 22 -16 L 28 -8" />
    </g>
  );
}

function SymbolArrow({ color }: { color: string }) {
  // 對角箭：左下指向右上
  return (
    <g fill={color} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <line x1={-28} y1={28} x2={22} y2={-22} stroke={color} strokeWidth={5} />
      {/* 箭頭 */}
      <path d="M 22 -22 L 8 -20 L 20 -8 Z" />
      {/* 羽毛 */}
      <path d="M -28 28 L -22 18 M -28 28 L -18 22" stroke={color} strokeWidth={3} fill="none" />
    </g>
  );
}

function SymbolLongbow({ color }: { color: string }) {
  // 長弓：弧形 + 弓弦 + 一支箭
  return (
    <g fill="none" stroke={color} strokeWidth={4} strokeLinecap="round">
      {/* 弓身 */}
      <path d="M -22 -32 Q -38 0 -22 32" strokeWidth={5} />
      {/* 弓弦 */}
      <line x1={-22} y1={-32} x2={-22} y2={32} strokeWidth={2} />
      {/* 箭桿 */}
      <line x1={-22} y1={0} x2={28} y2={0} strokeWidth={3} />
      {/* 箭頭 */}
      <path d="M 28 0 L 18 -6 L 18 6 Z" fill={color} />
    </g>
  );
}

function SymbolSword({ color }: { color: string }) {
  // 劍：垂直，刀刃 + 護手 + 劍柄
  return (
    <g fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round">
      {/* 刀刃 */}
      <path d="M -4 -34 L 4 -34 L 4 18 L -4 18 Z" />
      {/* 護手 */}
      <rect x={-18} y={18} width={36} height={5} />
      {/* 握柄 */}
      <rect x={-3} y={23} width={6} height={12} />
      {/* 柄頭 */}
      <circle cx={0} cy={36} r={4} />
    </g>
  );
}

function SymbolSpear({ color }: { color: string }) {
  // 槍：細長矛桿 + 葉狀槍頭
  return (
    <g fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round">
      {/* 槍桿 */}
      <line x1={0} y1={-38} x2={0} y2={36} stroke={color} strokeWidth={4} />
      {/* 葉狀槍頭 */}
      <path d="M 0 -38 L -7 -22 L 0 -14 L 7 -22 Z" />
      {/* 桿尾 */}
      <line x1={-5} y1={36} x2={5} y2={36} stroke={color} strokeWidth={3} />
    </g>
  );
}

function SymbolJavelin({ color }: { color: string }) {
  // 標槍：對角短矛
  return (
    <g fill={color} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <line x1={-26} y1={26} x2={22} y2={-22} stroke={color} strokeWidth={4} />
      {/* 槍頭 */}
      <path d="M 22 -22 L 12 -18 L 18 -10 Z" />
    </g>
  );
}

function renderSymbol(symbol: string, color: string) {
  switch (symbol) {
    case "horse-heavy":
      return <SymbolHorseHeavy color={color} />;
    case "horse-light":
      return <SymbolHorseLight color={color} />;
    case "arrow":
      return <SymbolArrow color={color} />;
    case "longbow":
      return <SymbolLongbow color={color} />;
    case "sword":
      return <SymbolSword color={color} />;
    case "spear":
      return <SymbolSpear color={color} />;
    case "javelin":
      return <SymbolJavelin color={color} />;
    default:
      // 未知符號 → 畫個問號圓
      return (
        <text
          x={0}
          y={6}
          textAnchor="middle"
          fontSize={32}
          fontWeight="bold"
          fill={color}
        >
          ?
        </text>
      );
  }
}

// ───────────────────────────────────────────────
// 狀態裝飾（紅暈 / 金 pulse）
// ───────────────────────────────────────────────

function StateDecoration({ state }: { state?: UnitState }) {
  if (!state) return null;

  if (state === "routing" || state === "shaken") {
    // 紅色暈
    return (
      <circle
        cx={0}
        cy={0}
        r={47}
        fill="none"
        stroke="#ff2a2a"
        strokeWidth={3}
        opacity={0.65}
      />
    );
  }

  if (state === "committed") {
    // 金色 pulse
    return (
      <>
        <circle
          cx={0}
          cy={0}
          r={47}
          fill="none"
          stroke="#ffcc00"
          strokeWidth={3}
        >
          <animate
            attributeName="r"
            values="46;49;46"
            dur="1.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.9;0.4;0.9"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
      </>
    );
  }

  return null;
}

// ───────────────────────────────────────────────
// 主元件
// ───────────────────────────────────────────────

export function UnitBadge({
  emblem,
  sideColor,
  size = 64,
  state,
}: UnitBadgeProps) {
  // 符號顏色：使用 strokeColor 為對比，預設深色
  const symbolColor = emblem.strokeColor ?? "#222";

  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`unit badge ${emblem.symbol}`}
    >
      <ShapeFrame
        shape={emblem.shape}
        fill={sideColor}
        stroke={emblem.strokeColor ?? "#000"}
      />
      <g>{renderSymbol(emblem.symbol, symbolColor)}</g>
      <StateDecoration state={state} />
    </svg>
  );
}

export default UnitBadge;
