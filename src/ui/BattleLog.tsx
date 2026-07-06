/**
 * BattleLog — 戰鬥紀錄(可摺疊,自動捲到最新)
 */
import { useEffect, useRef, useState } from "react";
import type { BattleLogEntry } from "../game/types";

const KIND_COLOR: Record<BattleLogEntry["kind"], string> = {
  move: "#9ca3af",
  attack: "#fca5a5",
  retaliate: "#fbbf24",
  death: "#f87171",
  info: "#93c5fd",
};

export function BattleLog({ entries }: { entries: BattleLogEntry[] }) {
  const [open, setOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [entries.length, open]);

  return (
    <div
      style={{
        background: "rgba(20,16,12,0.92)",
        borderRadius: 10,
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          color: "#d4c5a0",
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {open ? "▾" : "▸"} 戰鬥紀錄({entries.length})
      </button>
      {open && (
        <div
          ref={bodyRef}
          style={{
            maxHeight: 140,
            overflowY: "auto",
            padding: "0 14px 10px",
            fontSize: 12.5,
            lineHeight: 1.65,
          }}
        >
          {entries.slice(-80).map((e, i) => (
            <div key={i} style={{ color: KIND_COLOR[e.kind] }}>
              {e.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
