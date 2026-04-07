# HexTactica — 設計規格

> 本文件為開發期的活文件，隨實作調整。最後更新：2026-04-07（M0 骨架）

## 一、核心設計決策

| 項目 | 決定 |
|---|---|
| 技術棧 | Vite + React + TypeScript，純前端無後端 |
| 渲染 | SVG（徽章為向量），必要時 Canvas 加速 |
| 六角座標 | Pointy-top, Axial (q, r) |
| 地圖大小 | 40×30 起跳，依歷史場景縮放 |
| 回合制 | IGOUGO（我方全動完 → 敵方），每回合含「命令 / 移動 / 射擊 / 近戰 / 士氣檢定」五階段 |
| 單位尺度 | 一個棋子 ≈ 一支部隊（500–1000 人） |
| 雙軌指標 | **Strength (S)** 兵力 + **Morale (M)** 士氣 |
| 戰鬥解算 | 2D6 + 修正 + CRT 查表 |
| 視野 | 全視野（v1） |
| 多人 | 單機熱座（v1），網對戰不做 |
| AI | 3 檔難度：random / heuristic / minimax |
| 音效 | 介面預留 `AudioManager`，v1 為 no-op |
| 部署 | GitHub Pages 自動部署 |

## 二、架構

```
src/
├── engine/              ← 純邏輯，可單元測試、無 DOM
│   ├── hex.ts           ← 座標 / 距離 / 鄰居 / A* 路徑
│   ├── types.ts         ← GameState / Unit / Side 等型別
│   ├── state.ts         ← reducer、指令套用
│   ├── combat.ts        ← 射擊 / 近戰 / 衝鋒 CRT
│   ├── morale.ts        ← 潰敗檢定、rout 狀態機
│   ├── terrain.ts       ← 地形效應查表
│   ├── weather.ts       ← 天氣效應查表
│   ├── rally.ts         ← 崩潰單位撤退與重組（預留）
│   └── rules/           ← JSON 資料檔（擴充入口）
│       ├── units/
│       │   ├── heavy-cavalry.json
│       │   ├── light-cavalry.json
│       │   ├── archer.json
│       │   ├── longbow.json
│       │   ├── infantry.json
│       │   ├── spearman.json
│       │   └── velite.json    ← 標槍兵
│       ├── terrains.json
│       └── weathers.json
├── ai/
│   ├── difficulty.ts
│   ├── random.ts
│   ├── heuristic.ts
│   └── minimax.ts
├── audio/
│   └── AudioManager.ts  ← 介面預留，v1 no-op
├── scenarios/
│   ├── cannae-216bc.json
│   ├── agincourt-1415.json
│   └── hastings-1066.json
├── ui/                  ← React + SVG
│   ├── HexMap.tsx       ← 主地圖
│   ├── HexCell.tsx      ← 單一六角格
│   ├── UnitBadge.tsx    ← 向量徽章
│   ├── UnitPanel.tsx    ← 選中單位資訊
│   ├── CombatLog.tsx    ← 戰鬥記錄
│   ├── ScenarioPicker.tsx
│   └── WeatherBadge.tsx
├── App.tsx
└── main.tsx
```

## 三、兵種擴充 Schema

**核心原則：規則資料驅動，不寫死在程式。**

```ts
// src/engine/types.ts
export interface UnitType {
  id: string;                    // "heavy-cavalry"
  nameI18n: { zh: string; en: string };
  baseStats: {
    move: number;
    shockAttack: number;         // 衝擊（僅衝鋒第一擊）
    meleeAttack: number;
    rangedAttack: number;
    range: number;               // 射程（0 = 無）
    armor: number;
    morale: number;              // 1-10
    strength: number;            // 初始兵力 1-10
  };
  traits: Trait[];
  stateMachine?: UnitStateMachine;  // 例：標槍兵 ready→committed→spent
  heroSlot?: boolean;
  tags: string[];                // ["cavalry","melee","heavy"]
  emblem: EmblemSpec;            // 向量徽章資料
}

export interface Trait {
  id: string;
  trigger: TriggerEvent;
  condition?: ConditionExpr;
  effect: Effect;
  description: string;
}

export type TriggerEvent =
  | "onShock" | "onMelee" | "onRanged"
  | "onTerrain" | "onWeather"
  | "onFlank" | "onRear"
  | "onTurnStart" | "onTurnEnd"
  | "onAdjacentRout";

export interface Effect {
  stat: keyof Unit["stats"] | "move" | "range";
  op: "add" | "mul" | "set" | "cap" | "floor";
  value: number;
}
```

### 擴充一個新兵種的步驟（v1 規劃）

