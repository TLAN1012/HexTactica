/**
 * BattleScreen — 全螢幕戰場
 *
 *  - 拖曳平移、滾輪 / 雙指縮放、「全圖」一鍵回到整張地圖
 *  - 點己方部隊:亮出移動範圍(金)與可攻擊目標(紅,虛線 = 要先移動)
 *  - 滑鼠:懸停敵人看預覽、點下去就打;觸控:第一下預覽、第二下出手
 *  - 目標格插金旗;回合上限、勝利目標在頂欄;援軍與新回合用橫幅提示
 *  - 見習難度可悔棋(限自己的回合)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audio, type SfxId } from "../audio/AudioManager";
import { hexCorners, hexDistance, hexKey, hexToPixel, parseHexKey, type Hex } from "../engine/hex";
import { chooseAiAction } from "../game/ai";
import {
  attackableFrom,
  battleReducer,
  bestAttackPosition,
  canAttack,
  canMove,
  livingSquads,
  reachable,
  reinforceInfo,
  squadAt,
  tracePath,
  turnLimit,
  type BattleAction,
} from "../game/battle";
import { previewAttack } from "../game/combat";
import { getCommander, getFaction } from "../game/factions";
import { aliveSoldiers, maxHpPool, maxSoldiers } from "../game/progression";
import { getTerrain } from "../game/terrain";
import { getSquadType } from "../game/units";
import type { AttackPreview, BattleState, FactionId, Squad } from "../game/types";
import { TRAIT_INFO, TRAIT_NAME } from "./traits";
import { spriteArt, SPRITE_FACES_LEFT, terrainArt } from "./assets";

const HEX = 40;
const AI_STEP_MS = 480;



export interface BattleScreenProps {
  battle: BattleState;
  onBattleChange: (next: BattleState) => void;
  onFinish: () => void;
  title: string;
  objectiveText?: string;
  playerFaction: FactionId;
  enemyFaction: FactionId;
  allowUndo?: boolean;
  /** 教學等外掛內容(疊在地圖上方) */
  overlay?: React.ReactNode;
  onExit?: () => void;
}

interface View {
  x: number;
  y: number;
  k: number;
}

