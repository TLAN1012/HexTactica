/**
 * 戰役選單:歷史戰爭(依時代)+ 奇幻外傳;難度切換。
 */
import { useState } from "react";
import { getDifficulty } from "../game/difficulty";
import { MISSIONS } from "../game/missions";
import { FANTASY_TRACK, getScenario, WARS } from "../game/scenarios";
import type { CampaignState, DifficultyId } from "../game/types";
import { storyArt, artUrl } from "./assets";
import { DifficultyPicker } from "./TitleScreen";
import { MuteButton } from "./MuteButton";

const COMING = [
  { title: "拿破崙戰爭", years: "1805–1815", note: "奧斯特里茨・滑鐵盧——線列、方陣與大砲" },
  { title: "韓戰", years: "1950", note: "釜山防線・仁川・長津湖——戰車、火砲與空中支援" },
];

export function HubScreen({ campaign, onOpenWar, onOpenFantasy, onDifficulty, onTutorial, onTitle }: {
  campaign: CampaignState;
  onOpenWar: (warId: string) => void;
  onOpenFantasy: () => void;
  onDifficulty: (d: DifficultyId) => void;
  onTutorial: () => void;
  onTitle: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const fantasy = campaign.tracks[FANTASY_TRACK];
  return (
    <div className="screen">
      <div className="content">
        <div className="row" style={{ marginBottom: 18 }}>
          <h1 className="h1 grow">戰役選單</h1>
          <button className="btn btn-sm" onClick={() => setPicking(true)}>難度:{getDifficulty(campaign.difficulty).name}</button>
          <button className="btn btn-sm" onClick={onTutorial}>📖 教學</button>
          <button className="btn btn-sm btn-ghost" onClick={onTitle}>標題</button>
          <MuteButton />
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {WARS.map((w) => {
            const t = campaign.tracks[w.id];
            const stage = t.stage ?? 0;
            return (
              <button key={w.id} className="frame fade-in" style={{ padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", color: "inherit" }} onClick={() => onOpenWar(w.id)}>
                <div style={{ height: 150, backgroundImage: `url(${storyArt(w.id === "war-1066" ? "title.webp" : w.battles.length ? getScenario(w.battles[w.battles.length - 1].scenarioId).art ?? w.mapArt : w.mapArt)})`, backgroundSize: "cover", backgroundPosition: "center 30%" }} />
                <div style={{ padding: 14 }}>
                  <div className="row">
                    <span className="h1 grow" style={{ fontSize: 20 }}>{w.title}</span>
                    <span className="chip">{w.years}</span>
                  </div>
                  <div className="sub">{w.subtitle}</div>
                  <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${(Math.min(stage, w.battles.length) / w.battles.length) * 100}%` }} /></div>
                  <div className="sub" style={{ fontSize: 12, marginTop: 4 }}>
                    {stage >= w.battles.length ? "戰爭已結束 — 可重溫" : `第 ${stage + 1} / ${w.battles.length} 戰`}・🪙 {t.gold}
                  </div>
                </div>
              </button>
            );
          })}

          <button className="frame fade-in" style={{ padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", color: "inherit" }} onClick={onOpenFantasy}>
            <div style={{ height: 150, backgroundImage: `url(${artUrl("units/orc-warrior.png")})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div style={{ padding: 14 }}>
              <div className="row">
                <span className="h1 grow" style={{ fontSize: 20 }}>奇幻外傳:碎顱之戰</span>
                <span className="chip">外傳</span>
              </div>
              <div className="sub">原版十關獸人戰役,招兵升級的經營玩法</div>
              <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${(fantasy.completedMissions.length / MISSIONS.length) * 100}%` }} /></div>
              <div className="sub" style={{ fontSize: 12, marginTop: 4 }}>{fantasy.completedMissions.length} / {MISSIONS.length} 關・🪙 {fantasy.gold}</div>
            </div>
          </button>

          {COMING.map((c) => (
            <div key={c.title} className="frame" style={{ opacity: 0.55 }}>
              <div className="row">
                <span className="h1 grow" style={{ fontSize: 18 }}>{c.title}</span>
                <span className="chip">{c.years}</span>
              </div>
              <div className="sub" style={{ marginTop: 6 }}>{c.note}</div>
              <div className="chip" style={{ marginTop: 10 }}>🔒 即將推出</div>
            </div>
          ))}
        </div>
      </div>
      {picking && <DifficultyPicker value={campaign.difficulty} onPick={(d) => { setPicking(false); onDifficulty(d); }} onCancel={() => setPicking(false)} />}
    </div>
  );
}
