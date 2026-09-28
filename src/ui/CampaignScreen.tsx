/**
 * 奇幻外傳:十關獸人戰役的關卡選單。
 */
import { useState } from "react";
import { isUnlocked, REPLAY_REWARD_RATE, type BattleResult } from "../game/campaign";
import { MISSIONS } from "../game/missions";
import type { CampaignTrack, MissionDef } from "../game/types";

export function CampaignScreen({ track, lastResult, onStartMission, onOpenArmy, onBack }: {
  track: CampaignTrack;
  lastResult: BattleResult | null;
  onStartMission: (m: MissionDef) => void;
  onOpenArmy: () => void;
  onBack: () => void;
}) {
  const [sel, setSel] = useState<MissionDef | null>(null);
  const fieldable = track.roster.filter((r) => r.soldiers > 0).length;
  return (
    <div className="screen">
      <div className="content">
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>‹ 選單</button>
          <h1 className="h1 grow">奇幻外傳:碎顱之戰</h1>
          <span className="gold">🪙 {track.gold}</span>
          <button className="btn btn-sm" onClick={onOpenArmy}>🏕 軍營</button>
        </div>
        {lastResult && (
          <div className="frame fade-in" style={{ marginBottom: 14 }}>
            <strong style={{ color: lastResult.victory ? "var(--gold-2)" : "var(--bad)" }}>{lastResult.victory ? "⚜ 勝利" : "✝ 敗北"}</strong>
            {lastResult.goldEarned > 0 && <span className="gold" style={{ marginLeft: 10 }}>+{lastResult.goldEarned} 金</span>}
            {lastResult.casualties.length > 0 && <span className="sub" style={{ marginLeft: 10 }}>戰損 {lastResult.casualties.reduce((a, c) => a + c.lost, 0)} 人</span>}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {MISSIONS.map((m) => {
            const open = isUnlocked(track, m);
            const done = track.completedMissions.includes(m.id);
            return (
              <button key={m.id} className={`btn ${sel?.id === m.id ? "btn-primary" : ""}`} disabled={!open} style={{ justifyContent: "flex-start", minHeight: 64 }} onClick={() => setSel(m)}>
                <span style={{ fontFamily: "var(--font-ui)", color: "var(--gold)" }}>{String(m.index).padStart(2, "0")}</span>
                <span className="grow" style={{ textAlign: "left" }}>{m.title}</span>
                {done ? "✓" : open ? "⚔" : "🔒"}
              </button>
            );
          })}
        </div>
        {sel && (
          <div className="frame fade-in" style={{ marginTop: 16 }} key={sel.id}>
            <div className="h1" style={{ fontSize: 20 }}>{sel.title}</div>
            <p style={{ lineHeight: 1.8 }}>{sel.briefing}</p>
            <div className="row">
              <span className="sub grow">
                獎金 {track.completedMissions.includes(sel.id) ? Math.round(sel.reward * REPLAY_REWARD_RATE) : sel.reward} 金・敵軍 {sel.enemies.length} 隊・出戰 {fieldable} 隊
              </span>
              <button className="btn btn-primary" disabled={fieldable === 0} onClick={() => onStartMission(sel)}>出征 ⚔</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
