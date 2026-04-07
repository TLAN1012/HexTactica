/**
 * CombatLog — 顯示最近的戰鬥與移動事件。
 * 固定在畫面右側的浮動面板。
 */
import type { CombatLogEntry } from "../engine/types";

export interface CombatLogProps {
  entries: CombatLogEntry[];
  maxShown?: number;
}

export function CombatLog({ entries, maxShown = 12 }: CombatLogProps) {
  const shown = entries.slice(-maxShown).reverse();

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 290,
        maxHeight: "calc(100% - 90px)",
        background: "rgba(20,16,12,0.88)",
        color: "#f0e8d4",
        borderRadius: 8,
        padding: "10px 12px",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        pointerEvents: "auto",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          paddingBottom: 4,
        }}
      >
        戰鬥紀錄
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {shown.length === 0 && (
          <div style={{ opacity: 0.5, fontStyle: "italic" }}>
            尚未發生戰事…
          </div>
        )}
        {shown.map((e, i) => (
          <div
            key={entries.length - i}
            style={{
              padding: "4px 6px",
              background:
                e.damage && e.damage > 0
                  ? "rgba(180,60,40,0.25)"
                  : "rgba(255,255,255,0.05)",
              borderLeft:
                e.damage && e.damage > 0
                  ? "2px solid #d4573a"
                  : "2px solid rgba(255,255,255,0.2)",
              borderRadius: 3,
              lineHeight: 1.4,
            }}
          >
            <div style={{ opacity: 0.5, fontSize: 10 }}>T{e.turn}</div>
            <div>{e.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
