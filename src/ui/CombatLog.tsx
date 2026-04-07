/**
 * CombatLog — 可摺疊的戰鬥紀錄面板。
 *
 * 預設摺疊；點擊標題展開。
 * 展開後最多 300px 高，超出部分內部捲動。
 */
import { useState } from "react";
import type { CombatLogEntry } from "../engine/types";

export interface CombatLogProps {
  entries: CombatLogEntry[];
  maxShown?: number;
}

export function CombatLog({ entries, maxShown = 30 }: CombatLogProps) {
  const [expanded, setExpanded] = useState(true);
  const shown = entries.slice(-maxShown).reverse();

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 280,
        maxHeight: expanded ? 320 : 32,
        background: "rgba(20,16,12,0.92)",
        color: "#f0e8d4",
        borderRadius: 8,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        transition: "max-height 0.2s ease",
      }}
    >
      {/* 標題列（可點擊展開/收起） */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          fontWeight: 600,
          fontSize: 13,
          borderBottom: expanded
            ? "1px solid rgba(255,255,255,0.2)"
            : "none",
          color: "#f0e8d4",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <span>
          戰鬥紀錄
          {entries.length > 0 && (
            <span style={{ opacity: 0.6, marginLeft: 8, fontWeight: 400 }}>
              ({entries.length})
            </span>
          )}
        </span>
        <span style={{ fontSize: 11, opacity: 0.8 }}>
          {expanded ? "▼ 收起" : "▶ 展開"}
        </span>
      </button>

      {/* 內容列表 */}
      {expanded && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 10px",
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
      )}
    </div>
  );
}
