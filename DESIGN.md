# HexTactica — 設計規格(開發者導向)

> 「戰團戰役」架構文件。最後更新:2026-07-06(小隊制大改版)。
> 舊版(2D6 + 士氣的歷史戰棋)的設計已淘汰,詳見 HANDOVER.md 的歷史紀錄。

## 一、技術棧

| 項目 | 決定 |
|---|---|
| 框架 | Vite + React 19 + TypeScript,純前端無後端 |
| 渲染 | React + SVG |
| 六角座標 | pointy-top, axial (q, r) |
| 存檔 | localStorage(戰役層),戰鬥不落地 |
| 部署 | 推 `master` → GitHub Pages 自動 build/deploy |

## 二、架構總覽

```
src/
├── engine/
│   └── hex.ts          ← 六角幾何(距離、鄰居、矩形地圖、pixel↔axial)。改版後唯一保留的舊模組
├── game/               ← 純函式遊戲引擎,無 DOM,可單元測試
│   ├── types.ts        ← 所有核心型別(SquadType / Squad / BattleState / CampaignState …)
│   ├── units.ts        ← 七兵種資料表(SQUAD_TYPES)
│   ├── terrain.ts      ← 地形定義表(TERRAINS)
│   ├── progression.ts  ← 等級成長:XP 門檻、statMul、滿編、單兵血、血池換算
│   ├── combat.ts       ← 傷害公式:analyzeAttack / rollDamage / damageBounds / previewAttack
│   ├── battle.ts       ← 戰鬥 reducer:初始化、移動(Dijkstra reachable)、攻擊/反擊、回合切換、勝負判定
│   ├── ai.ts           ← 敵方啟發式 AI(chooseAiAction 一次回一個動作)
│   ├── maps.ts         ← 種子式地圖生成(seededRng)、佈署格計算
│   └── campaign.ts     ← 任務表(MISSIONS)、金幣經濟、名冊管理、存讀檔、戰後結算
├── ui/                 ← React 畫面,只讀引擎狀態、發 action
│   ├── TitleScreen.tsx     ← 標題:新遊戲 / 繼續
│   ├── CampaignScreen.tsx  ← 戰役地圖:選關、看上場結算、進軍營
│   ├── ArmyScreen.tsx      ← 軍營:招募 / 補兵 / 解散
│   ├── BattleScreen.tsx    ← 戰鬥主畫面:六角地圖、攻擊預覽、戰鬥紀錄、驅動 AI
│   └── BattleLog.tsx       ← 戰鬥紀錄面板
├── App.tsx             ← 畫面路由 + 戰役 state 持有者
└── main.tsx
```

## 三、資料流

**畫面路由(App.tsx)**

```
title ──新遊戲/繼續──▶ campaign ⇄ army
                          │
                     選關 startMission
                          ▼
                       battle ──onFinish──▶ campaign(帶結算)
```

- `App` 持有 `campaign: CampaignState`(唯一長期狀態),任何變動 `useEffect` 自動 `saveCampaign` 進 localStorage。
- 開戰時 `initBattle(mission, roster)` 產出 `BattleState`;戰鬥狀態只活在記憶體,`BattleScreen` 透過 `onBattleChange` 回寫。
- 戰鬥分出勝負後 `applyBattleResult` 把結果併回戰役(戰損、經驗、獎金),切回 `campaign`。

**戰鬥層(battle reducer)**

- 純函式 `battleReducer(state, action, rng)`,action 為 `MOVE / ATTACK / MOVE_AND_ATTACK / END_TURN`。
- UI 只發 action、渲染 `BattleState`;`rng` 可注入,方便測試決定性重播。
- 敵方回合:`BattleScreen` 迴圈呼叫 `chooseAiAction(state)`,逐一套用(帶延遲動畫),回 `null` 時 `END_TURN` 交還玩家。

**戰役結算(campaign.ts)**

- `applyBattleResult` 讀 `battle.kills` 發經驗、依 `aliveSoldiers` 記戰損、首通給全額獎金 / 重刷給 40%,全滅小隊移出名冊。

## 四、設計原則

1. **純函式引擎**:`src/game/*` 不碰 DOM、不讀 `Date`/`Math.random` 以外的全域;`rng` 一律可注入。UI 只做「讀狀態 + 發 action」。
2. **預覽與結算共用公式**:`previewAttack` 與 `resolveAttack` 都走 `analyzeAttack` → `damageBounds`/`rollDamage`,玩家看到的擊殺上下界就是真實隨機範圍,AI 也用同一個 `previewAttack` 評分,三者永遠一致。
3. **種子地圖**:`generateMap(seed, w, h)` 由任務 `mapSeed` 決定地形,`mulberry32` 保證同一關每次進入長得一模一樣;佈署格由 `deploymentHexes` 兩側對稱產生。
4. **資料驅動兵種/地形**:新增兵種只需在 `units.ts` 的 `SQUAD_TYPES` 加一筆(含特性 `TraitId`),地形同理在 `terrain.ts`。特性行為集中在 `combat.ts` 的 `analyzeAttack`。
5. **保留 hex 幾何**:`src/engine/hex.ts` 是舊版留下、與玩法無關的幾何工具,繼續沿用,不重造輪子。

## 五、擴充指引

- **加兵種**:`units.ts` 加一筆 `SquadType`;若引入全新特性,先在 `types.ts` 的 `TraitId` 加成員,再到 `combat.ts` `analyzeAttack` 實作效果。
- **加關卡**:`campaign.ts` 的 `MISSIONS` 加一筆 `MissionDef`(給新的 `mapSeed`、敵軍編成、獎金)。
- **調平衡**:數值集中在 `units.ts`(兵種)、`progression.ts`(升級曲線、`XP_THRESHOLDS`)、`combat.ts`(`CHARGE_PER_HEX`、`RANGED_FALLOFF_PER_HEX`、`ANTI_CAVALRY_BONUS` 等常數)。
- **改存檔格式**:動 `CampaignState` 結構時記得升 `campaign.ts` 的 `SAVE_KEY` / `version`,並在 `loadCampaign` 處理舊檔。
