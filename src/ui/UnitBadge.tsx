/**
 * UnitBadge — 純 SVG 向量徽章（3D 質感版）
 *
 * 設計重點：
 *  - 盾/圓/旗框以 linearGradient 上亮下暗模擬球面光
 *  - 外環深色粗邊 + 內緣亮色細線，做出立體凹凸
 *  - 底下 feDropShadow 投影到地面
 *  - 兵種符號用奶白色主體 + 深色描邊，與陣營底色高對比
 *  - viewBox 統一 -50 -50 100 100；尺寸只影響最終 px
 *
 * 每個 instance 產生獨立 gradient/filter id 避免 DOM 衝突（useId）。
 */
import { useId } from "react";
import type { EmblemSpec, UnitState } from "../engine/types";

export interface UnitBadgeProps {
  emblem: EmblemSpec;
  sideColor: string;
  size?: number;
  state?: UnitState;
}

const VIEWBOX = "-55 -55 110 110";

// ═══════════════════════════════════════════════════════════
// 顏色工具：HSL 調亮/調暗
// ═══════════════════════════════════════════════════════════

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{2}/g)!;
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}
function adjustL(hex: string, deltaL: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, s, Math.max(0, Math.min(100, l + deltaL)));
  return rgbToHex(nr, ng, nb);
}

// ═══════════════════════════════════════════════════════════
// 框架形狀（回傳 path d）
// ═══════════════════════════════════════════════════════════

function shapePath(shape: EmblemSpec["shape"]): string {
  switch (shape) {
    case "round":
      // 圓（用 path 近似，比 <circle> 能統一加 stroke 細節）
      return "M -42 0 A 42 42 0 1 1 42 0 A 42 42 0 1 1 -42 0 Z";
    case "shield":
      return "M -38 -42 L 38 -42 L 38 8 Q 38 38 0 46 Q -38 38 -38 8 Z";
    case "banner":
      return "M -38 -44 L 38 -44 L 38 32 L 0 18 L -38 32 Z";
  }
}

// ═══════════════════════════════════════════════════════════
// 兵種符號（高對比奶白色 + 深色描邊）
// ═══════════════════════════════════════════════════════════

const SYMBOL_FILL = "#f5ecd0"; // 奶白色
const SYMBOL_STROKE = "#1a1410"; // 深棕黑描邊

function Symbol({ symbol }: { symbol: string }) {
  const f = SYMBOL_FILL;
  const s = SYMBOL_STROKE;
  const sw = 2.5;
  switch (symbol) {
    case "horse-heavy":
      return (
        <g fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round">
          <path d="M -22 18 L -22 -8 Q -22 -28 0 -28 Q 18 -28 22 -10 L 28 -4 L 22 4 L 22 18 L 10 18 L 10 6 L -10 6 L -10 18 Z" />
          <circle cx={14} cy={-15} r={2.2} fill={s} stroke="none" />
        </g>
      );
    case "horse-light":
      return (
        <g fill="none" stroke={f} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M -28 22 L -10 -6 Q 4 -22 22 -16 L 30 -22" />
          <path d="M -22 22 L -16 6" />
          <path d="M 6 22 L 12 4" />
          <path d="M 22 -16 L 28 -8" />
        </g>
      );
    case "arrow":
      return (
        <g fill={f} stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <line x1={-28} y1={28} x2={22} y2={-22} stroke={f} strokeWidth={6} />
          <path d="M 22 -22 L 6 -20 L 20 -6 Z" />
          <path d="M -28 28 L -22 16" stroke={f} strokeWidth={3} fill="none" />
          <path d="M -28 28 L -16 22" stroke={f} strokeWidth={3} fill="none" />
        </g>
      );
    case "longbow":
      return (
        <g fill="none" stroke={f} strokeWidth={5} strokeLinecap="round">
          <path d="M -22 -32 Q -40 0 -22 32" strokeWidth={6} />
          <line x1={-22} y1={-32} x2={-22} y2={32} strokeWidth={2.2} />
          <line x1={-22} y1={0} x2={28} y2={0} strokeWidth={4} />
          <path d="M 28 0 L 18 -6 L 18 6 Z" fill={f} />
        </g>
      );
    case "sword":
      return (
        <g fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round">
          {/* 刃 */}
          <path d="M -4 -36 L 4 -36 L 5 16 L -5 16 Z" />
          {/* 刃中線高光 */}
          <line x1={0} y1={-34} x2={0} y2={14} stroke={s} strokeWidth={1} opacity={0.6} />
          {/* 護手 */}
          <rect x={-20} y={16} width={40} height={6} rx={1} />
          {/* 柄 */}
          <rect x={-3.5} y={22} width={7} height={12} />
          {/* 柄頭 */}
          <circle cx={0} cy={36} r={4.5} />
        </g>
      );
    case "spear":
      return (
        <g fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round">
          {/* 桿 */}
          <line x1={0} y1={-38} x2={0} y2={36} stroke={f} strokeWidth={5} />
          <line x1={0} y1={-38} x2={0} y2={36} stroke={s} strokeWidth={1} opacity={0.4} />
          {/* 葉狀槍頭 */}
          <path d="M 0 -42 L -8 -22 L 0 -12 L 8 -22 Z" />
          {/* 桿尾繩 */}
          <line x1={-6} y1={36} x2={6} y2={36} stroke={f} strokeWidth={3.5} />
        </g>
      );
    case "javelin":
      return (
        <g fill={f} stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <line x1={-26} y1={26} x2={22} y2={-22} stroke={f} strokeWidth={5} />
          <path d="M 22 -22 L 10 -20 L 20 -8 Z" />
        </g>
      );
    default:
      return (
        <text x={0} y={8} textAnchor="middle" fontSize={36} fontWeight="bold" fill={f}>
          ?
        </text>
      );
  }
}

