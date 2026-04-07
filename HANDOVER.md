# HexTactica 交班紀錄

> 交班日期：2026-04-08
> 起草：小V
> 下次開工時，請先讀這份再決定 M3 優先順序。

---

## 🎯 專案一句話

六角戰棋 webapp，模擬真實古代/中世紀戰場，純前端（Vite + React + TS），
GitHub Pages 自動部署，public repo 藍醫師任何機器皆可開發。

- **線上試玩**：https://tlan1012.github.io/HexTactica/
- **Repo**：https://github.com/TLAN1012/HexTactica
- **本機路徑**：`C:\Users\someo\.openclaw\workspace\HexTactica\`

---

## 📊 已完成里程碑（截至 2026-04-08）

| M | 內容 | Commit |
|---|---|---|
| **M0** | Vite + React + TS 骨架、六角幾何、型別、heavy-cavalry + velite JSON、音效介面預留、GitHub Pages CI | `909bea5` |
| **M1** | 20×12 16:9 地圖、5 個兵種 JSON + 地形/天氣 JSON、UnitBadge、移動範圍 BFS、雙方 10 單位熱座 | `fafa2ef` |
| **M1.1** | 徽章 3D 漸層+陰影+高光、cell tint、加深陣營色 | `7bc9227` |
| **M2** | combat.ts（2D6+CRT+trait 修正）、ATTACK_UNIT action、攻擊目標高亮、兵力條、戰鬥紀錄面板 | `e620801` |
| **M2.1** | CombatLog 可摺疊、InfoBar 回到全寬 | `1e93faa` |

---

## ⏭ 下次要做：M3 — 士氣系統 + Schema 擴充

藍醫師已同意 M2 後走 M3。範圍：

### 1. 士氣檢定與狀態機
- `resolveAttack` 已經吐出 `moraleTriggered: boolean`，需要：
  - 當為 true → 觸發 `rollMoraleCheck(defender, state)`
  - 檢定：2D6 + 修正 ≥ currentMorale → held；否則 shaken/routing
  - 單位狀態 `idle → shaken → routing` 三階段
- **routing 單位** 的自動行為：
  - 每回合自動朝己方出發邊緣移動（skirmishTest 場景裡紅方邊緣是 q=0，藍方是 q=19）
  - 不能攻擊
  - 被攻擊士氣 −2（更容易全崩）
  - 移動距離 = base.move + 1

### 2. 連鎖崩潰
- 當某單位進入 routing → 視野 3 格內的友軍都要做一次士氣檢定
- M3 暫時用「距離 3」代替真正的 LoS（M4 才補 LoS）

### 3. Effect schema 擴充（subagent 上次留下的 TODO）
- 目前 `Effect` 只支援 `{stat, op, value}`，需要擴充為聯集：
  ```ts
  type Effect =
    | { kind: "stat"; stat: StatKey; op: "add" | "mul"; value: number }
    | { kind: "allowAction"; action: "ranged-after-move" | "move-after-ranged" }
    | { kind: "stateUnlock"; requiredTurns: number; unlocks: StatKey[] }
    | { kind: "selfCost"; stat: StatKey; op: "add"; value: number };
  ```
- 這樣就能表達：
  - `parthian-shot` (allowAction: ranged-after-move) — 輕騎兵
  - `deploy-required` (stateUnlock) — 長弓兵
  - `set-spears` (selfCost) — 槍兵自身移動 −1
- 改 schema 後要同步更新 combat.ts 的 trait 處理邏輯
- 既有的 JSON 檔也要遷移格式（寫一個簡單的 migration 函式或直接手改）

### 4. 衝鋒組合（move + melee）
- 目前 M2 是「每回合 3 選 1」（move / melee / ranged）
- M3 解鎖：**相鄰未行動單位若先 move → 立即可用 `shockAttack` 攻擊**
- UX：選單位 → move → 抵達後若相鄰敵人，自動高亮可衝鋒目標，點擊即 shock
- 需要區分「shock 是 charge 才有，一般近戰用 meleeAttack」
- 這會讓重騎兵 +2 平原衝鋒真正發揮威力

### 5. Routing rally（預留，M3 不一定要做）
- 指揮官重組功能要等 Hero 系統，M3 不做
- 但 GameState 裡的 `rallying` 狀態欄位已在，M8+ 啟用

---

## 🚧 已知限制與技術債

| 項目 | 嚴重度 | 何時處理 |
|---|---|---|
| parthian-shot / deploy-required / set-spears 非數值 trait 未作用 | 中 | M3（連同 schema 擴充） |
| 無衝鋒 move+melee 組合 | 中 | M3 |
| 射擊無 LoS 檢查（森林不擋視線） | 低 | M4 |
| 無側翼/背後計算（需 facing 系統） | 中 | M3 或 M4 |
| 無天氣效果實作（weathers.json traits 是空陣列） | 低 | M4 |
| 無 AI（藍軍目前也靠人點，熱座） | 中 | M7 |
| 無存檔（離開頁面就消失） | 低 | M8+ |
| 無動畫（移動/攻擊瞬間完成） | 低 | M8+ |
| 無音效（AudioManager 是 no-op） | 低 | 藍醫師指定時機 |

---

## 🗂 重要檔案速查

```
src/
├── engine/
│   ├── hex.ts              ← 六角幾何（距離、鄰居、pixel↔axial）
│   ├── types.ts            ← 所有核心型別（UnitType / Trait / GameState）
│   ├── state.ts            ← reducer（MOVE / ATTACK / END_TURN）
│   ├── combat.ts           ← 2D6 + CRT + trait 修正引擎 ★M2 新增
│   ├── pathfinding.ts      ← reachableRange Dijkstra
│   ├── loadRules.ts        ← JSON 規則集中載入
│   └── rules/
│       ├── units/*.json    ← 7 個兵種，擴充入口
│       ├── terrains.json   ← 8 地形
│       └── weathers.json   ← 7 天氣（traits 待 M4 填）
├── scenarios/
│   └── skirmishTest.ts     ← 20×12 測試場景（程式生成地形）
├── ui/
│   ├── HexMap.tsx          ← 主地圖（16:9、cell tint、攻擊高亮）
│   ├── UnitBadge.tsx       ← 3D 向量徽章（漸層+陰影+奶白符號）
│   └── CombatLog.tsx       ← 可摺疊紀錄面板 ★M2.1 新增
├── audio/
│   └── AudioManager.ts     ← 介面預留，no-op 實作
├── App.tsx
└── main.tsx
```

文件：
- `README.md` — 玩家導向
- `DESIGN.md` — 架構與里程碑（活文件）
- `RULES.md` — 規則手冊（兵種/地形/天氣/CRT）
- `HANDOVER.md` — 本檔

---

## 🚀 快速開工

```bash
cd /c/Users/someo/.openclaw/workspace/HexTactica
npm run dev       # http://localhost:5173
npm run build     # production build
git pull          # 從 GitHub 拉最新
```

推到 master 後 **GitHub Pages 會自動 build + deploy**，約 2–3 分鐘後
https://tlan1012.github.io/HexTactica/ 更新。

---

## 🎯 重要設計原則（別忘）

1. **規則資料驅動**：新兵種只寫 JSON + loadRules.ts 加一行 import，不改引擎
2. **兵力 + 士氣雙軌**：不只 HP 歸零才退場，崩潰才是真實戰場
3. **Hero 只留 slot 不實作**：`Unit.heroId?: string` 欄位在，M8+ 才啟用
4. **音效只留介面**：`AudioManager` no-op，接真實音效時完全不動邏輯
5. **全視野**：第一版無戰爭迷霧
6. **熱座 + AI 可調難度**：無網對戰
7. **16:9 強制畫布**：`aspectRatio: 16/9` + viewBox 自動補邊

---

## 💡 藍醫師當場強調過的偏好

- 規則不要太細、太細反而反效果（from pdf-review SKILL 討論）
- 徽章要 3D 立體（已做）
- 紅藍要高對比（已做）
- 陣營色要淡淡鋪在佔領格（已做）
- 戰鬥面板要能收（已做）
- 能用 subagent 加速就用（M1 已驗證並行效益）

---

## ❓ 下次開工時要問藍醫師的一件事

M3 一次做完還是拆兩次？
- **M3a**（士氣系統 + routing 狀態機 + 連鎖崩潰）
- **M3b**（Schema 擴充 + parthian-shot + deploy-required + 衝鋒組合）

兩個都不小，一次做完 commit 會很大。小V建議拆成 M3a → 玩一場看看 → M3b，
但若藍醫師想一次到位也可以。

— 小V
