# HexTactica — 設計規格(開發者導向)

> 最後更新:2026-09-28(第一階段:1066 王冠之爭、劇本引擎、四級難度、效用 AI、哥德風改版)。

## 一、技術棧

| 項目 | 決定 |
|---|---|
| 框架 | Vite + React 19 + TypeScript,純前端無後端 |
| 渲染 | React + SVG(全螢幕地圖,拖曳 / 滾輪 / 雙指縮放) |
| 六角座標 | pointy-top, axial (q, r);劇本與手繪地圖用 offset「欄, 列」(`cellToHex`) |
| 存檔 | localStorage `hextactica-save-v2`(多戰役線),戰鬥不落地 |
| 測試 | vitest(`src/game/__tests__`)+ AI 對打平衡報告(`scripts/balance.test.ts`) |
| 美術 | 自架 Qwen-Image 生成(`scripts/art/gen-art.py`),WebP 放 `public/art/` |
| 部署 | 推 `master` → GitHub Pages(`base: /HexTactica/`) |

## 二、架構

```
src/
├── engine/hex.ts            六角幾何
├── game/                    純函式引擎(無 DOM,可測試)
│   ├── types.ts             所有型別:兵種、小隊、地形、劇本、勝敗條件、難度、戰役線、戰爭
│   ├── units.ts             兵種表(奇幻人類 / 獸人 / 1066 撒克遜・挪威・諾曼)
│   ├── factions.ts          陣營顏色、歷史指揮官、指揮官光環
│   ├── terrain.ts           八種地形
│   ├── progression.ts       升級曲線
│   ├── combat.ts            傷害公式 analyzeAttack(預覽 / 結算 / AI 共用)
│   ├── maps.ts              手繪地圖解析、種子地圖、座標轉換
│   ├── battle.ts            劇本初始化、reducer、援軍、勝敗判定
│   ├── ai.ts                效用 AI(威脅地圖、路徑距離場、姿態、時間壓力、斬首)
│   ├── difficulty.ts        四級難度
│   ├── missions.ts          奇幻外傳十關(舊格式)
│   ├── wars/1066.ts         1066 三場戰役 + 戰爭定義
│   ├── scenarios.ts         劇本登錄(舊關卡 → ScenarioDef)
│   ├── campaign.ts          存檔 v2、經濟、戰後結算、戰爭推進、跨戰影響
│   └── sim.ts               自動對戰(測試與平衡)
├── ui/
│   ├── TitleScreen / HubScreen / WarScreen / CampaignScreen / ArmyScreen
│   ├── StoryScreen          視覺小說式劇情(背景、立繪、對話框)
│   ├── BattleScreen         全螢幕戰場
│   └── assets.ts / traits.ts / MuteButton.tsx
└── App.tsx                  畫面流程
```

## 三、畫面流程

```
標題 → 戰役選單 ─┬─ 戰爭地圖 →(首次:戰爭序章)→ 出征:戰前劇情 → 戰鬥 → 結局劇情 → 戰爭地圖
                 └─ 奇幻外傳 → 戰鬥 → 奇幻外傳
```

## 四、劇本(ScenarioDef)

一場戰鬥的完整資料:手繪地圖 `mapRows`(`. h f s ~ = b v`)、`playerDeploy`、`playerFixed`(劇情固定部隊)、
`enemies`(可帶指揮官、姿態 attack/hold/reserve、開場減員、劇本修正)、`reinforcements`、`victory` / `defeat`、
`intro` / `outroVictory` / `outroDefeat`、`art`。`useRoster: false` 表示不動用玩家名冊。
`playerAiStance` 只給自動模擬用(守勢戰役填 hold),不影響真人操作。

**加一場戰役**:在 `wars/<war>.ts` 寫 ScenarioDef,加進 WarDef.battles,跑 `npm test`(劇本完整性測試會檢查
地圖字元、出生點可通行、指揮官存在等),再跑平衡報告調數值。

## 五、AI

`chooseAiAction(state, side, {skill, rng})` 每次回一個動作:

1. **威脅地圖**:對手每隊下回合走得到、打得到的格累加火力(WeakMap 快取)
2. **路徑距離場**:從目標做 Dijkstra(依地形成本、繞河),推進用它而不是直線距離
3. **目標**:斬首目標(領主以上)> 目標格 > 最近敵人
4. **評分**:攻擊 = 預期擊殺 × 目標價值 − 反擊損失 + 位置分;位置 = 地形 + 盾牆相鄰 − 威脅 × 技巧 + 推進
5. **時間壓力**:對手靠撐時間獲勝時,進攻方威脅只算三成、越接近期限越積極
6. **關鍵指揮官**:倒下就輸的指揮官謹慎 ×4、跟在部隊旁、不帶頭衝
7. **難度**:技巧低 → 加雜訊、少看威脅;虧本攻擊(分數 < −8)不做

## 六、平衡(2026-09-28,玩家 AI 技巧 0.75,各 30 場)

| 戰役 | 見習 | 騎士 | 領主 | 傳奇 |
|---|---|---|---|---|
| 富爾福德 | 100% | 100% | 93% | 80% |
| 斯坦福橋 | 63% | 13% | 0% | 0% |
| 黑斯廷斯 | 73% | 13% | 0% | 0% |

模擬玩家不會刻意保護國王與利用地形,真人勝率應較高;有真人回饋後再調。

## 七、美術

`scripts/art/gen-art.py` 的 SPECS 定義每張圖的比例與畫面描述,統一接上哥德風少年少女風格句。
**提示詞只用正面描述**(否定句的內容會被畫出來)。原圖存 `scripts/art/raw/`(不進版控),
縮圖 WebP:立繪 600×800、棋子 384²、地形 256²、劇情 1280×720。奇幻外傳沿用舊版 PNG。