// ═══════════════════════════════════════════════════════════
// 狀態裝飾
// ═══════════════════════════════════════════════════════════

function StateDecoration({ state }: { state?: UnitState }) {
  if (!state) return null;

  if (state === "routing" || state === "shaken") {
    return (
      <circle
        cx={0}
        cy={0}
        r={50}
        fill="none"
        stroke="#ff2a2a"
        strokeWidth={3}
        strokeDasharray="6 4"
        opacity={0.75}
      />
    );
  }

  if (state === "committed") {
    return (
      <circle cx={0} cy={0} r={50} fill="none" stroke="#ffcc00" strokeWidth={3}>
        <animate attributeName="r" values="48;52;48" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.95;0.4;0.95" dur="1.4s" repeatCount="indefinite" />
      </circle>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// 主元件
// ═══════════════════════════════════════════════════════════

export function UnitBadge({
  emblem,
  sideColor,
  size = 64,
  state,
}: UnitBadgeProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `grad-${uid}`;
  const rimGradId = `rim-${uid}`;
  const shadowId = `shadow-${uid}`;

  // 陣營色系衍生：亮色高光 / 中間色 / 深色陰影 / 外緣描邊
  const light = adjustL(sideColor, 18);
  const mid = adjustL(sideColor, -5);
  const dark = adjustL(sideColor, -22);
  const rimDark = adjustL(sideColor, -40);

  const path = shapePath(emblem.shape);

  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`unit badge ${emblem.symbol}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id={rimGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={adjustL(sideColor, 30)} stopOpacity="0.9" />
          <stop offset="100%" stopColor={adjustL(sideColor, 5)} stopOpacity="0" />
        </linearGradient>
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* 主框 + drop shadow */}
      <g filter={`url(#${shadowId})`}>
        <path
          d={path}
          fill={`url(#${gradId})`}
          stroke={rimDark}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        {/* 內緣高光：同形狀但略縮，只描上半部漸透明 stroke */}
        <path
          d={path}
          fill="none"
          stroke={`url(#${rimGradId})`}
          strokeWidth={2.2}
          strokeLinejoin="round"
          transform="scale(0.92)"
        />
      </g>

      {/* 符號 */}
      <Symbol symbol={emblem.symbol} />

      {/* 狀態裝飾 */}
      <StateDecoration state={state} />
    </svg>
  );
}

export default UnitBadge;
