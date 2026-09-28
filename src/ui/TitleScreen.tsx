/**
 * 標題畫面:主視覺、繼續 / 新的征程(先選難度)/ 教學
 */
import { useState } from "react";
import { DIFFICULTIES } from "../game/difficulty";
import type { DifficultyId } from "../game/types";
import { storyArt } from "./assets";
import { MuteButton } from "./MuteButton";

export function DifficultyPicker({ value, onPick, onCancel }: { value?: DifficultyId; onPick: (d: DifficultyId) => void; onCancel: () => void }) {
  return (
    <div className="outcome fade-in" style={{ position: "fixed", zIndex: 40, padding: 16 }} onClick={onCancel}>
      <div className="frame" style={{ maxWidth: 560, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="frame-title">選擇難度</div>
        <div className="grid">
          {DIFFICULTIES.map((d) => (
            <button key={d.id} className={`btn btn-block ${d.id === value ? "btn-primary" : ""}`} style={{ justifyContent: "flex-start", textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: 2 }} onClick={() => onPick(d.id)}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 17 }}>{d.name}</span>
              <span className="sub" style={{ fontWeight: 400, fontSize: 13 }}>{d.desc}</span>
            </button>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 12 }}>難度之後隨時可以在戰役選單更改。</p>
      </div>
    </div>
  );
}

export function TitleScreen({ hasSave, onContinue, onNewGame, onTutorial }: {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: (d: DifficultyId) => void;
  onTutorial: () => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="screen" style={{ display: "grid", placeItems: "end center", paddingBottom: "max(48px, env(safe-area-inset-bottom))" }}>
      <div className="screen-bg" style={{ backgroundImage: `url(${storyArt("title.webp")})` }} />
      <div style={{ position: "fixed", top: "max(12px, env(safe-area-inset-top))", right: 12, zIndex: 2 }}><MuteButton /></div>
      <div className="content" style={{ textAlign: "center", width: "100%" }}>
        <div className="title-display" style={{ fontSize: "clamp(40px, 11vw, 88px)", lineHeight: 1 }}>HexTactica</div>
        <div style={{ fontFamily: "var(--font)", fontSize: "clamp(18px, 4vw, 26px)", letterSpacing: "0.6em", color: "var(--ivory)", margin: "10px 0 4px", paddingLeft: "0.6em" }}>六角戰記</div>
        <div className="sub" style={{ marginBottom: 28 }}>從維京長船到三十八度線 —— 以你的指揮改寫歷史</div>
        <div className="grid" style={{ maxWidth: 320, margin: "0 auto" }}>
          {hasSave && <button className="btn btn-primary btn-lg" onClick={onContinue}>繼續征程</button>}
          <button className={`btn btn-lg ${hasSave ? "" : "btn-primary"}`} onClick={() => setPicking(true)}>新的征程</button>
          <button className="btn" onClick={onTutorial}>📖 教學課程</button>
        </div>
        {hasSave && <p className="sub" style={{ fontSize: 12, marginTop: 14 }}>開始新的征程會覆蓋目前的存檔</p>}
      </div>
      {picking && <DifficultyPicker onPick={(d) => { setPicking(false); onNewGame(d); }} onCancel={() => setPicking(false)} />}
    </div>
  );
}
