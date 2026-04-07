/**
 * HexMap — 主戰場地圖（M1 版本）
 *
 * 負責：
 *  - 依 GameState 渲染地形六角格
 *  - 在單位位置繪製 UnitBadge
 *  - 點擊選單位；選中後以不同顏色顯示可移動範圍
 *  - 點擊可移動範圍內的格 → 派發 MOVE_UNIT action
 *  - 容器強制 16:9，內部 viewBox 自動置中
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
import type { GameState, Unit } from "../engine/types";
import { UnitBadge } from "./UnitBadge";

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

  // 移動範圍（memo：只有選取單位改時才重算）
  const reachable = useMemo(() => {
    if (!selectedUnit) return new Map<string, number>();
    const list = reachableRange(state, selectedUnit);
    return new Map(list.map((r) => [hexKey(r.pos), r.cost]));
  }, [state, selectedUnit]);

  // 地形清單
  const terrainEntries = useMemo(
    () => Object.entries(state.scenario.terrain),
    [state.scenario.terrain],
  );

  // 哪些格被哪一方單位佔據（用於 cell tint）
  const occupancy = useMemo(() => {
    const map = new Map<string, string>(); // hexKey -> sideColor
    for (const u of state.units) {
      if (u.state === "destroyed") continue;
      const side = state.scenario.sides.find((s) => s.id === u.sideId);
      if (side) map.set(hexKey(u.pos), side.color);
    }
    return map;
  }, [state.units, state.scenario.sides]);

  // viewBox 計算
  const pixels = terrainEntries.map(([key]) =>
    hexToPixel(parseHexKey(key), HEX_SIZE),
  );
  const minX = Math.min(...pixels.map((p) => p.x)) - HEX_SIZE * 1.2;
  const minY = Math.min(...pixels.map((p) => p.y)) - HEX_SIZE * 1.2;
  const maxX = Math.max(...pixels.map((p) => p.x)) + HEX_SIZE * 1.2;
  const maxY = Math.max(...pixels.map((p) => p.y)) + HEX_SIZE * 1.2;
  const vbWidth = maxX - minX;
  const vbHeight = maxY - minY;

  // 強制 16:9：擴展較短邊
  const target = 16 / 9;
  const current = vbWidth / vbHeight;
  let paddedX = minX;
  let paddedY = minY;
  let paddedW = vbWidth;
  let paddedH = vbHeight;
  if (current < target) {
    // 太高，擴寬
    const needW = vbHeight * target;
    const extra = needW - vbWidth;
    paddedX -= extra / 2;
    paddedW = needW;
  } else if (current > target) {
    // 太寬，增高
    const needH = vbWidth / target;
    const extra = needH - vbHeight;
    paddedY -= extra / 2;
    paddedH = needH;
  }

  const corners = hexCorners(HEX_SIZE);
  const pointsStr = corners.map((c) => `${c.x},${c.y}`).join(" ");

  function handleHexClick(h: Hex) {
    const clickedUnit = findUnitAt(state, h);

    if (clickedUnit) {
      // 點到自己陣營的單位 → 選取
      if (clickedUnit.sideId === state.activeSideId && !clickedUnit.hasActedThisTurn) {
        setSelectedUnitId(
          clickedUnit.id === selectedUnitId ? null : clickedUnit.id,
        );
        return;
      }
      // 點到他人：取消選取
      setSelectedUnitId(null);
      return;
    }

    // 點到空格 — 若在移動範圍內則移動
    if (selectedUnit && reachable.has(hexKey(h))) {
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
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        {/* 地形層 */}
        {terrainEntries.map(([key, terrainId]) => {
          const h = parseHexKey(key);
          const { x, y } = hexToPixel(h, HEX_SIZE);
          const terrain = getTerrain(terrainId);
          const isReachable = reachable.has(key);
          const isHovered = hovered && hexKey(hovered) === key;
          return (
            <g
              key={key}
              transform={`translate(${x}, ${y})`}
              onClick={() => handleHexClick(h)}
              onMouseEnter={() => setHovered(h)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: isReachable ? "pointer" : "default" }}
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
            return (
              <g
                key={unit.id}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: "pointer", pointerEvents: "none" }}
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
                <g transform={`scale(${(HEX_SIZE * 0.75) / 50})`}>
                  <UnitBadge
                    emblem={type.emblem}
                    sideColor={side?.color ?? "#888"}
                    state={unit.state}
                  />
                </g>
              </g>
            );
          })}
      </svg>

      {/* 底部資訊列 */}
      <InfoBar
        state={state}
        selectedUnit={selectedUnit}
        hovered={hovered}
        dispatch={dispatch}
      />
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
          {getUnitType(selectedUnit.typeId).nameI18n.zh} ‧ S{" "}
          {selectedUnit.currentStrength}/
          {getUnitType(selectedUnit.typeId).baseStats.strength} ‧ M{" "}
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
