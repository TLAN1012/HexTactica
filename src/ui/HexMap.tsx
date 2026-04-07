/**
 * HexMap — 主戰場地圖（M2 版本）
 *
 * M2 新增：
 *  - 選中單位時，可攻擊的敵軍格以紅色高亮
 *  - 點擊敵軍格 → 派發 ATTACK_UNIT action
 *  - 每個單位徽章下方顯示兵力條（strength / maxStrength）
 *  - 戰鬥紀錄面板浮在畫面右側
 */
import { useMemo, useState } from "react";
import {
  hexCorners,
  hexKey,
  hexToPixel,
  parseHexKey,
  type Hex,
} from "../engine/hex";
import { getTerrain, getUnitType } from "../engine/loadRules";
import { reachableRange } from "../engine/pathfinding";
import { findUnitAt, type GameAction } from "../engine/state";
import { listAttackOptions, type AttackOption } from "../engine/combat";
import type { GameState, Unit } from "../engine/types";
import { UnitBadge } from "./UnitBadge";
import { CombatLog } from "./CombatLog";

const HEX_SIZE = 26;

export interface HexMapProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function HexMap({ state, dispatch }: HexMapProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Hex | null>(null);

  const selectedUnit = selectedUnitId
    ? state.units.find((u) => u.id === selectedUnitId)
    : undefined;

  // 移動範圍
  const reachable = useMemo(() => {
    if (!selectedUnit || selectedUnit.hasActedThisTurn)
      return new Map<string, number>();
    const list = reachableRange(state, selectedUnit);
    return new Map(list.map((r) => [hexKey(r.pos), r.cost]));
  }, [state, selectedUnit]);

  // 攻擊目標（hexKey -> AttackOption，若同格同時可近戰與射擊則優先近戰）
  const attackTargets = useMemo(() => {
    if (!selectedUnit || selectedUnit.hasActedThisTurn)
      return new Map<string, AttackOption>();
    const options = listAttackOptions(state, selectedUnit);
    const map = new Map<string, AttackOption>();
    for (const opt of options) {
      const k = hexKey(opt.targetPos);
      // 若已有該格選項，近戰優先覆蓋射擊
      if (!map.has(k) || opt.type === "melee") {
        map.set(k, opt);
      }
    }
    return map;
  }, [state, selectedUnit]);

  const terrainEntries = useMemo(
    () => Object.entries(state.scenario.terrain),
    [state.scenario.terrain],
  );

  // 哪些格被哪一方單位佔據（cell tint）
  const occupancy = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of state.units) {
      if (u.state === "destroyed") continue;
      const side = state.scenario.sides.find((s) => s.id === u.sideId);
      if (side) map.set(hexKey(u.pos), side.color);
    }
    return map;
  }, [state.units, state.scenario.sides]);

  // viewBox
  const pixels = terrainEntries.map(([key]) =>
    hexToPixel(parseHexKey(key), HEX_SIZE),
  );
  const minX = Math.min(...pixels.map((p) => p.x)) - HEX_SIZE * 1.2;
  const minY = Math.min(...pixels.map((p) => p.y)) - HEX_SIZE * 1.2;
  const maxX = Math.max(...pixels.map((p) => p.x)) + HEX_SIZE * 1.2;
  const maxY = Math.max(...pixels.map((p) => p.y)) + HEX_SIZE * 1.2;
  const vbWidth = maxX - minX;
  const vbHeight = maxY - minY;

  // 強制 16:9
  const target = 16 / 9;
  const current = vbWidth / vbHeight;
  let paddedX = minX;
  let paddedY = minY;
  let paddedW = vbWidth;
  let paddedH = vbHeight;
  if (current < target) {
    const needW = vbHeight * target;
    paddedX -= (needW - vbWidth) / 2;
    paddedW = needW;
  } else if (current > target) {
    const needH = vbWidth / target;
    paddedY -= (needH - vbHeight) / 2;
    paddedH = needH;
  }

  const corners = hexCorners(HEX_SIZE);
  const pointsStr = corners.map((c) => `${c.x},${c.y}`).join(" ");

  function handleHexClick(h: Hex) {
    const clickedUnit = findUnitAt(state, h);
    const clickedKey = hexKey(h);

    if (clickedUnit) {
      // 點到敵軍，且在攻擊範圍內 → 攻擊
      if (
        selectedUnit &&
        clickedUnit.sideId !== selectedUnit.sideId &&
        attackTargets.has(clickedKey)
      ) {
        const opt = attackTargets.get(clickedKey)!;
        dispatch({
          type: "ATTACK_UNIT",
          attackerId: selectedUnit.id,
          defenderId: clickedUnit.id,
          attackType: opt.type,
        });
        setSelectedUnitId(null);
        return;
      }

      // 點到自己陣營可行動的單位 → 選取/取消
      if (
        clickedUnit.sideId === state.activeSideId &&
        !clickedUnit.hasActedThisTurn
      ) {
        setSelectedUnitId(
          clickedUnit.id === selectedUnitId ? null : clickedUnit.id,
        );
        return;
      }

      setSelectedUnitId(null);
      return;
    }

    // 空格 — 在移動範圍內則移動
    if (selectedUnit && reachable.has(clickedKey)) {
      dispatch({
        type: "MOVE_UNIT",
        unitId: selectedUnit.id,
        to: h,
      });
      setSelectedUnitId(null);
      return;
    }

    setSelectedUnitId(null);
  }

  return (
    <div
      style={{
        width: "min(96vw, 1280px)",
        aspectRatio: "16 / 9",
        background: "#2a2520",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 6px 32px rgba(0,0,0,0.35)",
        position: "relative",
      }}
    >
      <svg
        viewBox={`${paddedX} ${paddedY} ${paddedW} ${paddedH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {/* 地形層 */}
        {terrainEntries.map(([key, terrainId]) => {
          const h = parseHexKey(key);
          const { x, y } = hexToPixel(h, HEX_SIZE);
          const terrain = getTerrain(terrainId);
          const isReachable = reachable.has(key);
          const attackOpt = attackTargets.get(key);
          const isHovered = hovered && hexKey(hovered) === key;
          const clickable = isReachable || !!attackOpt || !!findUnitAt(state, h);
          return (
            <g
              key={key}
              transform={`translate(${x}, ${y})`}
              onClick={() => handleHexClick(h)}
              onMouseEnter={() => setHovered(h)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: clickable ? "pointer" : "default" }}
            >
              <polygon
                points={pointsStr}
                fill={terrain.color}
                stroke="#1a1612"
                strokeWidth={0.8}
              />
              {occupancy.has(key) && (
                <polygon
                  points={pointsStr}
                  fill={occupancy.get(key)}
                  opacity={0.32}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {isReachable && (
                <polygon
                  points={pointsStr}
                  fill="rgba(255,220,100,0.35)"
                  stroke="rgba(255,220,100,0.9)"
                  strokeWidth={1.5}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {attackOpt && (
                <polygon
                  points={pointsStr}
                  fill={
                    attackOpt.type === "ranged"
                      ? "rgba(255,90,60,0.35)"
                      : "rgba(255,30,30,0.45)"
                  }
                  stroke={
                    attackOpt.type === "ranged" ? "#ff6040" : "#ff2020"
                  }
                  strokeWidth={2.2}
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

        {/* 單位層 */}
        {state.units
          .filter((u) => u.state !== "destroyed")
          .map((unit) => {
            const { x, y } = hexToPixel(unit.pos, HEX_SIZE);
            const side = state.scenario.sides.find((s) => s.id === unit.sideId);
            const type = getUnitType(unit.typeId);
            const isSelected = unit.id === selectedUnitId;
            const hpRatio = unit.currentStrength / type.baseStats.strength;
            return (
              <g
                key={unit.id}
                transform={`translate(${x}, ${y})`}
                style={{ pointerEvents: "none" }}
              >
                {isSelected && (
                  <circle
                    cx={0}
                    cy={0}
                    r={HEX_SIZE * 0.85}
                    fill="none"
                    stroke="#ffd700"
                    strokeWidth={2.5}
                    style={{ filter: "drop-shadow(0 0 4px #ffd700)" }}
                  />
                )}
                {unit.hasActedThisTurn && (
                  <circle
                    cx={0}
                    cy={0}
                    r={HEX_SIZE * 0.85}
                    fill="rgba(0,0,0,0.35)"
                  />
                )}
                <g transform={`scale(${(HEX_SIZE * 0.75) / 50})`}>
                  <UnitBadge
                    emblem={type.emblem}
                    sideColor={side?.color ?? "#888"}
                    state={unit.state}
                  />
                </g>
                {/* 兵力條 */}
                <g transform={`translate(0, ${HEX_SIZE * 0.75})`}>
                  <rect
                    x={-HEX_SIZE * 0.55}
                    y={0}
                    width={HEX_SIZE * 1.1}
                    height={4}
                    fill="rgba(0,0,0,0.7)"
                    rx={1}
                  />
                  <rect
                    x={-HEX_SIZE * 0.55 + 0.5}
                    y={0.5}
                    width={(HEX_SIZE * 1.1 - 1) * hpRatio}
                    height={3}
                    fill={
                      hpRatio > 0.66
                        ? "#4ade80"
                        : hpRatio > 0.33
                          ? "#fbbf24"
                          : "#ef4444"
                    }
                    rx={1}
                  />
                </g>
              </g>
            );
          })}
      </svg>

      <InfoBar
        state={state}
        selectedUnit={selectedUnit}
        hovered={hovered}
        dispatch={dispatch}
      />
      <CombatLog entries={state.combatLog} />
    </div>
  );
}

function InfoBar({
  state,
  selectedUnit,
  hovered,
  dispatch,
}: {
  state: GameState;
  selectedUnit: Unit | undefined;
  hovered: Hex | null;
  dispatch: (a: GameAction) => void;
}) {
  const side = state.scenario.sides.find((s) => s.id === state.activeSideId);
  const hoveredTerrain = hovered
    ? state.scenario.terrain[hexKey(hovered)]
    : undefined;

  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        display: "flex",
        gap: 12,
        alignItems: "center",
        background: "rgba(20,16,12,0.85)",
        color: "#f0e8d4",
        padding: "8px 14px",
        borderRadius: 8,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        pointerEvents: "auto",
      }}
    >
      <div>
        <strong>回合 {state.turn}</strong> — 當前陣營：
        <span style={{ color: side?.color, marginLeft: 4 }}>{side?.name}</span>
      </div>
      <div style={{ flex: 1 }} />
      {hoveredTerrain && (
        <div style={{ opacity: 0.8 }}>
          地形：{getTerrain(hoveredTerrain).nameI18n.zh}
          （移動 {getTerrain(hoveredTerrain).moveCost}，防禦{" "}
          {getTerrain(hoveredTerrain).defenseModifier >= 0 ? "+" : ""}
          {getTerrain(hoveredTerrain).defenseModifier}）
        </div>
      )}
      {selectedUnit && (
        <div>
          {getUnitType(selectedUnit.typeId).nameI18n.zh} ‧ 兵力{" "}
          {selectedUnit.currentStrength}/
          {getUnitType(selectedUnit.typeId).baseStats.strength} ‧ 士氣{" "}
          {selectedUnit.currentMorale}
        </div>
      )}
      <button
        onClick={() => dispatch({ type: "END_TURN" })}
        style={{
          background: "#ac4a2a",
          color: "#fff",
          border: "none",
          padding: "6px 14px",
          borderRadius: 6,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        結束回合
      </button>
    </div>
  );
}
