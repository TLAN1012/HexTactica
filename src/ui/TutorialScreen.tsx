/**
 * TutorialScreen — 教學課程:BattleScreen 上方掛一張步驟卡,
 * 依戰場狀態自動推進;不動戰役名冊,可隨時離開。
 */
import { useMemo, useState } from "react";
import { initBattle } from "../game/battle";
import {
  TUTORIAL_FINALE,
  TUTORIAL_MISSION,
  TUTORIAL_STEPS,
  tutorialRoster,
} from "../game/tutorial";
import type { BattleState } from "../game/types";
import { BattleScreen } from "./BattleScreen";

export function TutorialScreen({ onExit }: { onExit: () => void }) {
  const [battle, setBattle] = useState<BattleState>(() =>
    initBattle(TUTORIAL_MISSION, tutorialRoster()),
  );
  const [restartKey, setRestartKey] = useState(0);

  // 目前應顯示的步驟:第一個尚未完成的
  const stepIndex = useMemo(() => {
    let i = 0;
    while (i < TUTORIAL_STEPS.length && TUTORIAL_STEPS[i].done(battle)) i++;
    return i;
  }, [battle]);

  const finished = battle.outcome !== "ongoing";
  const card = finished
    ? battle.outcome === "victory"
      ? TUTORIAL_FINALE.victory
      : TUTORIAL_FINALE.defeat
    : TUTORIAL_STEPS[Math.min(stepIndex, TUTORIAL_STEPS.length - 1)];
  const [tag, title] = card.title.split("|");

  return (
    <div style={{ minHeight: "100vh", background: "#1a1510", padding: "12px 0 32px" }}>
      {/* 步驟卡 */}
      <div
        style={{
          width: "min(98vw, 1320px)",
          margin: "0 auto 10px",
          background: "linear-gradient(#3a3226, #2c2519)",
          border: "1px solid #a8834a",
          borderRadius: 12,
          padding: "14px 20px",
          color: "#f0e8d4",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#ffd700",
            whiteSpace: "nowrap",
          }}
        >
          {tag}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "#d4c5a0" }}>{card.text}</div>
        </div>
        {!finished && (
          <div style={{ fontSize: 12.5, color: "#9a8d70", whiteSpace: "nowrap" }}>
            {Math.min(stepIndex + 1, TUTORIAL_STEPS.length)} / {TUTORIAL_STEPS.length}
          </div>
        )}
        {finished && battle.outcome === "defeat" && (
          <button
            onClick={() => {
              setBattle(initBattle(TUTORIAL_MISSION, tutorialRoster()));
              setRestartKey((k) => k + 1);
            }}
            style={btn("#2d7a3a")}
          >
            再來一次
          </button>
        )}
        <button onClick={onExit} style={btn(finished ? "#ac4a2a" : "#4a4038")}>
          {finished ? "完成教學" : "離開教學"}
        </button>
      </div>

      <BattleScreen
        key={restartKey}
        battle={battle}
        onBattleChange={setBattle}
        onFinish={onExit}
        missionTitle={TUTORIAL_MISSION.title}
      />
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    padding: "9px 18px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
