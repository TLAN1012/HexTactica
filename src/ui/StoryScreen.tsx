/**
 * StoryScreen — 劇情對話(視覺小說式):背景插畫、說話者立繪、對話框。
 * 點畫面或按 Enter / 空白鍵翻頁,右上角可跳過。
 */
import { useEffect, useState } from "react";
import { getCommander } from "../game/factions";
import type { StoryPage } from "../game/types";
import { portraitArt, storyArt } from "./assets";

export interface StoryScreenProps {
  pages: StoryPage[];
  /** 預設背景(頁面沒有指定 image 時) */
  background?: string;
  title?: string;
  onDone: () => void;
}

export function StoryScreen({ pages, background, title, onDone }: StoryScreenProps) {
  const [i, setI] = useState(0);
  const page = pages[i];

  const next = () => (i + 1 < pages.length ? setI(i + 1) : onDone());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setI((n) => (n + 1 < pages.length ? n + 1 : (onDone(), n)));
      }
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length, onDone]);

  if (!page) return null;
  const speaker = page.speaker ? getCommander(page.speaker) : null;
  const bg = page.image ?? background;

  return (
    <div className="story" onClick={next}>
      {bg && <div className="story-bg" style={{ backgroundImage: `url(${storyArt(bg)})` }} />}
      {speaker && (
        <img key={speaker.id} className={`story-portrait fade-in ${speaker.facing === "left" ? "at-right" : "at-left"}`} src={portraitArt(speaker.id)} alt={speaker.name} />
      )}
      <button
        className="btn btn-sm btn-ghost"
        style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: 12, zIndex: 3 }}
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        跳過 ⏭
      </button>
      {title && i === 0 && (
        <div className="title-display fade-in" style={{ position: "absolute", top: "18%", width: "100%", textAlign: "center", fontSize: "clamp(26px, 6vw, 48px)", zIndex: 2 }}>
          {title}
        </div>
      )}
      <div className="frame story-box fade-in" key={i}>
        {speaker ? (
          <div className="story-name">
            {speaker.name}
            <small>{speaker.title}</small>
          </div>
        ) : (
          <div className="story-name" style={{ color: "var(--muted)", fontSize: 14 }}>
            旁白
          </div>
        )}
        <div className="story-text">{page.text}</div>
        <div className="story-hint">
          {i + 1} / {pages.length} ▸
        </div>
      </div>
    </div>
  );
}