export function BattleScreen(props: BattleScreenProps) {
  const { battle, onBattleChange, onFinish, title, objectiveText, playerFaction, enemyFaction, allowUndo, overlay, onExit } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverHex, setHoverHex] = useState<Hex | null>(null);
  const [armedTarget, setArmedTarget] = useState<string | null>(null);
  /** 查看中的敵方部隊(點敵人但不是攻擊時) */
  const [inspectId, setInspectId] = useState<string | null>(null);
  /** 最後點到的格(觸控沒有 hover,用它當地形資訊的焦點) */
  const [focusHex, setFocusHex] = useState<Hex | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [banner, setBanner] = useState<{ id: number; text: string; sub?: string } | null>(null);
  const [history, setHistory] = useState<BattleState[]>([]);
  const lastPointer = useRef<"mouse" | "touch" | "pen">("mouse");

  const colors = { player: getFaction(playerFaction).color, enemy: getFaction(enemyFaction).color };
  const isPlayerTurn = battle.activeSide === "player" && battle.outcome === "ongoing";
  const selected = selectedId ? battle.squads.find((s) => s.id === selectedId && s.hpPool > 0) : undefined;
  const limit = turnLimit(battle);

  const dispatch = (action: BattleAction) => {
    // 結束回合就不能再悔棋;其他動作把當下狀態存進悔棋歷史
    if (action.type === "END_TURN") setHistory([]);
    else if (allowUndo && battle.activeSide === "player") setHistory((h) => [...h.slice(-30), battle]);
    onBattleChange(battleReducer(battle, action));
  };

  // ── 音效 + 橫幅:依新增的戰鬥紀錄 ────────────────────────
  const seenLog = useRef(battle.log.length);
  useEffect(() => {
    const fresh = battle.log.slice(seenLog.current);
    seenLog.current = battle.log.length;
    for (const e of fresh) {
      let sfx: SfxId | null = null;
      if (e.kind === "attack") sfx = e.text.includes("射擊") ? "ranged" : "melee";
      else if (e.kind === "retaliate") sfx = "retaliate";
      else if (e.kind === "death") sfx = "death";
      else if (e.kind === "info" && e.text.startsWith("勝利")) sfx = "victory";
      else if (e.kind === "info" && e.text.startsWith("敗北")) sfx = "defeat";
      if (sfx) audio.playSfx(sfx);
      if (e.kind === "event" && e.turn > 1) setBanner({ id: Date.now(), text: "⚑ 戰況變化", sub: e.text });
      else if (e.kind === "info" && e.text.includes("我方行動")) setBanner({ id: Date.now(), text: `第 ${e.turn} 回合`, sub: limit ? `剩 ${limit - e.turn + 1} 回合` : undefined });
    }
  }, [battle.log, limit]);


  // ── AI 回合 ────────────────────────────────────────────
  useEffect(() => {
    if (battle.activeSide !== "enemy" || battle.outcome !== "ongoing") return;
    const t = setTimeout(() => {
      const action = chooseAiAction(battle, "enemy") ?? ({ type: "END_TURN" } as const);
      const next = battleReducer(battle, action);
      onBattleChange(next === battle ? battleReducer(battle, { type: "END_TURN" }) : next);
    }, AI_STEP_MS);
    return () => clearTimeout(t);
  }, [battle, onBattleChange]);

  // ── 選取、範圍、目標、預覽 ──────────────────────────────
  const reach = useMemo(() => {
    if (!selected || !isPlayerTurn || !canMove(selected)) return new Map<string, { pos: Hex; cost: number; from: string | null }>();
    return reachable(battle, selected);
  }, [battle, selected, isPlayerTurn]);

  const targets = useMemo(() => {
    const m = new Map<string, { target: Squad; pos: Hex; movedHexes: number }>();
    if (!selected || !isPlayerTurn || !canAttack(selected)) return m;
    for (const t of livingSquads(battle, "enemy")) {
      const best = bestAttackPosition(battle, selected, t);
      if (best) m.set(hexKey(t.pos), { target: t, pos: best.pos, movedHexes: best.movedHexes });
    }
    return m;
  }, [battle, selected, isPlayerTurn]);

  const direct = useMemo(() => {
    if (!selected || !canAttack(selected)) return new Set<string>();
    return new Set(attackableFrom(battle, selected).map((t) => hexKey(t.pos)));
  }, [battle, selected]);

  const previewKey = armedTarget ?? (hoverHex ? hexKey(hoverHex) : null);
  const preview: (AttackPreview & { target: Squad; from: Hex }) | null = useMemo(() => {
    if (!selected || !previewKey) return null;
    const opt = targets.get(previewKey);
    if (!opt) return null;
    return { ...previewAttack(battle, selected, opt.target, opt.pos, opt.movedHexes), target: opt.target, from: opt.pos };
  }, [battle, selected, previewKey, targets]);

  function attack(targetKey: string) {
    if (!selected) return;
    const opt = targets.get(targetKey);
    if (!opt) return;
    const range = getSquadType(selected.typeId).range;
    if (hexKey(opt.pos) === hexKey(selected.pos) && hexDistance(selected.pos, opt.target.pos) <= range) {
      dispatch({ type: "ATTACK", squadId: selected.id, targetId: opt.target.id });
    } else {
      dispatch({ type: "MOVE_AND_ATTACK", squadId: selected.id, to: opt.pos, movedHexes: opt.movedHexes, targetId: opt.target.id });
    }
    setSelectedId(null);
    setArmedTarget(null);
  }

  function onHexTap(h: Hex) {
    if (drag.current.moved) return;
    setFocusHex(h);
    if (!isPlayerTurn) return;
    const key = hexKey(h);
    const who = squadAt(battle, h);

    setInspectId(null);
    if (who && who.side === "player") {
      setArmedTarget(null);
      setSelectedId(who.acted || who.id === selectedId ? null : who.id);
      return;
    }
    if (who && who.side === "enemy" && selected && targets.has(key)) {
      if (lastPointer.current === "touch" && armedTarget !== key) {
        setArmedTarget(key); // 觸控:第一下只預覽
        return;
      }
      attack(key);
      return;
    }
    if (who && who.side === "enemy") {
      // 打不到(或沒選部隊):顯示敵方資料
      setInspectId(who.id);
      setArmedTarget(null);
      return;
    }
    if (selected && reach.has(key)) {
      const path = tracePath(selected, reach, h);
      dispatch({ type: "MOVE", squadId: selected.id, to: h, movedHexes: path.length - 1 });
      setArmedTarget(null);
      return;
    }
    setArmedTarget(null);
    setSelectedId(null);
  }

  // ── 幾何與鏡頭 ──────────────────────────────────────────
  const hexEntries = useMemo(() => Object.entries(battle.terrain), [battle.terrain]);
  const bounds = useMemo(() => {
    const px = hexEntries.map(([k]) => hexToPixel(parseHexKey(k), HEX));
    return {
      minX: Math.min(...px.map((p) => p.x)) - HEX,
      minY: Math.min(...px.map((p) => p.y)) - HEX,
      maxX: Math.max(...px.map((p) => p.x)) + HEX,
      maxY: Math.max(...px.map((p) => p.y)) + HEX,
    };
  }, [hexEntries]);
  const corners = hexCorners(HEX);
  const pts = corners.map((c) => `${c.x},${c.y}`).join(" ");

  const mapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });

  /** 貼合全圖(純計算,只依賴地圖範圍) */
  const fitView = useCallback((w: number, h: number): View => {
    const mw = bounds.maxX - bounds.minX;
    const mh = bounds.maxY - bounds.minY;
    const k = Math.min(w / mw, h / mh) * 0.98;
    return { k, x: (w - mw * k) / 2 - bounds.minX * k, y: (h - mh * k) / 2 - bounds.minY * k };
  }, [bounds]);

  /** 開場與視窗大小改變時貼合全圖;手機上整張圖太小,改用 0.75 倍並置中,讓棋子看得清楚(可拖曳) */
  const initialView = useCallback((w: number, h: number): View => {
    const f = fitView(w, h);
    const minK = 0.75;
    if (!(f.k < minK && w < 700)) return f;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return { k: minK, x: w / 2 - cx * minK, y: h / 2 - cy * minK };
  }, [fitView, bounds]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    // ResizeObserver 一掛上就會回呼一次:在回呼(非 render)裡同時更新尺寸與鏡頭
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize({ w, h });
      setView(initialView(w, h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [initialView]);

  const zoomAt = (cx: number, cy: number, factor: number) => {
    setView((v) => {
      const fit = fitView(size.w, size.h).k;
      const k = Math.min(3, Math.max(fit * 0.7, v.k * factor));
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  };

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: false, startX: 0, startY: 0, pinch: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    lastPointer.current = e.pointerType as "mouse" | "touch" | "pen";
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current.moved = false;
    drag.current.startX = e.clientX;
    drag.current.startY = e.clientY;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = mapRef.current!.getBoundingClientRect();
      if (drag.current.pinch > 0) zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, d / drag.current.pinch);
      drag.current.pinch = d;
      drag.current.moved = true;
      return;
    }
    if (Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY) > 8) drag.current.moved = true;
    if (drag.current.moved) {
      setView((v) => ({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }));
      mapRef.current?.classList.add("dragging");
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) drag.current.pinch = 0;
    mapRef.current?.classList.remove("dragging");
    // 拖曳結束後的 click 不算點格子
    setTimeout(() => (drag.current.moved = false), 0);
  };
  const onWheel = (e: React.WheelEvent) => {
    const rect = mapRef.current!.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  // ── 繪製 ────────────────────────────────────────────────
  const objectives = new Set(battle.objectiveHexes);
  const enemiesLeft = livingSquads(battle, "enemy").length;
  const playersLeft = livingSquads(battle, "player").length;

  return (
    <div className="battle">
      <div className="battle-top">
        {onExit && (
          <button className="btn btn-sm btn-ghost" onClick={onExit} title="撤退">
            ✕
          </button>
        )}
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-ui)", color: "var(--gold-2)", fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          {objectiveText && (
            <div className="sub" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={objectiveText}>
              ⚑ {objectiveText}
            </div>
          )}
        </div>
        <span className="chip" title="回合">
          回合 {battle.turn}
          {limit ? ` / ${limit}` : ""}
        </span>
        {battle.gold > 0 || battle.goldSpent > 0 ? <span className="chip" style={{ color: "var(--gold-2)" }}>🪙 {battle.gold}</span> : null}
        <span className="chip" style={{ color: colors.player }}>我 {playersLeft}</span>
        <span className="chip" style={{ color: colors.enemy }}>敵 {enemiesLeft}</span>
      </div>

      <div
        className="battle-map"
        ref={mapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <svg>
          <defs>
            <clipPath id="hexClip">
              <polygon points={pts} />
            </clipPath>
            <clipPath id="tokenClip">
              <circle r={HEX * 0.7} />
            </clipPath>
            <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
              <stop offset="60%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
            </radialGradient>
          </defs>
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {hexEntries.map(([key, tid]) => {
              const h = parseHexKey(key);
              const { x, y } = hexToPixel(h, HEX);
              const t = getTerrain(tid);
              const inReach = reach.has(key);
              const isTarget = targets.has(key);
              const hovered = hoverHex && hexKey(hoverHex) === key;
              return (
                <g
                  key={key}
                  transform={`translate(${x},${y})`}
                  onClick={() => onHexTap(h)}
                  onMouseEnter={() => setHoverHex(h)}
                  onMouseLeave={() => setHoverHex(null)}
                >
                  <polygon points={pts} fill={t.color} />
                  {t.hasArt && (
                    <image
                      href={terrainArt(tid)}
                      x={-HEX * 1.05}
                      y={-HEX * 1.05}
                      width={HEX * 2.1}
                      height={HEX * 2.1}
                      clipPath="url(#hexClip)"
                      preserveAspectRatio="xMidYMid slice"
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  <polygon points={pts} fill="rgba(236,222,190,0.30)" style={{ pointerEvents: "none" }} />
                  <polygon points={pts} fill="url(#vignette)" stroke="rgba(40,28,20,0.55)" strokeWidth={1} style={{ pointerEvents: "none" }} />
                  {objectives.has(key) && (
                    <g style={{ pointerEvents: "none" }} transform={`translate(${-HEX * 0.35},${-HEX * 0.55})`}>
                      <line x1={0} y1={0} x2={0} y2={HEX * 0.75} stroke="#3a2a14" strokeWidth={2} />
                      <path d={`M0,0 L${HEX * 0.5},${HEX * 0.12} L0,${HEX * 0.26} Z`} fill="#e0b84a" stroke="#7a5a1a" strokeWidth={1} />
                    </g>
                  )}
                  {inReach && <polygon points={pts} fill="rgba(240,213,138,0.28)" stroke="rgba(240,213,138,0.95)" strokeWidth={1.6} style={{ pointerEvents: "none" }} />}
                  {isTarget && (
                    <polygon
                      points={pts}
                      fill={armedTarget === key ? "rgba(224,60,60,0.5)" : "rgba(200,30,40,0.3)"}
                      stroke="#ff4a4a"
                      strokeWidth={2.4}
                      strokeDasharray={direct.has(key) ? undefined : "7 5"}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  {hovered && <polygon points={pts} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.6} style={{ pointerEvents: "none" }} />}
                </g>
              );
            })}

            {preview && selected && hexKey(preview.from) !== hexKey(selected.pos) && (
              <circle
                cx={hexToPixel(preview.from, HEX).x}
                cy={hexToPixel(preview.from, HEX).y}
                r={HEX * 0.3}
                fill="none"
                stroke="#f0d58a"
                strokeWidth={2}
                strokeDasharray="4 3"
                style={{ pointerEvents: "none" }}
              />
            )}

            {livingSquads(battle).map((s) => (
              <SquadToken
                key={s.id}
                squad={s}
                color={colors[s.side]}
                selected={s.id === selectedId}
                dimmed={s.side === "player" && isPlayerTurn && s.acted}
                pts={pts}
              />
            ))}
          </g>
        </svg>

        <div className="zoom-ctl">
          <button className="btn" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.25)} aria-label="放大">＋</button>
          <button className="btn" onClick={() => zoomAt(size.w / 2, size.h / 2, 0.8)} aria-label="縮小">－</button>
          <button className="btn" style={{ fontSize: 12 }} onClick={() => setView(fitView(size.w, size.h))} aria-label="全圖">全圖</button>
        </div>

        {preview && (
          <div className="frame preview fade-in">
            <div className="row" style={{ gap: 8 }}>
              <strong style={{ color: "#ff8a7a" }}>
                預計擊倒 {preview.minKills}–{preview.maxKills} 人
              </strong>
              {preview.chargeBonus > 0 && <span style={{ color: "var(--gold-2)" }}>衝鋒 +{Math.round(preview.chargeBonus * 100)}%</span>}
              {preview.usesMeleeFallback && <span style={{ color: "var(--bad)" }}>⚠ 被迫近戰</span>}
              {preview.willRetaliate ? (
                <span>↩ 反擊損失 {preview.retaliationMinKills}–{preview.retaliationMaxKills} 人</span>
              ) : (
                <span className="sub">不會被反擊</span>
              )}
            </div>
            {preview.notes.length > 0 && <div className="sub" style={{ marginTop: 4 }}>{preview.notes.join("・")}</div>}
            {armedTarget && (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => attack(armedTarget)}>⚔ 出擊</button>
                <button className="btn btn-sm" onClick={() => setArmedTarget(null)}>取消</button>
              </div>
            )}
          </div>
        )}

        {(hoverHex ?? focusHex) && <TerrainCard battle={battle} hex={(hoverHex ?? focusHex)!} />}
        {selected && !preview && (
          <UnitCard
            squad={selected}
            color={colors.player}
            action={(() => {
              const info = reinforceInfo(battle, selected);
              if (info.soldiers <= 0) return null;
              return (
                <button
                  className="btn btn-sm"
                  style={{ marginTop: 6 }}
                  disabled={!info.ok}
                  title="補回滿編 20% 的兵力,價格是平常補兵的 3 倍,並用掉這隊本回合的行動。每場每隊一次,不能在交戰中整補。"
                  onClick={() => {
                    dispatch({ type: "REINFORCE", squadId: selected.id });
                    setSelectedId(null);
                  }}
                >
                  {info.ok ? `🛡 緊急整補 +${info.soldiers} 人(${info.cost} 金)` : `緊急整補:${info.reason}`}
                </button>
              );
            })()}
          />
        )}
        {!selected && inspectId && (() => {
          const foe = battle.squads.find((x) => x.id === inspectId && x.hpPool > 0);
          return foe ? <UnitCard squad={foe} color={colors.enemy} /> : null;
        })()}

        {logOpen && (
          <div className="frame log open fade-in">
            {battle.log.slice(-60).map((e, i) => (
              <div key={i} style={{ color: LOG_COLOR[e.kind] }}>
                {e.text}
              </div>
            ))}
          </div>
        )}

        {banner && (
          <div key={banner.id} className="banner" onAnimationEnd={() => setBanner(null)}>
            <div className="title-display" style={{ fontSize: "clamp(26px, 6vw, 44px)" }}>{banner.text}</div>
            {banner.sub && <div className="frame" style={{ marginTop: 10, fontSize: 15, maxWidth: 520 }}>{banner.sub}</div>}
          </div>
        )}

        {battle.activeSide === "enemy" && battle.outcome === "ongoing" && (
          <div className="chip" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 10, color: colors.enemy, zIndex: 4, background: "rgba(13,10,12,0.85)" }}>
            ⚔ 敵軍行動中…
          </div>
        )}

        {overlay}

        {battle.outcome !== "ongoing" && (
          <div className="outcome fade-in">
            <div className="frame" style={{ textAlign: "center", padding: "24px 28px", maxWidth: 420 }}>
              <div className="title-display" style={{ fontSize: 40 }}>{battle.outcome === "victory" ? "Victoria" : "Defeat"}</div>
              <div style={{ fontSize: 22, margin: "6px 0 4px", color: battle.outcome === "victory" ? "var(--gold-2)" : "var(--bad)" }}>
                {battle.outcome === "victory" ? "勝利" : "敗北"}
              </div>
              <div className="sub" style={{ marginBottom: 16 }}>{battle.outcomeReason}</div>
              <button className="btn btn-primary btn-lg" onClick={onFinish}>繼續</button>
            </div>
          </div>
        )}
      </div>

      <div className="battle-bottom">
        <button className="btn btn-sm" onClick={() => setLogOpen((o) => !o)}>📜 紀錄</button>
        {allowUndo && (
          <button
            className="btn btn-sm"
            disabled={!isPlayerTurn || history.length === 0}
            onClick={() => {
              const prev = history[history.length - 1];
              if (prev) {
                setHistory((h) => h.slice(0, -1));
                setSelectedId(null);
                setArmedTarget(null);
                onBattleChange(prev);
              }
            }}
          >
            ↶ 悔棋
          </button>
        )}
        <div className="grow sub" style={{ fontSize: 13, textAlign: "center" }}>
          {isPlayerTurn
            ? selected
              ? selected.moved
                ? "已移動:可以攻擊,或點別的部隊"
                : "金色 = 可移動・紅色 = 可攻擊"
              : `還有 ${livingSquads(battle, "player").filter((s) => !s.acted).length} 隊可行動`
            : battle.outcome === "ongoing"
              ? "敵軍回合"
              : ""}
        </div>
        {battle.outcome === "ongoing" && (
          <button
            className="btn btn-primary"
            disabled={!isPlayerTurn}
            onClick={() => {
              setSelectedId(null);
              setArmedTarget(null);
              dispatch({ type: "END_TURN" });
            }}
          >
            結束回合 ▸
          </button>
        )}
      </div>
    </div>
  );
}

