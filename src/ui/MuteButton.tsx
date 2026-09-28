/** 音樂開關(放在標題與選單的頂欄) */
import { useState } from "react";
import { audio } from "../audio/AudioManager";

export function MuteButton() {
  const [muted, setMuted] = useState(audio.isMuted());
  return (
    <button className="btn btn-sm" onClick={() => setMuted(audio.toggleMute())} title={muted ? "開啟音樂" : "靜音"} style={{ width: 40, padding: 0 }}>
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
