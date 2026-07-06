/**
 * TitleScreen — 標題畫面:繼續戰役 / 開新戰役
 */
export interface TitleScreenProps {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}

export function TitleScreen({ hasSave, onContinue, onNewGame }: TitleScreenProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "system-ui, sans-serif",
        background:
          "radial-gradient(ellipse at 50% 30%, #3a3226 0%, #1c1712 70%)",
        color: "#f0e8d4",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 64, lineHeight: 1 }}>⚔️</div>
      <h1 style={{ margin: 0, fontSize: 44, letterSpacing: "0.06em" }}>
        HexTactica
      </h1>
      <p style={{ margin: 0, fontSize: 17, color: "#c9b98a" }}>
        戰團戰役 — 六角戰棋單機版
      </p>
      <p style={{ margin: "4px 0 20px", fontSize: 13.5, color: "#9a8d70", maxWidth: 440, lineHeight: 1.7 }}>
        率領你的戰團討伐血狼劫掠團。小隊制戰鬥:人數就是戰力,
        近戰會吃反擊、槍陣先制、騎兵衝鋒、遠程壓制 —
        打完仗記得回營補兵,死掉的士兵可不會自己復活。
      </p>
      {hasSave && (
        <button onClick={onContinue} style={btnStyle("#2d7a3a")}>
          繼續戰役
        </button>
      )}
      <button onClick={onNewGame} style={btnStyle(hasSave ? "#6b5a3a" : "#2d7a3a")}>
        {hasSave ? "開新戰役(捨棄進度)" : "開始戰役"}
      </button>
      <p style={{ marginTop: 28, fontSize: 12, color: "#6b604c" }}>
        進度自動儲存在瀏覽器 localStorage
      </p>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    padding: "12px 36px",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 260,
  };
}