const LOG_COLOR: Record<string, string> = {
  move: "#8a8078",
  attack: "#f4a6a0",
  retaliate: "#f0c870",
  death: "#ff7a7a",
  info: "#a8c4f0",
  event: "#f0d58a",
};

/** 小隊 = 幾個小人(看形狀就知道兵種);指揮官隊與器械只畫一個。人數徽章保留 */
function SquadToken({ squad, color, selected, dimmed, pts }: { squad: Squad; color: string; selected: boolean; dimmed: boolean; pts: string }) {
  const { x, y } = hexToPixel(squad.pos, HEX);
  const alive = aliveSoldiers(squad);
  const ratio = squad.hpPool / maxHpPool(squad.typeId, squad.level);
  const type = getSquadType(squad.typeId);
  const spriteId = squad.commanderId ? `cmd-${squad.commanderId}` : squad.typeId;
  const single = !!squad.commanderId || !!type.single;
  // 我方朝右、敵方朝左
  const facesLeft = SPRITE_FACES_LEFT.has(spriteId);
  const flip = (squad.side === "player") === facesLeft;
  const big = HEX * 1.25;
  const small = HEX * 0.95;
  const figures = single
    ? [{ dx: 0, dy: -HEX * 0.1, size: big }]
    : [
        { dx: -HEX * 0.42, dy: -HEX * 0.22, size: small },
        { dx: HEX * 0.42, dy: -HEX * 0.22, size: small },
        { dx: 0, dy: HEX * 0.02, size: small },
      ];
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: "none", opacity: dimmed ? 0.55 : 1 }}>
      <polygon points={pts} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={0} cy={HEX * 0.5} rx={HEX * 0.72} ry={HEX * 0.16} fill="rgba(0,0,0,0.35)" />
      {figures.map((f, i) => (
        <image
          key={i}
          href={spriteArt(spriteId)}
          x={f.dx - f.size / 2}
          y={f.dy + HEX * 0.55 - f.size}
          width={f.size}
          height={f.size}
          preserveAspectRatio="xMidYMax meet"
          transform={flip ? `translate(${2 * f.dx},0) scale(-1,1)` : undefined}
          style={{ filter: dimmed ? "grayscale(0.8)" : "drop-shadow(0 1px 1px rgba(0,0,0,0.7))" }}
        />
      ))}
      {selected && <polygon points={pts} fill="none" stroke="#f0d58a" strokeWidth={3.4} style={{ filter: "drop-shadow(0 0 6px #f0d58a)" }} />}
      {squad.commanderId && (
        <text x={-HEX * 0.55} y={-HEX * 0.5} textAnchor="middle" fontSize={15} style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 3 }} fill="#f0d58a">
          ♛
        </text>
      )}
      <g transform={`translate(${HEX * 0.52},${HEX * 0.5})`}>
        <rect x={-14} y={-10} width={28} height={18} rx={3} fill={color} stroke="#0d0a0c" strokeWidth={1} />
        <text x={0} y={4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff" fontFamily="Cinzel, serif">
          {alive}
        </text>
      </g>
      {squad.level > 1 && (
        <text x={-HEX * 0.62} y={HEX * 0.62} fontSize={11} fill="#f0d58a" style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 2.5 }}>
          {"★".repeat(squad.level - 1)}
        </text>
      )}
      <g transform={`translate(0,${HEX * 0.86})`}>
        <rect x={-HEX * 0.55} y={-2} width={HEX * 1.1} height={5} fill="rgba(0,0,0,0.75)" rx={2} />
        <rect x={-HEX * 0.55 + 0.6} y={-1.3} width={(HEX * 1.1 - 1.2) * Math.max(0, Math.min(1, ratio))} height={3.6} rx={1.5} fill={ratio > 0.66 ? "#7fcf86" : ratio > 0.33 ? "#e6c060" : "#e06464"} />
      </g>
    </g>
  );
}

