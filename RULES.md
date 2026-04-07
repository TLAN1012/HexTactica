# HexTactica — 規則手冊（v1 草案）

> 此文件為玩家與規則設計師用。開發者同時可視為 CRT/表格的單一真實來源。

## 一、地圖與座標

- **六角格**：Pointy-top（尖角朝上）
- **座標系**：Axial `(q, r)`
- **距離公式**：`(|dq| + |dq+dr| + |dr|) / 2`
- **六鄰居**：`(+1,0)(−1,0)(0,+1)(0,−1)(+1,−1)(−1,+1)`

## 二、兵種總表

| 兵種 ID | 中文 | 移動 | 衝擊 | 近戰 | 射擊 | 射程 | 甲 | 士氣 | 兵力 | 標籤 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `heavy-cavalry` | 重騎兵 | 4 | **6** | 4 | — | — | 4 | 7 | 6 | cavalry, melee, heavy |
| `light-cavalry` | 輕騎兵 | **6** | 3 | 2 | 1 | 1 | 2 | 5 | 5 | cavalry, skirmisher |
| `archer` | 弓兵 | 3 | 0 | 1 | 3 | 4 | 1 | 4 | 4 | ranged, light |
| `longbow` | 長弓兵 | 3 | 0 | 2 | **5** | **6** | 2 | 5 | 5 | ranged, deployable |
| `infantry` | 步兵 | 3 | 2 | 4 | — | — | 3 | 6 | 7 | infantry, melee |
| `spearman` | 槍兵 | 3 | 3 | 3 | — | — | 3 | 6 | 7 | infantry, anti-cavalry |
| `velite` | 標槍兵 | 4 | 3 | 2 | 4 | 2 | 2 | 5 | 4 | skirmisher, javelineer |

## 三、兵種 Trait 清單

### 重騎兵
- **`plains-charge`**：平原地形 `onShock` 衝擊 +2
- **`forest-disadvantage`**：林地 `onMelee` −3
- **`swamp-disadvantage`**：沼澤 `onMelee` −3、移動 −1
- **`vs-spear-wall`**：攻擊正面槍兵 `onShock` −3

### 輕騎兵
- **`parthian-shot`**：移動後仍可射擊一次
- **`flank-bonus`**：側背攻擊 +2

### 弓兵
- **`rain-penalty`**：雨中射擊 −2
- **`high-ground`**：高地射擊 +1

### 長弓兵
- **`heavy-rain-penalty`**：雨中射擊 −3
- **`deploy-required`**：需 1 回合佈署才可使用最遠 2 格射程
- **`anti-heavy`**：對 `heavy` 標籤單位射擊 +1

### 步兵
- 無特殊 trait（平衡基準）

### 槍兵
- **`anti-cavalry`**：對 `cavalry` 近戰 +3
- **`set-spears`**：佈陣後受騎兵衝鋒時，對方 `onShock` −2，但自身移動 −1
- **`formation-heavy`**：進入沼澤/森林陣形瓦解，−2 近戰

### 標槍兵 (Velite)
- **`javelin-throw`**：狀態 `ready` 時可射擊；投擲後狀態 → `committed`
- **`committed-charge`**：`committed` 狀態下必須每回合朝最近敵軍移動最大距離
- **`committed-lock`**：`committed` 狀態下玩家無法下達後退或換目標指令
- **`spent-melee-debuff`**：目標擊破後進入 `spent`，近戰 −1

## 四、地形

| 地形 | 移動成本 | 防禦修正 | 特殊 |
|---|---:|---:|---|
| 平原 Plains | 1 | 0 | 騎兵 `onShock` +2 |
| 丘陵 Hills | 2 | +1 | 射擊距離 +1、視野 +1 |
| 森林 Forest | 3 | +2 | 騎兵衝鋒失效、視野降至 1 |
| 沼澤 Swamp | 3 | −1 | 騎兵 −3、陣形兵 −2 |
| 河流 River | 4（渡口 1） | −2 | 渡河中被攻擊兵力吸收減半 |
| 道路 Road | 0.5 | 0 | 移動加速，戰鬥無修正 |
| 村落 Village | 2 | +2 | 駐守方 `onTurnStart` 士氣 +1 |
| 城牆 Wall | — | +4 | 騎兵無法進入，需登城 |

