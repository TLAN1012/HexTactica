/**
 * ArmyScreen — 軍營:名冊管理、補兵(花金)、招募、解散
 */
import { useState } from "react";
import {
  dismissSquad,
  MAX_ROSTER,
  recruitSquad,
  replenishCost,
  replenishSquad,
} from "../game/campaign";
import { maxSoldiers, XP_THRESHOLDS, MAX_LEVEL } from "../game/progression";
import { getSquadType, SQUAD_TYPES } from "../game/units";
import type { CampaignState } from "../game/types";

const ART = import.meta.env.BASE_URL + "art/units/";

export interface ArmyScreenProps {
  campaign: CampaignState;
  onChange: (next: CampaignState) => void;
  onBack: () => void;
}

export function ArmyScreen({ campaign, onChange, onBack }: ArmyScreenProps) {
  const [tab, setTab] = useState<"roster" | "recruit">("roster");

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
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>🏕 軍營</h1>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 17, color: "#ffd700", fontWeight: 700 }}>
            🪙 {campaign.gold}
          </span>
          <button onClick={onBack} style={smallBtn("#4a4038")}>
            ← 回戰役地圖
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setTab("roster")}
            style={smallBtn(tab === "roster" ? "#5a4a8a" : "#3a3228")}
          >
            我的部隊({campaign.roster.length}/{MAX_ROSTER})
          </button>
          <button
            onClick={() => setTab("recruit")}
            style={smallBtn(tab === "recruit" ? "#5a4a8a" : "#3a3228")}
          >
            招募新隊
          </button>
        </div>

        {tab === "roster" ? (
          <RosterTab campaign={campaign} onChange={onChange} />
        ) : (
          <RecruitTab campaign={campaign} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function RosterTab({ campaign, onChange }: { campaign: CampaignState; onChange: (c: CampaignState) => void }) {
  if (campaign.roster.length === 0) {
    return <p style={{ color: "#c98a7a" }}>名冊空空如也 — 去「招募新隊」補充戰力!</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {campaign.roster.map((r) => {
        const type = getSquadType(r.typeId);
        const cap = maxSoldiers(r.typeId, r.level);
        const cost = replenishCost(r);
        const nextXp = r.level < MAX_LEVEL ? XP_THRESHOLDS[r.level] : null;
        return (
          <div key={r.id} style={card()}>
            <img
              src={`${ART}${type.art}.png`}
              alt={type.name}
              width={56}
              height={56}
              style={{ borderRadius: 8, objectFit: "cover" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {type.name} <span style={{ color: "#ffd700" }}>Lv{r.level}</span>
                {r.level > 1 && (
                  <span style={{ color: "#ffd700", fontSize: 12, marginLeft: 4 }}>
                    {"★".repeat(r.level - 1)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: "#b8a888", marginTop: 2 }}>
                兵力 {r.soldiers}/{cap}
                {r.soldiers < cap && <span style={{ color: "#f0a080" }}>(缺 {cap - r.soldiers})</span>}
                {" ‧ "}經驗 {r.xp}
                {nextXp !== null && ` / 下一級 ${nextXp}`}
              </div>
              <SoldierBar current={r.soldiers} max={cap} />
            </div>
            <button
              onClick={() => onChange(replenishSquad(campaign, r.id))}
              disabled={cost === 0 || campaign.gold === 0}
              style={smallBtn(cost > 0 && campaign.gold > 0 ? "#2d6a3a" : "#444")}
            >
              補兵 {cost > 0 ? `🪙 ${cost}` : "(滿編)"}
            </button>
            <button
              onClick={() => {
                if (window.confirm(`確定解散這隊${type.name}?士兵與經驗都會消失。`)) {
                  onChange(dismissSquad(campaign, r.id));
                }
              }}
              style={smallBtn("#6a3226")}
            >
              解散
            </button>
          </div>
        );
      })}
      <p style={{ fontSize: 12.5, color: "#8a7d60", lineHeight: 1.7 }}>
        戰損會保留到下一戰,記得補兵。小隊靠擊殺累積經驗升級:每級 +10% 血量與傷害、滿編 +2 人。
      </p>
    </div>
  );
}

function RecruitTab({ campaign, onChange }: { campaign: CampaignState; onChange: (c: CampaignState) => void }) {
  const full = campaign.roster.length >= MAX_ROSTER;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {full && (
        <p style={{ color: "#f0a080", margin: 0 }}>
          名冊已滿({MAX_ROSTER} 隊)— 想招新隊先解散舊隊。
        </p>
      )}
      {SQUAD_TYPES.filter((t) => t.recruitable !== false).map((t) => (
        <div key={t.id} style={card()}>
          <img
            src={`${ART}${t.art}.png`}
            alt={t.name}
            width={56}
            height={56}
            style={{ borderRadius: 8, objectFit: "cover" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
            <div style={{ fontSize: 12.5, color: "#b8a888", marginTop: 2 }}>
              {t.soldiers} 人 ‧ 移動 {t.move} ‧ 射程 {t.range > 1 ? t.range : "近戰"} ‧ 單兵 {t.dmg[0]}–{t.dmg[1]} 傷/{t.hp} 血 ‧ 減傷 {Math.round(t.defense * 100)}%
            </div>
            <div style={{ fontSize: 12, color: "#8a7d60", marginTop: 3, lineHeight: 1.5 }}>
              {t.desc}
            </div>
          </div>
          <button
            onClick={() => onChange(recruitSquad(campaign, t.id))}
            disabled={full || campaign.gold < t.cost}
            style={smallBtn(!full && campaign.gold >= t.cost ? "#2d6a3a" : "#444")}
          >
            招募 🪙 {t.cost}
          </button>
        </div>
      ))}
    </div>
  );
}

function SoldierBar({ current, max }: { current: number; max: number }) {
  const ratio = max > 0 ? current / max : 0;
  return (
    <div style={{ marginTop: 5, height: 6, background: "rgba(0,0,0,0.5)", borderRadius: 3, overflow: "hidden", maxWidth: 260 }}>
      <div
        style={{
          width: `${ratio * 100}%`,
          height: "100%",
          background: ratio > 0.66 ? "#4ade80" : ratio > 0.33 ? "#fbbf24" : "#ef4444",
        }}
      />
    </div>
  );
}

function card(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "rgba(58,48,36,0.55)",
    border: "1px solid #4a4034",
    borderRadius: 10,
    padding: "12px 16px",
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
    whiteSpace: "nowrap",
  };
}