function UnitCard({ squad, color, action }: { squad: Squad; color: string; action?: React.ReactNode }) {
  const t = getSquadType(squad.typeId);
  const cmd = squad.commanderId ? getCommander(squad.commanderId) : null;
  const enemy = squad.side === "enemy";
  const traits = t.traits.filter((x) => x !== "levy");
  return (
    <div className="frame unit-card fade-in">
      <img src={spriteArt(squad.commanderId ? `cmd-${squad.commanderId}` : squad.typeId)} width={64} height={64} alt="" style={{ objectFit: "contain", flex: "none" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color }}>
          {enemy ? "敵方・" : ""}
          {cmd ? `♛ ${cmd.name}・` : ""}
          {t.name} <span className="stars">{"★".repeat(squad.level - 1)}</span>
        </div>
        {enemy ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 2 }}>{t.desc}</div>
            {traits.length > 0 && <div style={{ fontSize: 12.5, color: "var(--gold-2)", marginTop: 2 }}>特性:{traits.map((x) => TRAIT_NAME[x]).join("、")}</div>}
            {cmd && <div className="sub" style={{ fontSize: 12 }}>指揮官:周圍的部隊更勇猛</div>}
          </>
        ) : (
          <>
            <div className="sub" style={{ fontSize: 12.5 }}>
              {aliveSoldiers(squad)}/{maxSoldiers(squad.typeId, squad.level)} 人・移動 {t.move}・射程 {t.range}
            </div>
            {traits.map((tr) => (
              <div key={tr} style={{ fontSize: 12, color: "var(--gold-2)" }}>
                {TRAIT_INFO[tr]}
              </div>
            ))}
            {action}
          </>
        )}
      </div>
    </div>
  );
}

