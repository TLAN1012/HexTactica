/**
 * App — 畫面流程
 *
 *   標題 → 戰役選單 ─┬─ 戰爭地圖 →(序章)→ 出征:戰前劇情 → 戰鬥 → 結局劇情 → 戰爭地圖
 *                    └─ 奇幻外傳 → 戰鬥 → 奇幻外傳
 *   任何地方都能進軍營(該戰役線自己的名冊與金幣)
 *
 * 戰役進度即時寫入 localStorage;戰鬥不存檔(中途離開視同撤退)。
 */
import { useCallback, useEffect, useState } from "react";
import { audio } from "./audio/AudioManager";
import { initBattle } from "./game/battle";
import {
  applyBattleResult,
  clearSave,
  getTrack,
  loadCampaign,
  newCampaign,
  prepareScenario,
  saveCampaign,
  updateTrack,
  type BattleResult,
} from "./game/campaign";
import { getDifficulty } from "./game/difficulty";
import { FANTASY_TRACK, getWar, missionToScenario } from "./game/scenarios";
import type { BattleState, CampaignState, ScenarioDef, StoryPage } from "./game/types";
import { ArmyScreen } from "./ui/ArmyScreen";
import { BattleScreen } from "./ui/BattleScreen";
import { CampaignScreen } from "./ui/CampaignScreen";
import { HubScreen } from "./ui/HubScreen";
import { StoryScreen } from "./ui/StoryScreen";
import { TitleScreen } from "./ui/TitleScreen";
import { TutorialScreen } from "./ui/TutorialScreen";
import { WarScreen } from "./ui/WarScreen";

type Screen = "title" | "hub" | "war" | "fantasy" | "army" | "battle" | "story" | "tutorial";

interface StoryState {
  pages: StoryPage[];
  background?: string;
  title?: string;
  then: () => void;
}

const SEEN_KEY = "hextactica-seen-intro";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [scenario, setScenario] = useState<ScenarioDef | null>(null);
  const [trackId, setTrackId] = useState<string>("war-1066");
  const [lastResult, setLastResult] = useState<BattleResult | null>(null);
  const [story, setStory] = useState<StoryState | null>(null);
  const [armyReturn, setArmyReturn] = useState<Screen>("war");

  useEffect(() => {
    if (campaign) saveCampaign(campaign);
  }, [campaign]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    audio.playBgm(screen === "battle" || screen === "tutorial" ? "battle" : "camp");
  }, [screen]);

  const playStory = useCallback((s: StoryState) => {
    if (!s.pages.length) {
      s.then();
      return;
    }
    setStory(s);
    setScreen("story");
  }, []);

  const openWar = useCallback(
    (warId: string) => {
      setTrackId(warId);
      setLastResult(null);
      const war = getWar(warId);
      const seen = localStorage.getItem(`${SEEN_KEY}-${warId}`);
      if (!seen) {
        try {
          localStorage.setItem(`${SEEN_KEY}-${warId}`, "1");
        } catch {
          /* noop */
        }
        playStory({ pages: war.intro, background: "title.webp", title: war.title, then: () => setScreen("war") });
      } else {
        setScreen("war");
      }
    },
    [playStory],
  );

  const startBattle = useCallback(
    (sc: ScenarioDef, tId: string) => {
      if (!campaign) return;
      const prepared = prepareScenario(sc, getTrack(campaign, tId));
      setScenario(prepared);
      setTrackId(tId);
      const begin = () => {
        setBattle(initBattle(prepared, getTrack(campaign, tId).roster, campaign.difficulty));
        setScreen("battle");
      };
      playStory({ pages: prepared.intro ?? [], background: prepared.art, title: prepared.title, then: begin });
    },
    [campaign, playStory],
  );

  const finishBattle = useCallback(() => {
    if (!campaign || !battle || !scenario) return;
    const { campaign: next, result } = applyBattleResult(campaign, trackId, battle, scenario);
    setCampaign({ ...next, active: trackId });
    setLastResult(result);
    setBattle(null);
    const back: Screen = trackId === FANTASY_TRACK ? "fantasy" : "war";
    const outro = result.victory ? scenario.outroVictory : scenario.outroDefeat;
    playStory({ pages: outro ?? [], background: scenario.art, then: () => setScreen(back) });
  }, [campaign, battle, scenario, trackId, playStory]);

  // ── 畫面 ──────────────────────────────────────────────
  let body: React.ReactNode = null;

  if (screen === "story" && story) {
    body = (
      <StoryScreen
        key={story.pages[0]?.text}
        pages={story.pages}
        background={story.background}
        title={story.title}
        onDone={() => {
          const then = story.then;
          setStory(null);
          then();
        }}
      />
    );
  } else if (screen === "tutorial") {
    body = <TutorialScreen onExit={() => setScreen(campaign ? "hub" : "title")} />;
  } else if (screen === "title" || !campaign) {
    body = (
      <TitleScreen
        hasSave={loadCampaign() !== null}
        onTutorial={() => setScreen("tutorial")}
        onContinue={() => {
          const saved = loadCampaign();
          if (saved) {
            setCampaign(saved);
            setScreen("hub");
          }
        }}
        onNewGame={(d) => {
          clearSave();
          setCampaign(newCampaign(d));
          setScreen("hub");
        }}
      />
    );
  } else if (screen === "hub") {
    body = (
      <HubScreen
        campaign={campaign}
        onOpenWar={openWar}
        onOpenFantasy={() => {
          setTrackId(FANTASY_TRACK);
          setLastResult(null);
          setScreen("fantasy");
        }}
        onDifficulty={(d) => setCampaign({ ...campaign, difficulty: d })}
        onTutorial={() => setScreen("tutorial")}
        onTitle={() => setScreen("title")}
      />
    );
  } else if (screen === "war") {
    const war = getWar(trackId);
    body = (
      <WarScreen
        war={war}
        track={getTrack(campaign, trackId)}
        lastResult={lastResult}
        onStart={(sc) => startBattle(sc, trackId)}
        onArmy={() => {
          setArmyReturn("war");
          setScreen("army");
        }}
        onBack={() => setScreen("hub")}
        onEpilogue={() => playStory({ pages: war.epilogue, background: "title.webp", then: () => setScreen("war") })}
      />
    );
  } else if (screen === "fantasy") {
    body = (
      <CampaignScreen
        track={getTrack(campaign, FANTASY_TRACK)}
        lastResult={lastResult}
        onStartMission={(m) => startBattle(missionToScenario(m), FANTASY_TRACK)}
        onOpenArmy={() => {
          setArmyReturn("fantasy");
          setScreen("army");
        }}
        onBack={() => setScreen("hub")}
      />
    );
  } else if (screen === "army") {
    body = (
      <ArmyScreen
        track={getTrack(campaign, trackId)}
        trackId={trackId}
        onChange={(t) => setCampaign(updateTrack(campaign, trackId, () => t))}
        onBack={() => setScreen(armyReturn)}
      />
    );
  } else if (screen === "battle" && battle && scenario) {
    body = (
      <BattleScreen
        battle={battle}
        onBattleChange={setBattle}
        onFinish={finishBattle}
        onExit={() => {
          if (confirm("撤退?這場戰鬥會算作敗北。")) {
            setBattle({ ...battle, outcome: "defeat", outcomeReason: "撤退" });
          }
        }}
        title={scenario.title}
        objectiveText={scenario.objectiveText}
        playerFaction={scenario.playerFaction}
        enemyFaction={scenario.enemyFaction}
        allowUndo={getDifficulty(campaign.difficulty).allowUndo}
      />
    );
  }

  return <>{body}</>;
}
