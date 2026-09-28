/**
 * 軍營:名冊(補兵、解散)與招募。每條戰役線各自的陣營兵種。
 */
import { maxRoster, recruitableTypes, recruitSquad, replenishCost, replenishSquad, dismissSquad, trackFaction } from "../game/campaign";
import { getCommander } from "../game/factions";
import { maxSoldiers, XP_THRESHOLDS, MAX_LEVEL } from "../game/progression";
import { getSquadType } from "../game/units";
import type { CampaignTrack } from "../game/types";
import { unitArt } from "./assets";
import { getRelic } from "../game/legacy";
import { TRAIT_INFO } from "./traits";

export function ArmyScreen({ track, trackId, relics, onChange, onBack }: {
  track: CampaignTrack;
  trackId: string;
  relics: string[];
  onChange: (t: CampaignTrack) => void;
  onBack: () => void;
}) {
  const types = recruitableTypes(trackFaction(trackId));
  const limit = maxRoster(trackId);
  const full = track.roster.length >= limit;
  return (
    <div className="screen">
      <div className="content">
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>‹ 返回</button>
          <h1 className="h1 grow">軍營</h1>
          <span className="gold">🪙 {track.gold}</span>
        </div>

        <div className="frame">
          <div className="frame-title">名冊 {track.roster.length} / {limit}</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {track.roster.map((r) => {
              const t = getSquadType(r.typeId);
              const max = maxSoldiers(r.typeId, r.level);
              const cost = replenishCost(r);
              const nextXp = r.level < MAX_LEVEL ? XP_THRESHOLDS[r.level] : null;
              return (
                <div key={r.id} className="frame" style={{ padding: 12 }}>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <img src={unitArt(r.typeId)} alt="" className="token" width={60} height={60} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>
                        {r.commanderId ? `♛ ${getCommander(r.commanderId).name}・` : ""}
                        {t.name}
                      </div>
                      {r.lineage && <div style={{ fontSize: 12, color: "var(--gold-2)" }}>⚜ {r.lineage}</div>}
                      {r.honors && r.honors.length > 0 && <div className="sub" style={{ fontSize: 11.5 }} title={r.honors.join("、")}>戰功:{r.honors.slice(-3).join("、")}{r.honors.length > 3 ? "…" : ""}</div>}
                      <div className="stars">{"★".repeat(r.level)}<span className="sub">{"☆".repeat(MAX_LEVEL - r.level)}</span></div>
                      <div className="sub" style={{ fontSize: 12 }}>{r.soldiers} / {max} 人{nextXp !== null ? `・經驗 ${r.xp}/${nextXp}` : "・滿級"}</div>
                      <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${(r.soldiers / max) * 100}%` }} /></div>
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn btn-sm grow" disabled={cost === 0 || track.gold < t.soldierCost} onClick={() => onChange(replenishSquad(track, r.id))}>
                      {cost === 0 ? "滿編" : `補兵 ${Math.min(cost, Math.floor(track.gold / t.soldierCost) * t.soldierCost)} 金`}
                    </button>
                    {!r.commanderId && (
                      <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm(`解散這隊${t.name}?`)) onChange(dismissSquad(track, r.id)); }}>解散</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {relics.length > 0 && trackId !== "fantasy" && (
          <div className="frame" style={{ marginTop: 18 }}>
            <div className="frame-title">遺物(裝備一件,全軍生效)</div>
            <div className="row">
              <button className={`btn btn-sm ${!track.relic ? "btn-primary" : ""}`} onClick={() => onChange({ ...track, relic: undefined })}>不裝備</button>
              {relics.map((id) => {
                const r = getRelic(id);
                return r ? (
                  <button key={id} className={`btn btn-sm ${track.relic === id ? "btn-primary" : ""}`} title={r.desc} onClick={() => onChange({ ...track, relic: id })}>
                    ⚜ {r.name}
                  </button>
                ) : null;
              })}
            </div>
            {track.relic && <p className="sub">{getRelic(track.relic)?.desc}</p>}
          </div>
        )}

        <div className="frame" style={{ marginTop: 18 }}>
          <div className="frame-title">招募</div>
          {full && <p className="sub" style={{ marginTop: 0 }}>名冊已滿({limit} 隊)。要招新兵,先解散一隊。</p>}
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {types.map((t) => (
              <div key={t.id} className="frame" style={{ padding: 12 }}>
                <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <img src={unitArt(t.id)} alt="" className="token" width={60} height={60} />
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div className="sub" style={{ fontSize: 12 }}>{t.soldiers} 人・血 {t.hp}・傷 {t.dmg[0]}–{t.dmg[1]}・甲 {Math.round(t.defense * 100)}%・移 {t.move}・射 {t.range}</div>
                    <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.6 }}>{t.desc}</div>
                    {t.traits.filter((x) => x !== "levy").map((tr) => <div key={tr} style={{ fontSize: 12, color: "var(--gold-2)" }}>{TRAIT_INFO[tr]}</div>)}
                  </div>
                </div>
                <button className="btn btn-sm btn-block" style={{ marginTop: 10 }} disabled={track.gold < t.cost || full} onClick={() => onChange(recruitSquad(track, t.id, limit))}>
                  {full ? "名冊已滿" : track.gold < t.cost ? `招募 ${t.cost} 金(還差 ${t.cost - track.gold})` : `招募 ${t.cost} 金`}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