/** 焦點格的地形與它帶來的加減成 */
function TerrainCard({ battle, hex }: { battle: BattleState; hex: Hex }) {
  const tid = battle.terrain[hexKey(hex)];
  if (!tid) return null;
  const t = getTerrain(tid);
  const effects: { text: string; good: boolean }[] = [];
  if (t.impassable) effects.push({ text: "無法通行", good: false });
  else effects.push({ text: `移動消耗 ${t.moveCost}`, good: t.moveCost <= 1 });
  if (t.defense > 0) effects.push({ text: `承傷 −${Math.round(t.defense * 100)}%`, good: true });
  if (t.defense < 0) effects.push({ text: `承傷 +${Math.round(-t.defense * 100)}%`, good: false });
  if (t.noCharge) effects.push({ text: "不能衝鋒", good: false });
  if (tid === "hills") effects.push({ text: "敵騎往上衝鋒減半", good: true });
  if (battle.objectiveHexes.includes(hexKey(hex))) effects.push({ text: "⚑ 目標格", good: true });
  return (
    <div className="frame terrain-card fade-in">
      <div className="row" style={{ gap: 6 }}>
        <img src={terrainArt(tid)} width={26} height={26} alt="" style={{ borderRadius: 3, border: "1px solid var(--line)" }} />
        <strong>{t.name}</strong>
      </div>
      <div className="row" style={{ gap: 4, marginTop: 4 }}>
        {effects.map((e) => (
          <span key={e.text} className="chip" style={{ color: e.good ? "var(--good)" : "var(--bad)", fontSize: 11.5 }}>
            {e.text}
          </span>
        ))}
      </div>
    </div>
  );
}