1. 在 `src/engine/rules/units/` 加一個新 JSON 檔
2. 若需要新 trigger 或 effect，到 `types.ts` 加進聯集
3. 若為全新行為（像標槍兵的 committed 狀態），到 `stateMachines.ts` 加一個 machine
4. （可選）到 `src/ui/emblems/` 加 SVG 徽章素材
5. Scenario JSON 裡就能引用它

## 四、單位狀態機

大多數兵種的狀態：
```
idle → moving → fighting → idle
             ↘ routing → rallying → idle
                       ↘ destroyed
```

**標槍兵 Velite 的特殊狀態機**：
```
ready (有標槍，可射可近戰)
  ↓ 投擲 (onRanged trigger)
committed (標槍已擲，必須衝向最近敵軍)
  ↓ 擊潰目標 OR 自身潰散
spent (回復普通近戰行為，但攻擊力下修)
```

`committed` 狀態下：
- 玩家不能下達「後退」「換目標」命令
- AI / 行動階段自動選擇最近敵軍作為衝鋒目標
- 每回合強制移動朝目標方向的最大距離
- 抵達後進入 `onMelee`
- 解除條件：目標清零 / 自身 routing / 自身 destroyed

## 五、士氣與潰敗

### 潰敗檢定觸發
- 本回合受到 ≥ 30% strength 傷害
- 側翼或背後被攻擊
- 視野內友軍潰敗（距離 ≤ 3）
- 被遠程壓制 2 回合以上
- 指揮官陣亡（M2 hero 系統後啟用）

### 檢定
```
2D6 + 修正 ≥ currentMorale → 保住
otherwise → 進入 shaken
shaken 時再觸發 → routing
routing 回合移動：往己方出發邊緣，速度 = base.move + 1
routing 狀態下無法攻擊，被攻擊士氣 -2
```

### Rally 重組（M2+ 預留）
- 需要指揮官（Hero）在視野內
- 指揮官需消耗「重組技能」
- 成功 → 回 `rallying` 1 回合 → 回 `idle`，但 morale cap 下修

## 六、戰鬥 CRT（暫定）

```
最終結果 = 攻擊方擲骰和 + 修正 - 防禦方裝甲
         → 查表 → 傷害（扣 strength）+ 是否觸發士氣檢定
```

修正來源疊加：
- 衝鋒 +2（僅重騎兵、槍兵的第一擊）
- 地形（林地 +2 防、沼澤 -1 防）
- 天氣（雨中弓 -2 射擊）
- 側翼 +2 攻
- 背後 +4 攻 + 強制士氣檢定
- 高度差 +1 攻（上坡攻 -1）
- Trait 效果（槍兵對騎兵 +3）

詳細 CRT 表格實作後寫入 [RULES.md](./RULES.md)。

## 七、歷史場景（v1 首發）

| 場景 | 年代 | 測試焦點 |
|---|---|---|
| 坎尼會戰 | 216 BC | 側翼包抄、士氣連鎖崩潰 |
| 阿金庫爾 | 1415 AD | 雨地形 + 長弓 + 重騎折損 |
| 黑斯廷斯 | 1066 AD | 盾牆 + 佯退 + 標槍兵投擲 |

場景 JSON 格式見 `src/scenarios/*.json`（待實作）。

## 八、里程碑

| M | 內容 | 狀態 |
|---|---|---|
| M0 | Vite + React + TS 骨架、設計文件、GitHub Pages CI | **進行中** |
| M1 | 六角地圖渲染、單位放置、移動範圍 | 待開工 |
| M2 | 戰鬥核心（CRT + 2D6）、回合流程 | 待開工 |
| M3 | 士氣系統、潰敗狀態機 | 待開工 |
| M4 | 地形 + 天氣 | 待開工 |
| M5 | 標槍兵 committed state | 待開工 |
| M6 | 第一個歷史場景（坎尼） | 待開工 |
| M7 | AI 對手三檔難度 | 待開工 |
| M8+ | Hero / Rally / 音效接入 / 更多場景 | 後續 |

## 九、未來預留的介面

### Hero 系統（目前只留 slot）
```ts
interface Unit { ... heroId?: string; }
interface Hero { id: string; name: string; abilities: HeroAbility[]; }
```

### 音效接口
```ts
// src/audio/AudioManager.ts
export interface AudioManager {
  loadTrack(id: string, url: string): Promise<void>;
  playBgm(id: string, loop?: boolean): void;
  stopBgm(fadeMs?: number): void;
  playSfx(id: string): void;           // "charge" "clash" "rout" "arrows"
  setMasterVolume(v: number): void;
}
export const audio: AudioManager = createNoopAudio();
```

### Rally 重組機制
`src/engine/rally.ts` 預留，v1 不啟用，但 GameState 裡已有 `rallying` 狀態欄位。

---

*— 小V 起草，藍醫師監修*
