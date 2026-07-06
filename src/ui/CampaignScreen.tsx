/**
 * CampaignScreen — 戰役地圖:任務清單、金幣、進軍/回營
 */
import { useState } from "react";
import { isUnlocked, MISSIONS, REPLAY_REWARD_RATE } from "../game/campaign";
import type { BattleResult } from "../game/campaign";
import { getSquadType } from "../game/units";
import type { CampaignState, MissionDef } from "../game/types";

export interface CampaignScreenProps {
  campaign: CampaignState;
  lastResult: BattleResult | null;
  onStartMission: (mission: MissionDef) => void;
  onOpenArmy: () => void;
  onBackToTitle: () => void;
}

export function CampaignScreen({
  campaign,
  lastResult,
  onStartMission,
  onOpenArmy,
  onBackToTitle,
}: CampaignScreenProps) {
  const [selected, setSelected] = useState<MissionDef | null>(null);
  const fieldable = campaign.roster.filter((r) => r.soldiers > 0).length;
  const allClear = campaign.completedMissions.length === MISSIONS.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "linear-gradient(#241e16, #1a1510)",
        color: "#f0e8d4",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* 頂欄 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>⚔️ 戰役地圖</h1>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 17, color: "#ffd700", fontWeight: 700 }}>
            🪙 {campaign.gold}
          </span>
          <button onClick={onOpenArmy} style={smallBtn("#5a4a8a")}>
            🏕 軍營({campaign.roster.length} 隊)
          </button>
          <button onClick={onBackToTitle} style={smallBtn("#4a4038")}>
            返回標題
          </button>
        </div>

        {/* 戰報 */}
        {lastResult && <ResultBanner result={lastResult} campaign={campaign} />}
        {allClear && (
          <div style={banner("#2d5a3a")}>
            🎉 血狼劫掠團已被徹底剿滅!戰役完成 — 你仍可重打任一關磨練部隊。
          </div>
        )}
        {fieldable === 0 && (
          <div style={banner("#7a2d2d")}>
            ⚠ 你沒有可出戰的部隊了!去軍營招募或補兵。
          </div>
        )}

        {/* 任務列表 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MISSIONS.map((m) => {
            const unlocked = isUnlocked(campaign, m);
            const cleared = campaign.completedMissions.includes(m.id);
            const isSel = selected?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => unlocked && setSelected(isSel ? null : m)}
                style={{
                  background: isSel
                    ? "rgba(90,74,42,0.55)"
                    : unlocked
                      ? "rgba(58,48,36,0.55)"
                      : "rgba(40,34,28,0.4)",
                  border: `1px solid ${isSel ? "#c9a85a" : "#4a4034"}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  cursor: unlocked ? "pointer" : "default",
                  opacity: unlocked ? 1 : 0.45,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>
                    {cleared ? "✅" : unlocked ? "⚔️" : "🔒"} 第 {m.index} 關 — {m.title}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, color: "#ffd700" }}>
                    🪙 {cleared ? Math.round(m.reward * REPLAY_REWARD_RATE) : m.reward}
                    {cleared && <span style={{ color: "#9a8d70" }}>(重打)</span>}
                  </span>
                  <span style={{ fontSize: 13, color: "#c98a7a" }}>
                    敵軍 {m.enemies.length} 隊
                  </span>
                </div>
                {isSel && (
                  <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.7 }}>
                    <p style={{ margin: "0 0 8px", color: "#d4c5a0" }}>{m.briefing}</p>
                    <div style={{ color: "#c98a7a", marginBottom: 10 }}>
                      敵方編成:
                      {m.enemies.map((e, i) => (
                        <span key={i} style={{ marginLeft: 8 }}>
                          {getSquadType(e.typeId).name}
                          {e.level > 1 && ` Lv${e.level}`}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onStartMission(m);
                      }}
                      disabled={fieldable === 0}
                      style={{
                        ...smallBtn(fieldable > 0 ? "#ac4a2a" : "#555"),
                        fontSize: 14,
                        padding: "9px 26px",
                      }}
                    >
                      🏹 進軍
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultBanner({ result, campaign }: { result: BattleResult; campaign: CampaignState }) {
  const name = (id: string) => {
    const r = campaign.roster.find((r) => r.id === id);
    return r ? getSquadType(r.typeId).name : "陣亡小隊";
  };
  return (
    <div style={banner(result.victory ? "#2d5a3a" : "#6a3226")}>
      <strong>{result.victory ? "🏆 上一戰:勝利" : "💀 上一戰:敗北"}</strong>
      {result.goldEarned > 0 && <span style={{ marginLeft: 10 }}>獲得 🪙 {result.goldEarned}</span>}
      {result.casualties.length > 0 && (
        <span style={{ marginLeft: 10, color: "#f0c0a0" }}>
          戰損:{result.casualties.map((c) => `${name(c.squadId)} −${c.lost} 人`).join("、")}
        </span>
      )}
      {result.xpGains.filter((x) => x.leveledUp).length > 0 && (
        <span style={{ marginLeft: 10, color: "#ffd700" }}>
          升級:{result.xpGains.filter((x) => x.leveledUp).map((x) => name(x.squadId)).join("、")}!
        </span>
      )}
    </div>
  );
}

function banner(bg: string): React.CSSProperties {
  return {
    background: bg,
    borderRadius: 10,
    padding: "10px 16px",
    marginBottom: 14,
    fontSize: 13.5,
    lineHeight: 1.7,
  };
}

function smallBtn(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    padding: "7px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}
