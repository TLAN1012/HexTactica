/**
 * 戰爭地圖:羊皮紙地圖上的戰場節點(已完成 / 進行中 / 未解鎖)、這一戰的簡報與出征。
 * 已打過的戰役可以點回去重溫(獎金四成、不影響戰爭進度)。
 */
import { useState } from "react";
import type { BattleResult } from "../game/campaign";
import { getCommander } from "../game/factions";
import { getScenario } from "../game/scenarios";
import type { CampaignTrack, ScenarioDef, WarDef } from "../game/types";
import { portraitArt, storyArt } from "./assets";
import { getRelic, lineageName, MAX_HEIRS } from "../game/legacy";
import { getSquadType } from "../game/units";

export function WarScreen({ war, track, lastResult, onStart, onArmy, onBack, onEpilogue, heirs, onChooseHeirs }: {
  war: WarDef;
  track: CampaignTrack;
  lastResult: BattleResult | null;
  onStart: (scenario: ScenarioDef) => void;
  onArmy: () => void;
  onBack: () => void;
  onEpilogue: () => void;
  /** 已選為傳承的老兵(名冊 id) */
  heirs: string[];
  onChooseHeirs: (ids: string[]) => void;
}) {
  const stage = track.stage ?? 0;
  const finished = stage >= war.battles.length;
  const [pick, setPick] = useState(Math.min(stage, war.battles.length - 1));
  const sc = getScenario(war.battles[pick].scenarioId);
  const enemyCmds = [...new Set(sc.enemies.flatMap((e) => (e.commanderId ? [e.commanderId] : [])))];
  const playable = pick <= stage;
  const fielded = track.roster.filter((r) => r.soldiers > 0).length;

  return (
    <div className="screen">
      <div className="content">
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>‹ 選單</button>
          <h1 className="h1 grow">{war.title}</h1>
          <span className="gold">🪙 {track.gold}</span>
          <button className="btn btn-sm" onClick={onArmy}>🏕 軍營</button>
        </div>

        {lastResult && (
          <div className="frame fade-in" style={{ marginBottom: 14, borderColor: lastResult.victory ? "var(--gold)" : "var(--bad)" }}>
            <div className="row">
              <strong style={{ color: lastResult.victory ? "var(--gold-2)" : "var(--bad)" }}>{lastResult.victory ? "⚜ 勝利" : "✝ 敗北"}</strong>
              <span className="sub grow">{lastResult.reason}</span>
              {lastResult.goldEarned > 0 && <span className="gold">+{lastResult.goldEarned} 金</span>}
            </div>
            {lastResult.xpGains.some((x) => x.leveledUp) && <div className="sub" style={{ marginTop: 4 }}>有部隊升級了!到軍營看看。</div>}
            {lastResult.casualties.length > 0 && <div className="sub" style={{ marginTop: 2 }}>戰損 {lastResult.casualties.reduce((a, c) => a + c.lost, 0)} 人,記得回軍營補兵。</div>}
            {lastResult.regrouped && <div className="sub" style={{ marginTop: 2 }}>撤退重整:部隊與金幣都恢復成開戰前的狀態,調整部署再挑戰一次。</div>}
          </div>
        )}

        <div className="frame" style={{ padding: 0, overflow: "hidden", position: "relative", aspectRatio: "16 / 9" }}>
          <img src={storyArt(war.mapArt)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "sepia(0.25) brightness(0.9)" }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {war.battles.slice(1).map((b, i) => {
              const a = war.battles[i].mapPos;
              return <line key={b.scenarioId} x1={a.x} y1={a.y} x2={b.mapPos.x} y2={b.mapPos.y} stroke="#7a1626" strokeWidth={0.6} strokeDasharray="1.5 1" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} />;
            })}
          </svg>
          {war.battles.map((b, i) => {
            const s = getScenario(b.scenarioId);
            const state = i < stage ? "done" : i === stage ? "now" : "locked";
            return (
              <button
                key={b.scenarioId}
                onClick={() => setPick(i)}
                title={s.title}
                style={{
                  position: "absolute", left: `${b.mapPos.x}%`, top: `${b.mapPos.y}%`, transform: "translate(-50%, -50%)",
                  width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
                  border: `2px solid ${i === pick ? "#f0d58a" : "#c9a24a"}`,
                  background: state === "done" ? "#2a4a2a" : state === "now" ? "#7a1626" : "#2a2226",
                  color: "#fff", fontSize: 18, boxShadow: i === pick ? "0 0 16px #f0d58a" : "0 2px 8px #000",
                  animation: state === "now" ? "blink 1.6s infinite" : undefined,
                }}
              >
                {state === "done" ? "✓" : state === "now" ? "⚔" : "🔒"}
              </button>
            );
          })}
        </div>

        <div className="frame fade-in" key={sc.id} style={{ marginTop: 16 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
            {sc.art && <img src={storyArt(sc.art)} alt="" className="portrait" style={{ width: "min(240px, 38%)", aspectRatio: "16/9" }} />}
            <div className="grow" style={{ minWidth: 220 }}>
              <div className="h1" style={{ fontSize: 22 }}>{sc.title}</div>
              <div className="sub">{sc.date}</div>
              <p style={{ lineHeight: 1.8, margin: "10px 0" }}>{sc.briefing}</p>
              <div style={{ color: "var(--gold-2)" }}>⚑ {sc.objectiveText}</div>
            </div>
          </div>
          {enemyCmds.length > 0 && (
            <div className="row" style={{ marginTop: 12 }}>
              <span className="sub">敵將:</span>
              {enemyCmds.map((id) => (
                <span key={id} className="row" style={{ gap: 6 }}>
                  <img src={portraitArt(id)} alt="" className="token" width={36} height={36} style={{ objectPosition: "top" }} />
                  <span style={{ fontSize: 14 }}>{getCommander(id).name}</span>
                </span>
              ))}
            </div>
          )}
          <div className="divider" />
          <div className="row">
            <span className="sub grow">
              {sc.useRoster === false ? "這一戰由北方伯爵的軍隊出戰(不動用你的名冊)" : `出戰部隊 ${fielded} 隊`}
              {playable && pick < stage ? "・重溫戰役不影響進度,獎金四成" : ""}
            </span>
            {playable ? (
              <button className="btn btn-primary btn-lg" disabled={sc.useRoster !== false && fielded === 0} onClick={() => onStart(sc)}>
                {pick < stage ? "重溫此戰" : "出征 ⚔"}
              </button>
            ) : (
              <span className="chip">🔒 先完成前一戰</span>
            )}
          </div>
        </div>

        {finished && (
          <div className="frame fade-in" style={{ marginTop: 16, textAlign: "center" }}>
            <div className="title-display" style={{ fontSize: 28 }}>Finis</div>
            <p>這場戰爭已經落幕。</p>
            <button className="btn btn-gold" onClick={onEpilogue}>觀看尾聲</button>
            {war.relic && (() => {
              const r = getRelic(war.relic);
              return r ? <p style={{ marginTop: 12 }}>獲得遺物 <span className="gold">「{r.name}」</span>:{r.desc}</p> : null;
            })()}
            <div className="divider" />
            <div className="frame-title">番號傳承</div>
            <p className="sub" style={{ marginTop: 0 }}>選最多 {MAX_HEIRS} 支老兵隊傳給下一個時代:轉成同定位的兵種、等級 −1、兵員補滿,保留番號與戰功。</p>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", textAlign: "left" }}>
              {track.roster.filter((r) => !r.commanderId).map((r) => {
                const on = heirs.includes(r.id);
                return (
                  <button
                    key={r.id}
                    className={`btn ${on ? "btn-primary" : ""}`}
                    style={{ justifyContent: "flex-start", flexDirection: "column", alignItems: "flex-start" }}
                    disabled={!on && heirs.length >= MAX_HEIRS}
                    onClick={() => onChooseHeirs(on ? heirs.filter((x) => x !== r.id) : [...heirs, r.id])}
                  >
                    <span>{on ? "✓ " : ""}{lineageName(r)}</span>
                    <span className="sub" style={{ fontSize: 12 }}>
                      {getSquadType(r.typeId).name}・{"★".repeat(r.level)}{r.honors?.length ? `・戰功 ${r.honors.length}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