## 五、天氣

| 天氣 ID | 名稱 | 效果 |
|---|---|---|
| `clear` | 晴朗 | 基準 |
| `rain` | 雨 | 弓 −2 射擊；長弓 −3 射擊；所有單位移動 −1 |
| `fog` | 濃霧 | 視野 −2；射擊 −1；側翼突襲機會 +1 |
| `wind-head` | 逆風 | 射擊距離 −1；標槍距離 −1 |
| `wind-tail` | 順風 | 射擊距離 +1；標槍距離 +1 |
| `snow` | 大雪 | 移動成本 +1；士氣 −1 |
| `heat` | 酷熱 | 重甲單位 2 回合後疲勞 −1 近戰 |

**v1 採固定天氣**（每場景設定一種），v2+ 再做動態天氣。

## 六、回合流程

```
每回合：
  1. 回合起始階段（onTurnStart）
     - 地形加成套用（村落士氣 +1 等）
     - 天氣效應計算
     - 指揮官技能檢查（v2+）
  2. 命令階段
     - 玩家選單位，下達命令（移動 / 射擊 / 衝鋒 / 佈陣）
     - 標槍兵 committed 狀態自動產生命令
  3. 移動結算
     - 路徑計算（A*，考慮地形成本）
     - 機會攻擊判定（ZoC）
  4. 射擊結算
     - 射程 + LoS 檢查
     - CRT 擲骰
     - 傷害 + 士氣檢定
  5. 近戰結算
     - 雙方同時擲骰
     - 衝鋒方享 shockAttack 取代 meleeAttack（僅第一擊）
     - 結算後判定誰退出戰鬥
  6. 士氣階段（onTurnEnd）
     - 受傷 ≥ 30% strength 的單位檢定
     - 視野內友軍潰敗連鎖檢定
     - 進入 shaken / routing 狀態
  7. 切換陣營
```

## 七、戰鬥 CRT（待調整）

```
基礎公式：
  攻方值 = 2D6 + 攻擊屬性（shock/melee/ranged） + trait 修正 + 地形/天氣修正 + 側背修正
  防方值 = 裝甲 + 地形防禦修正
  差值 = 攻方值 − 防方值

差值 → 傷害 → 士氣檢定觸發
  < 0    :  0 damage
  0-2    :  1 damage
  3-5    :  2 damage
  6-8    :  3 damage, trigger morale check
  9-11   :  4 damage, trigger morale check
  12+    :  5 damage, trigger morale check (severe)
```

> 此表為 v1 起點，M2 實作後會依平衡測試調整。

## 八、勝利條件

- **殲滅勝**：一方所有單位 destroyed 或 routing 且無法重組
- **崩潰勝**：一方 60% 以上單位處於 routing 或已 destroyed（預設）
- **場景特定**：歷史場景可自訂（如「守住這個村落 10 回合」）

## 九、歷史場景特殊規則（v1 範圍）

### 坎尼會戰 (216 BC)
- 固定天氣：`heat`
- 地形：平原為主，中央有淺河谷
- 特殊：羅馬方中央步兵可向後平移 1 格以模擬漢尼拔誘敵

### 阿金庫爾 (1415 AD)
- 固定天氣：`rain`
- 地形：泥濘平原（移動成本 +1），兩側為密林
- 特殊：長弓兵已部署完畢（開局 deploy complete）

### 黑斯廷斯 (1066 AD)
- 固定天氣：`clear`
- 地形：緩坡丘陵
- 特殊：盎格魯薩克遜方開局為「盾牆」佈陣（onShock −2）

---

*— 小V 起草*
