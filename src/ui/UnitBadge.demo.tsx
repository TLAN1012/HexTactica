/**
 * UnitBadge.demo — 開發用展示元件
 * 把 7 種兵種徽章排成兩列（紅 / 藍 兩陣營）
 */
import { UnitBadge } from "./UnitBadge";
import type { EmblemSpec } from "../engine/types";

const DEMO_EMBLEMS: Array<{ label: string; emblem: EmblemSpec }> = [
  {
    label: "重騎兵",
    emblem: { shape: "shield", symbol: "horse-heavy", strokeColor: "#8B0000" },
  },
  {
    label: "輕騎兵",
    emblem: { shape: "round", symbol: "horse-light", strokeColor: "#D4A017" },
  },
  {
    label: "弓兵",
    emblem: { shape: "round", symbol: "arrow", strokeColor: "#556B2F" },
  },
  {
    label: "長弓兵",
    emblem: { shape: "shield", symbol: "longbow", strokeColor: "#7B3F00" },
  },
  {
    label: "步兵",
    emblem: { shape: "shield", symbol: "sword", strokeColor: "#505050" },
  },
  {
    label: "槍兵",
    emblem: { shape: "shield", symbol: "spear", strokeColor: "#2F4F4F" },
  },
  {
    label: "標槍兵",
    emblem: { shape: "round", symbol: "javelin", strokeColor: "#C19A6B" },
  },
];

const RED_SIDE = "#c0392b";
const BLUE_SIDE = "#2c5d8f";

export function UnitBadgeDemo() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h2 style={{ margin: "0 0 12px" }}>UnitBadge — 7 種兵種展示</h2>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {DEMO_EMBLEMS.map((item) => (
          <div key={`red-${item.emblem.symbol}`} style={{ textAlign: "center" }}>
            <UnitBadge emblem={item.emblem} sideColor={RED_SIDE} size={72} />
            <div style={{ fontSize: 12, marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {DEMO_EMBLEMS.map((item) => (
          <div key={`blue-${item.emblem.symbol}`} style={{ textAlign: "center" }}>
            <UnitBadge emblem={item.emblem} sideColor={BLUE_SIDE} size={72} />
            <div style={{ fontSize: 12, marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ margin: "8px 0" }}>狀態裝飾</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <UnitBadge
            emblem={DEMO_EMBLEMS[4].emblem}
            sideColor={RED_SIDE}
            size={72}
            state="shaken"
          />
          <div style={{ fontSize: 12 }}>shaken</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <UnitBadge
            emblem={DEMO_EMBLEMS[5].emblem}
            sideColor={BLUE_SIDE}
            size={72}
            state="routing"
          />
          <div style={{ fontSize: 12 }}>routing</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <UnitBadge
            emblem={DEMO_EMBLEMS[6].emblem}
            sideColor={BLUE_SIDE}
            size={72}
            state="committed"
          />
          <div style={{ fontSize: 12 }}>committed (pulse)</div>
        </div>
      </div>
    </div>
  );
}

export default UnitBadgeDemo;
