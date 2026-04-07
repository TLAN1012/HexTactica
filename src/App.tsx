import { useReducer, useState } from "react";
import { HexMap } from "./ui/HexMap";
import { gameReducer, initGameState } from "./engine/state";
import { buildSkirmishScenario } from "./scenarios/skirmishTest";

function App() {
  const [scenario] = useState(() => buildSkirmishScenario());
  const [state, dispatch] = useReducer(gameReducer, scenario, initGameState);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 12px",
        gap: 16,
      }}
    >
      <header style={{ textAlign: "center" }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 600,
            color: "#3a2f24",
            letterSpacing: "0.02em",
          }}
        >
          HexTactica
          <span
            style={{ fontSize: 14, color: "#888", marginLeft: 10, fontWeight: 400 }}
          >
            M1 — 地圖 / 單位 / 移動範圍
          </span>
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: "#666",
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {state.scenario.name} · 點擊己方單位查看可移動範圍，再點目標格移動
        </p>
      </header>
      <HexMap state={state} dispatch={dispatch} />
    </div>
  );
}

export default App;
