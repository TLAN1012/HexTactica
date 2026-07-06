/**
 * App — 畫面路由:標題 → 戰役地圖 ⇄ 軍營 / 戰鬥
 * 戰役進度即時寫入 localStorage;戰鬥不存檔(中離視同撤退)。
 */
import { useCallback, useEffect, useState } from "react";
import { initBattle } from "./game/battle";
import {
  applyBattleResult,
  clearSave,
  ensureViable,
  getMission,
  loadCampaign,
  newCampaign,
  saveCampaign,
  type BattleResult,
} from "./game/campaign";
import type { BattleState, CampaignState, MissionDef } from "./game/types";
import { ArmyScreen } from "./ui/ArmyScreen";
import { BattleScreen } from "./ui/BattleScreen";
import { CampaignScreen } from "./ui/CampaignScreen";
import { TitleScreen } from "./ui/TitleScreen";

type Screen = "title" | "campaign" | "army" | "battle";

function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [lastResult, setLastResult] = useState<BattleResult | null>(null);

  // 戰役有變動就自動存檔
  useEffect(() => {
    if (campaign) saveCampaign(campaign);
  }, [campaign]);

  const updateCampaign = useCallback((next: CampaignState) => {
    setCampaign(ensureViable(next));
  }, []);

  const startMission = useCallback(
    (mission: MissionDef) => {
      if (!campaign) return;
      setBattle(initBattle(mission, campaign.roster));
      setScreen("battle");
    },
    [campaign],
  );

  const finishBattle = useCallback(() => {
    if (!campaign || !battle) return;
    const mission = getMission(battle.missionId);
    const { campaign: next, result } = applyBattleResult(campaign, battle, mission);
    setCampaign(ensureViable(next));
    setLastResult(result);
    setBattle(null);
    setScreen("campaign");
  }, [campaign, battle]);

  if (screen === "title") {
    return (
      <TitleScreen
        hasSave={loadCampaign() !== null}
        onContinue={() => {
          const saved = loadCampaign();
          if (saved) {
            setCampaign(saved);
            setLastResult(null);
            setScreen("campaign");
          }
        }}
        onNewGame={() => {
          clearSave();
          setCampaign(newCampaign());
          setLastResult(null);
          setScreen("campaign");
        }}
      />
    );
  }

  if (!campaign) {
    setScreen("title");
    return null;
  }

  if (screen === "army") {
    return (
      <ArmyScreen
        campaign={campaign}
        onChange={updateCampaign}
        onBack={() => setScreen("campaign")}
      />
    );
  }

  if (screen === "battle" && battle) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1510", padding: "16px 0 32px" }}>
        <BattleScreen
          battle={battle}
          onBattleChange={setBattle}
          onFinish={finishBattle}
          missionTitle={getMission(battle.missionId).title}
        />
      </div>
    );
  }

  return (
    <CampaignScreen
      campaign={campaign}
      lastResult={lastResult}
      onStartMission={startMission}
      onOpenArmy={() => {
        setLastResult(null);
        setScreen("army");
      }}
      onBackToTitle={() => setScreen("title")}
    />
  );
}

export default App;
