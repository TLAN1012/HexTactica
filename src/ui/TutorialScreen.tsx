/**
 * TutorialScreen — 教學課程:BattleScreen 上方掛一張步驟卡,
 * 依戰場狀態自動推進;不動戰役名冊,可隨時離開。
 */
import { useMemo, useState } from "react";
import { initBattle } from "../game/battle";
import { missionToScenario } from "../game/scenarios";
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
    initBattle(missionToScenario(TUTORIAL_MISSION), tutorialRoster(), "squire"),
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

  const cardEl = (
    <div className="frame fade-in" style={{ position: "absolute", left: 10, right: 60, top: 10, zIndex: 7, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gold-2)", whiteSpace: "nowrap" }}>{tag}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ivory)" }}>{card.text}</div>
      </div>
      {!finished && <div className="sub" style={{ whiteSpace: "nowrap" }}>{Math.min(stepIndex + 1, TUTORIAL_STEPS.length)} / {TUTORIAL_STEPS.length}</div>}
      {finished && battle.outcome === "defeat" && (
        <button className="btn btn-sm" onClick={() => { setBattle(initBattle(missionToScenario(TUTORIAL_MISSION), tutorialRoster(), "squire")); setRestartKey((k) => k + 1); }}>再來一次</button>
      )}
    </div>
  );

  return (
    <BattleScreen
      key={restartKey}
      battle={battle}
      onBattleChange={setBattle}
      onFinish={onExit}
      onExit={onExit}
      title={TUTORIAL_MISSION.title}
      playerFaction="fantasy-human"
      enemyFaction="fantasy-orc"
      overlay={cardEl}
    />
  );
}
