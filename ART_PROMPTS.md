# 美術替換指南 — 3 張合集圖搞定全套美術

遊戲美術是**資料驅動**的:兵種/地形就是 `public/art/` 下的 PNG,檔名對上即替換。
為了省事,整套美術簡化為 **3 張合集圖(sprite sheet)**:
生 3 張圖 → 用切圖工具切開 → 丟進資料夾,完成。

> **重要**:請讓生圖工具產出「原創」奇幻美術。不要在 prompt 裡要求模仿
> 特定遊戲或畫師的設計 — 這樣產出的圖才能安心使用與發佈。

---

## 現成的參考合集圖(目前遊戲用的美術長什麼樣)

部署後可直接下載:

- 合集 1 人類戰團:`https://tlan1012.github.io/HexTactica/art/sheets/sheet-humans.png`
- 合集 2 獸人戰團:`https://tlan1012.github.io/HexTactica/art/sheets/sheet-orcs.png`
- 合集 3 地形:`https://tlan1012.github.io/HexTactica/art/sheets/sheet-terrain.png`

(repo 內位置:`public/art/sheets/`)

## 切圖工具(瀏覽器直接用,免安裝)

`https://tlan1012.github.io/HexTactica/tools/art-slicer.html`

把 ChatGPT 生的合集圖拖進去 → 選合集類型 → 「全部下載」,
就會得到一格一張、**檔名已正確命名**的 PNG,直接放進
`public/art/units/`(兵種)或 `public/art/terrain/`(地形)。

---

## 三段 Prompt(每段生一張圖)

每段都可直接整段貼給 ChatGPT。共同要求已寫在 prompt 內:
**等大方格、無間距無邊框、不要文字** — 這樣切圖工具才能乾淨切開。

### 合集 1 — 人類戰團(4×2 方格,7 格 + 1 空格)

```
Create ONE image: a sprite sheet of 8 equal square cells arranged in a
4-column × 2-row grid with NO gaps, NO borders and NO text. Style for all
cells: antique copperplate engraving fantasy illustration, aged parchment
background, dark sepia ink outlines, muted earthy colors, each subject
centered and filling its cell, consistent style across all cells.
Cell contents, left to right, top to bottom:
1. a medieval swordsman with round shield and arming sword, chainmail, upper-body
2. a medieval spearman bracing a long pike, gambeson and iron helmet, upper-body
3. a medieval archer drawing a shortbow, leather hood, quiver, upper-body
4. a tall medieval longbowman with a longbow as tall as himself, arrow nocked, upper-body
5. a light skirmisher hurling a javelin, small buckler, dynamic pose, upper-body
6. a light cavalry scout with curved saber on a lean fast horse, in profile
7. a heavily armored knight with couched lance on an armored warhorse, in profile
8. plain empty parchment texture only
```

### 合集 2 — 獸人戰團(4×2 方格,7 格 + 1 空格)

```
Create ONE image: a sprite sheet of 8 equal square cells arranged in a
4-column × 2-row grid with NO gaps, NO borders and NO text. Style for all
cells: antique copperplate engraving fantasy illustration, aged parchment
background, dark sepia ink outlines, muted earthy colors, each subject
centered and filling its cell, consistent style across all cells.
All creatures are ORIGINAL fantasy designs. Cell contents, left to right, top to bottom:
1. an orc warrior, green skin, heavy tusked jaw, crude iron helmet band, scimitar, bust
2. an orc with a sharpened wooden stake as spear, red headband, snarling, bust
3. an orc archer in dark leather hood with crude shortbow, glowing red eyes, bust
4. a grey-skinned troll hefting a huge boulder with a leather sling, heavy brow, bust
5. an orc skirmisher with two crossed throwing axes, red war paint on face, bust
6. a giant grey wolf with yellow eyes and bared fangs, small orc rider on its back
7. an armored troll with riveted iron face-plate and pauldrons, grey-green skin, bust
8. plain empty parchment texture only
```

### 合集 3 — 地形(3×2 方格,5 格 + 1 空格)

```
Create ONE image: a sprite sheet of 6 equal square cells arranged in a
3-column × 2-row grid with NO gaps, NO borders and NO text. Style for all
cells: antique engraved map illustration, muted earthy colors, top-down
view, seamless texture feel, consistent style across all cells.
Cell contents, left to right, top to bottom:
1. dry golden grassland with faint dirt paths
2. rolling rocky hills with sparse dry grass
3. dense dark-green forest canopy
4. murky swamp with mud pools and reeds
5. deep blue-green river water with subtle current lines
6. plain empty parchment texture only
```

---

## 完整流程(兩分鐘)

1. 把上面某段 prompt 貼給 ChatGPT,存下生成的合集圖
2. 開切圖工具 `tools/art-slicer.html`,拖入圖片、選對應合集
3. 若 AI 生的格線稍有偏移,拉「內縮裁切」滑桿微調到每格乾淨
4. 按「全部下載」→ 把 PNG 放進 `public/art/units/` 或 `public/art/terrain/`
5. 重新整理遊戲頁面(本機 dev 立即生效;上線需 push 到 master)

## 驗收小抄

- 縮到 60×60 像素看剪影 — 棋盤上就這麼大,認得出兵種才合格
- 同一張合集圖內風格天生一致,這正是合集圖的好處
- 想換整體畫風:把 prompt 裡的風格句(engraving/parchment 那兩行)整段換掉,
  三張重生一輪即可
