/**
 * BattleScreen — 戰鬥主畫面
 *
 *  - 點己方小隊:亮出移動範圍(黃)與可攻擊目標(紅,含移動後打得到的)
 *  - 點敵人:自動移動到最佳攻擊位並攻擊(WoA 式一鍵攻擊)
 *  - 懸停敵人:傷害預覽(預計殺傷 / 反擊損失)
 *  - 敵方回合由 AI 逐步自動執行
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { audio, type SfxId } from "../audio/AudioManager";
import {
  hexCorners,
  hexDistance,
  hexKey,
  hexToPixel,
  parseHexKey,
  type Hex,
} from "../engine/hex";
import {
  attackableFrom,
  battleReducer,
  bestAttackPosition,
  canAttack,
  canMove,
  livingSquads,
  reachable,
  squadAt,
  tracePath,
  type BattleAction,
} from "../game/battle";
import { chooseAiAction } from "../game/ai";
import { previewAttack } from "../game/combat";
import { aliveSoldiers, maxHpPool, maxSoldiers } from "../game/progression";
import { getTerrain } from "../game/terrain";
import { getSquadType } from "../game/units";
import type { AttackPreview, BattleState, Squad } from "../game/types";
import { BattleLog } from "./BattleLog";

const HEX_SIZE = 30;
const ART = import.meta.env.BASE_URL + "art/";
const TERRAIN_COVER = 1.18;
const UNIT_COVER = 1.12;
const AI_STEP_MS = 550;

const SIDE_COLOR: Record<string, string> = {
  player: "#2e6fd8",
  enemy: "#c23b2b",
};

export interface BattleScreenProps {
  battle: BattleState;
  onBattleChange: (next: BattleState) => void;
  onFinish: () => void;
  missionTitle: string;
}

export function BattleScreen({ battle, onBattleChange, onFinish, missionTitle }: BattleScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredHex, setHoveredHex] = useState<Hex | null>(null);

  const dispatch = (action: BattleAction) => {
    onBattleChange(battleReducer(battle, action));
  };

  const selected = selectedId
    ? battle.squads.find((s) => s.id === selectedId && s.hpPool > 0)
    : undefined;

  const isPlayerTurn = battle.activeSide === "player" && battle.outcome === "ongoing";

  // ── 音效:對每筆新增的戰鬥紀錄播放對應音效 ─────────
  const seenLogCount = useRef(battle.log.length);
  useEffect(() => {
    const fresh = battle.log.slice(seenLogCount.current);
    seenLogCount.current = battle.log.length;
    for (const e of fresh) {
      let sfx: SfxId | null = null;
      if (e.kind === "attack") sfx = e.text.includes("射擊") ? "ranged" : "melee";
      else if (e.kind === "retaliate") sfx = "retaliate";
      else if (e.kind === "death") sfx = "death";
      else if (e.kind === "info" && e.text.includes("勝利")) sfx = "victory";
      else if (e.kind === "info" && e.text.includes("敗北")) sfx = "defeat";
      if (sfx) audio.playSfx(sfx);
    }
  }, [battle.log]);

  // ── AI 回合:逐步執行(每次 battle 變動重排下一步) ──
  useEffect(() => {
    if (battle.activeSide !== "enemy" || battle.outcome !== "ongoing") return;
    const timer = setTimeout(() => {
      const action = chooseAiAction(battle) ?? ({ type: "END_TURN" } as const);
      onBattleChange(battleReducer(battle, action));
    }, AI_STEP_MS);
    return () => clearTimeout(timer);
  }, [battle, onBattleChange]);

  // ── 選中小隊的移動範圍與攻擊目標 ─────────────────────
  const reach = useMemo(() => {
    if (!selected || !isPlayerTurn || !canMove(selected)) return new Map<string, { pos: Hex; cost: number; from: string | null }>();
    return reachable(battle, selected);
  }, [battle, selected, isPlayerTurn]);

  /** 此回合可攻擊的所有敵人(含移動後打得到的) */
  const attackTargets = useMemo(() => {
    const map = new Map<string, { target: Squad; pos: Hex; movedHexes: number }>();
    if (!selected || !isPlayerTurn || !canAttack(selected)) return map;
    for (const t of livingSquads(battle, "enemy")) {
      const best = bestAttackPosition(battle, selected, t);
      if (best) map.set(hexKey(t.pos), { target: t, pos: best.pos, movedHexes: best.movedHexes });
    }
    return map;
  }, [battle, selected, isPlayerTurn]);

  // ── 懸停敵人 → 傷害預覽 ─────────────────────────────
  const hoverPreview: (AttackPreview & { target: Squad }) | null = useMemo(() => {
    if (!selected || !hoveredHex) return null;
    const opt = attackTargets.get(hexKey(hoveredHex));
    if (!opt) return null;
    return { ...previewAttack(battle, selected, opt.target, opt.pos, opt.movedHexes), target: opt.target };
  }, [battle, selected, hoveredHex, attackTargets]);

  // ── 點擊處理 ────────────────────────────────────────
  function handleHexClick(h: Hex) {
    if (!isPlayerTurn) return;
    const clicked = squadAt(battle, h);
    const key = hexKey(h);

    if (clicked && clicked.side === "player") {
      if (clicked.acted) {
        setSelectedId(null);
        return;
      }
      setSelectedId(clicked.id === selectedId ? null : clicked.id);
      return;
    }

    if (clicked && clicked.side === "enemy" && selected) {
      const opt = attackTargets.get(key);
      if (!opt) return;
      if (hexDistance(selected.pos, clicked.pos) <= getSquadType(selected.typeId).range && canAttack(selected)) {
        dispatch({ type: "ATTACK", squadId: selected.id, targetId: clicked.id });
      } else {
        dispatch({
          type: "MOVE_AND_ATTACK",
          squadId: selected.id,
          to: opt.pos,
          movedHexes: opt.movedHexes,
          targetId: clicked.id,
        });
      }
      setSelectedId(null);
      return;
    }

    // 空格:移動(保持選取,移動後還能攻擊)
    if (selected && reach.has(key)) {
      const path = tracePath(selected, reach, h);
      dispatch({ type: "MOVE", squadId: selected.id, to: h, movedHexes: path.length - 1 });
      return;
    }

    setSelectedId(null);
  }

  // ── 幾何 ────────────────────────────────────────────
  const terrainEntries = useMemo(() => Object.entries(battle.terrain), [battle.terrain]);
  const pixels = terrainEntries.map(([key]) => hexToPixel(parseHexKey(key), HEX_SIZE));
  const minX = Math.min(...pixels.map((p) => p.x)) - HEX_SIZE * 1.2;
  const minY = Math.min(...pixels.map((p) => p.y)) - HEX_SIZE * 1.2;
  const maxX = Math.max(...pixels.map((p) => p.x)) + HEX_SIZE * 1.2;
  const maxY = Math.max(...pixels.map((p) => p.y)) + HEX_SIZE * 1.4;
  const corners = hexCorners(HEX_SIZE);
  const pointsStr = corners.map((c) => `${c.x},${c.y}`).join(" ");

  // 遠程直接可打(不用移動)的格,畫實紅;要先移動才打得到的畫虛紅
  const directTargets = useMemo(() => {
    if (!selected || !canAttack(selected)) return new Set<string>();
    return new Set(attackableFrom(battle, selected).map((t) => hexKey(t.pos)));
  }, [battle, selected]);

  return (
    <div
      style={{
        width: "min(98vw, 1320px)",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          background: "#2a2520",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 6px 32px rgba(0,0,0,0.35)",
          position: "relative",
        }}
      >
        <svg
          viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", display: "block", maxHeight: "72vh" }}
        >
          <defs>
            <clipPath id="hexClip">
              <polygon points={pointsStr} />
            </clipPath>
          </defs>

          {/* 地形層 */}
          {terrainEntries.map(([key, terrainId]) => {
            const h = parseHexKey(key);
            const { x, y } = hexToPixel(h, HEX_SIZE);
            const terrain = getTerrain(terrainId);
            const inReach = reach.has(key);
            const isTarget = attackTargets.has(key);
            const isHovered = hoveredHex && hexKey(hoveredHex) === key;
            return (
              <g
                key={key}
                transform={`translate(${x}, ${y})`}
                onClick={() => handleHexClick(h)}
                onMouseEnter={() => setHoveredHex(h)}
                onMouseLeave={() => setHoveredHex(null)}
                style={{ cursor: inReach || isTarget || squadAt(battle, h) ? "pointer" : "default" }}
              >
                <polygon points={pointsStr} fill={terrain.color} stroke="#1a1612" strokeWidth={0.8} />
                {terrain.hasArt && (
                  <image
                    href={`${ART}terrain/${terrainId}.png`}
                    x={-HEX_SIZE * TERRAIN_COVER}
                    y={-HEX_SIZE * TERRAIN_COVER}
                    width={HEX_SIZE * 2 * TERRAIN_COVER}
                    height={HEX_SIZE * 2 * TERRAIN_COVER}
                    clipPath="url(#hexClip)"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ pointerEvents: "none" }}
                  />
                )}
                <polygon
                  points={pointsStr}
                  fill="none"
                  stroke="#1a1612"
                  strokeWidth={0.8}
                  style={{ pointerEvents: "none" }}
                />
                {inReach && (
                  <polygon
                    points={pointsStr}
                    fill="rgba(255,220,100,0.32)"
                    stroke="rgba(255,220,100,0.9)"
                    strokeWidth={1.4}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {isTarget && (
                  <polygon
                    points={pointsStr}
                    fill="rgba(255,40,30,0.35)"
                    stroke="#ff3020"
                    strokeWidth={2.2}
                    strokeDasharray={directTargets.has(key) ? undefined : "6 4"}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {isHovered && (
                  <polygon
                    points={pointsStr}
                    fill="none"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={1.5}
                    style={{ pointerEvents: "none" }}
                  />
                )}
              </g>
            );
          })}

          {/* 小隊層 */}
          {livingSquads(battle).map((squad) => {
            const { x, y } = hexToPixel(squad.pos, HEX_SIZE);
            const type = getSquadType(squad.typeId);
            const alive = aliveSoldiers(squad);
            const hpRatio = squad.hpPool / maxHpPool(squad.typeId, squad.level);
            const isSelected = squad.id === selectedId;
            const dimmed =
              squad.side === "player" && isPlayerTurn && squad.acted;
            return (
              <g key={squad.id} transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
                <image
                  href={`${ART}units/${type.art}.png`}
                  x={-HEX_SIZE * UNIT_COVER}
                  y={-HEX_SIZE * UNIT_COVER}
                  width={HEX_SIZE * 2 * UNIT_COVER}
                  height={HEX_SIZE * 2 * UNIT_COVER}
                  clipPath="url(#hexClip)"
                  preserveAspectRatio="xMidYMid slice"
                />
                <polygon
                  points={pointsStr}
                  fill="none"
                  stroke={SIDE_COLOR[squad.side]}
                  strokeWidth={2.6}
                  strokeLinejoin="round"
                />
                {dimmed && <polygon points={pointsStr} fill="rgba(0,0,0,0.45)" />}
                {isSelected && (
                  <polygon
                    points={pointsStr}
                    fill="none"
                    stroke="#ffd700"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 0 4px #ffd700)" }}
                  />
                )}
                {/* 人數徽章(WoA 式) */}
                <g transform={`translate(${HEX_SIZE * 0.42}, ${HEX_SIZE * 0.52})`}>
                  <rect
                    x={-13} y={-9} width={26} height={17} rx={4}
                    fill={SIDE_COLOR[squad.side]}
                    stroke="#111"
                    strokeWidth={0.8}
                  />
                  <text
                    x={0} y={4}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill="#fff"
                    fontFamily="system-ui, sans-serif"
                  >
                    {alive}
                  </text>
                </g>
                {/* 等級星 */}
                {squad.level > 1 && (
                  <text
                    x={-HEX_SIZE * 0.62} y={-HEX_SIZE * 0.4}
                    fontSize={10}
                    fill="#ffd700"
                    fontFamily="system-ui, sans-serif"
                    style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 2 }}
                  >
                    {"★".repeat(squad.level - 1)}
                  </text>
                )}
                {/* 血條 */}
                <g transform={`translate(0, ${HEX_SIZE * 0.82})`}>
                  <rect x={-HEX_SIZE * 0.55} y={0} width={HEX_SIZE * 1.1} height={4.5} fill="rgba(0,0,0,0.7)" rx={1.5} />
                  <rect
                    x={-HEX_SIZE * 0.55 + 0.5} y={0.6}
                    width={(HEX_SIZE * 1.1 - 1) * Math.max(0, Math.min(1, hpRatio))}
                    height={3.2}
                    fill={hpRatio > 0.66 ? "#4ade80" : hpRatio > 0.33 ? "#fbbf24" : "#ef4444"}
                    rx={1.5}
                  />
                </g>
              </g>
            );
          })}
        </svg>

        {/* 傷害預覽浮窗 */}
        {hoverPreview && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(16,12,8,0.92)",
              color: "#f0e8d4",
              border: "1px solid #a8834a",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <strong style={{ color: "#ff9070" }}>
              預計殺傷 {hoverPreview.minKills}–{hoverPreview.maxKills} 人
            </strong>
            {hoverPreview.chargeBonus > 0 && (
              <span style={{ marginLeft: 8, color: "#ffd700" }}>
                衝鋒 +{Math.round(hoverPreview.chargeBonus * 100)}%
              </span>
            )}
            {hoverPreview.usesMeleeFallback && (
              <span style={{ marginLeft: 8, color: "#f87171" }}>⚠ 被迫近戰</span>
            )}
            {hoverPreview.willRetaliate ? (
              <span style={{ marginLeft: 8, opacity: 0.9 }}>
                ↩ 反擊損失 {hoverPreview.retaliationMinKills}–{hoverPreview.retaliationMaxKills} 人
              </span>
            ) : (
              <span style={{ marginLeft: 8, opacity: 0.7 }}>不會被反擊</span>
            )}
          </div>
        )}

        {/* 底部資訊列 */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            background: "rgba(20,16,12,0.92)",
            color: "#f0e8d4",
            padding: "10px 16px",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
          }}
        >
          <strong>{missionTitle}</strong>
          <span>
            回合 {battle.turn} —{" "}
            <span style={{ color: SIDE_COLOR[battle.activeSide] }}>
              {battle.activeSide === "player" ? "我方" : "敵方(AI 行動中…)"}
            </span>
          </span>
          {selected && (
            <span style={{ opacity: 0.9 }}>
              {getSquadType(selected.typeId).name} Lv{selected.level} ‧{" "}
              {aliveSoldiers(selected)}/{maxSoldiers(selected.typeId, selected.level)} 人
              {selected.moved && !selected.acted && " ‧ 已移動,可攻擊"}
            </span>
          )}
          <div style={{ flex: 1 }} />
          {battle.outcome === "ongoing" ? (
            <button
              onClick={() => {
                setSelectedId(null);
                dispatch({ type: "END_TURN" });
              }}
              disabled={!isPlayerTurn}
              style={{
                background: isPlayerTurn ? "#ac4a2a" : "#555",
                color: "#fff",
                border: "none",
                padding: "8px 18px",
                borderRadius: 6,
                cursor: isPlayerTurn ? "pointer" : "default",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              結束回合
            </button>
          ) : (
            <button
              onClick={onFinish}
              style={{
                background: battle.outcome === "victory" ? "#2d7a3a" : "#8a3a2a",
                color: "#fff",
                border: "none",
                padding: "8px 18px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {battle.outcome === "victory" ? "🏆 勝利 — 領取戰利品" : "撤退回營地"}
            </button>
          )}
        </div>
      </div>

      <BattleLog entries={battle.log} />
    </div>
  );
}
