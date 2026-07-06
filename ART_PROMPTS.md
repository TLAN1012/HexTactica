# 美術替換指南 — 生圖 Prompt 手冊

遊戲的美術是**資料驅動**的:每個兵種/地形就是 `public/art/` 底下的一張 PNG,
檔名對上就能直接替換,程式一行都不用改。你可以拿本手冊的 prompt 去
ChatGPT(或任何生圖工具)產圖,存成對應檔名丟進資料夾即可。

> **重要**:請讓生圖工具產出「原創」的奇幻美術。不要在 prompt 裡要求模仿
> 特定遊戲或畫師的角色設計 — 這樣產出的圖才是可以安心使用、發佈的素材。

---

## 一、檔案規格

| 項目 | 規格 |
|---|---|
| 位置 | 兵種:`public/art/units/<檔名>.png`;地形:`public/art/terrain/<檔名>.png` |
| 尺寸 | 建議 512×512(正方形),遊戲會裁切成六角形 |
| 構圖 | **滿版無留白**(full-bleed):主體置中、佔畫面 70% 以上,背景填滿到四邊 |
| 風格基調 | 古書銅版畫/蝕刻插畫風,羊皮紙底色,深棕色描邊,低飽和土色系 |

換圖後重新整理頁面即可看到;`npm run build` 會自動打包。

---

## 二、共用風格前綴(每個 prompt 開頭都加這段)

```
Antique copperplate engraving / etching style fantasy illustration,
aged parchment background, dark sepia ink outlines, muted earthy colors,
square full-bleed composition with the subject centered and filling the frame,
suitable as a hexagonal board-game token, no text, no watermark, no border
```

中文版(有些工具中文效果更好):

```
古董銅版畫蝕刻風格的奇幻插畫,泛黃羊皮紙底色,深褐色墨線描邊,
低飽和土色系,正方形滿版構圖、主體置中充滿畫面,
適合做六角棋盤遊戲棋子,不要文字、不要浮水印、不要邊框
```

---

## 三、人類戰團(7 個,檔名 = `public/art/units/` 下的 PNG)

| 檔名 | Prompt 主體(接在風格前綴後) |
|---|---|
| `infantry.png` | a medieval swordsman man-at-arms with round shield and arming sword, kite-shaped shield raised, chainmail and kettle helmet, upper-body portrait |
| `spearman.png` | a medieval spearman bracing a long pike at an angle, gambeson and simple iron helmet, determined expression, upper-body portrait |
| `archer.png` | a medieval archer drawing a shortbow, leather hood, quiver over shoulder, upper-body portrait |
| `longbow.png` | a tall medieval longbowman with an English longbow as tall as himself, arrow nocked, hood and leather bracer, upper-body portrait |
| `velite.png` | a light skirmisher about to hurl a javelin, small round buckler, cloth tunic and bare arms, dynamic throwing pose, upper-body portrait |
| `light-cavalry.png` | a light cavalry scout on a lean fast horse, curved saber, minimal leather armor, horse and rider in profile |
| `heavy-cavalry.png` | a heavily armored knight on an armored warhorse, couched lance and great helm, horse and rider in profile |

## 四、碎顱氏族/獸人戰團(7 個)

| 檔名 | Prompt 主體 |
|---|---|
| `orc-warrior.png` | an original fantasy orc warrior with green skin, heavy jaw and tusks, crude iron helmet band, scimitar over shoulder, bust portrait |
| `orc-impaler.png` | an original fantasy orc with a sharpened wooden stake as a spear, red headband, snarling tusked face, bust portrait |
| `orc-archer.png` | an original fantasy orc archer in a dark leather hood holding a crude shortbow, glowing red eyes, bust portrait |
| `troll-slinger.png` | an original fantasy grey-skinned troll hefting a huge boulder with a leather sling, droopy ears, heavy brow, bust portrait |
| `orc-axethrower.png` | an original fantasy orc skirmisher with two crossed throwing axes behind his head, red war paint across the face, bust portrait |
| `wolf-rider.png` | an original fantasy giant grey wolf with yellow eyes and bared fangs, a small orc rider on its back, head-and-shoulders portrait |
| `troll-crusher.png` | an original fantasy armored troll with riveted iron face-plate and pauldrons, grey-green skin, massive tusked jaw, bust portrait |

## 五、地形(5 個,檔名 = `public/art/terrain/` 下的 PNG)

| 檔名 | Prompt 主體 |
|---|---|
| `plains.png` | top-down view of dry golden grassland with faint dirt paths, seamless texture feel |
| `hills.png` | top-down view of rolling rocky hills with sparse dry grass |
| `forest.png` | top-down view of dense dark-green forest canopy |
| `swamp.png` | top-down view of murky swamp with mud pools and reeds |
| `river.png` | top-down view of deep blue-green river water with subtle current lines |

---

## 六、實用小抄

1. **一次一張**:一個 prompt 產一個兵種,構圖才穩定。
2. **去背不需要**:遊戲會把圖裁進六角形並蓋上陣營色框,滿版即可。
3. **同批風格一致**:同一個對話串裡連續生成、每次只換主體描述,整套風格最一致。
4. **產出後檢查**:縮到 60×60 像素看 — 棋盤上就是這個大小,剪影清楚才算合格。
5. **想換整體畫風?** 把「風格前綴」整段換掉(例如水彩、油畫、像素風),
   14 個兵種 + 5 個地形全部重生一輪即可。
