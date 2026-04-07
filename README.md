# HexTactica

> 六角戰棋遊戲：模擬真實古代／中世紀戰場。
> A hex-based tactical wargame simulating real historical battles.

![status](https://img.shields.io/badge/status-M0%20skeleton-orange)
![license](https://img.shields.io/badge/license-MIT-blue)

## 特色

- **兵力 + 士氣雙軌**：單位不只看 HP 歸零，更看士氣崩潰 — 真正的古代戰場
- **真實戰場要素**：地形、天氣、側背攻擊、衝鋒、潰敗撤退
- **歷史場景重現**：坎尼、阿金庫爾、黑斯廷斯…（首發三場）
- **資料驅動**：兵種、地形、天氣皆為 JSON 定義，可擴充
- **單機熱座**：同一台裝置輪流對戰，內建 AI 難度可調
- **純前端**：無後端、離線可玩、自動部署到 GitHub Pages

## 兵種（v1）

| 兵種 | 亮點 |
|---|---|
| 重騎兵 | 平地衝鋒王者，怕長槍陣、怕林地沼澤 |
| 輕騎兵 | 高機動 + parthian shot，側背突襲 |
| 弓兵 | 遠程壓制，怕雨 |
| 長弓兵 | 超遠射程，需佈署，雨中廢掉 |
| 步兵 | 通用，無短板也無亮點 |
| 槍兵 | 對騎兵 +3，陣形移動慢 |
| 標槍兵 | **一次性投擲 → 自動衝殺到底**，復刻羅馬 Velites |

詳細規則見 [RULES.md](./RULES.md)。

## 開發狀態

目前在 **M0 骨架**階段，只有專案鷹架。完整里程碑見 [DESIGN.md](./DESIGN.md#milestones)。

## 開發指令

```bash
npm install      # 安裝依賴
npm run dev      # 本地開發伺服器（http://localhost:5173）
npm run build    # 建置 production 靜態網頁
npm run preview  # 本地預覽 build 結果
```

## 線上試玩

Push 到 `master` 後會自動部署至 GitHub Pages：
→ https://tlan1012.github.io/HexTactica/

## 授權

MIT

---

*— 小V 起草，藍醫師監修*
