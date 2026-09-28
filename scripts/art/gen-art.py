#!/usr/bin/env python3
"""用自架 Qwen-Image「畫室」生成 HexTactica 哥德風美術 → public/art/**.webp

用法:python3 scripts/art/gen-art.py [類別或檔名關鍵字…]   不給就全部;已存在的檔案跳過(刪掉就會重畫)
畫室只在家用 tailnet 內(http://qwen-image:8189)。原圖另存 scripts/art/raw/(不進版控)。

提示詞原則(踩過的雷):只用正面描述,不要寫「不要…」(否定句的東西會被畫出來);畫面內容放前面、風格放後面。
"""
import io, json, sys, time, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(__file__).resolve().parent / "raw"
API = "http://qwen-image:8189"

STYLE = ("。精緻華麗的哥德風日系動畫插畫,美型少年少女,細膩的線條與上色,黑色、深紅、金色為主的華麗配色,"
         "蕾絲、緞帶、金屬飾邊與寶石裝飾,戲劇性的光影,高品質")
PORTRAIT = "半身肖像立繪,角色面向畫面、表情生動,背景是陰暗的哥德式拱窗與燭光"
TOKEN = "胸像特寫,臉與肩膀置中、占滿畫面,背景是深色的哥德式紋樣"

SPECS = {
  # ── 指揮官立繪 3:4 ──
  "portraits/harold":   ("3:4", "英格蘭國王哈羅德二世,俊美的金髮青年國王,戴簡樸的金色王冠,鎖子甲外罩深紅色鑲金邊斗篷,手持長柄丹麥斧,眼神堅毅。" + PORTRAIT),
  "portraits/gyrth":    ("3:4", "東盎格利亞伯爵吉爾斯,哈羅德的弟弟,溫柔忠誠的栗色短髮少年騎士,鎖子甲與深綠色鑲金斗篷,手按長劍。" + PORTRAIT),
  "portraits/morcar":   ("3:4", "諾森布里亞伯爵莫卡,英氣逼人的黑色長髮少年貴族,銀色鎖子甲與深藍色毛皮斗篷,手持圓盾與長矛。" + PORTRAIT),
  "portraits/edwin":    ("3:4", "麥西亞伯爵埃德溫,莫卡的兄長,沉穩的黑髮青年,留著細鬍,銀色鎖子甲與深紅色斗篷,腰佩長劍。" + PORTRAIT),
  "portraits/hardrada": ("3:4", "挪威國王哈拉爾・哈德拉達,高大威嚴的銀白長髮青年戰王,編髮與金色頭環,華麗的鎖子甲與黑色熊皮斗篷,手握飾有渡鴉的巨斧,眼神冷峻。" + PORTRAIT),
  "portraits/tostig":   ("3:4", "被放逐的伯爵托斯提格,哈羅德的弟弟,帶著陰鬱與不甘的金髮美少年,黑色與深紅的華麗外套,手持細長的劍。" + PORTRAIT),
  "portraits/orri":     ("3:4", "挪威將領埃斯坦・奧里,紅髮的熱血青年戰士,全副鎖子甲與頭盔抱在腰間,背著圓盾,神情急切。" + PORTRAIT),
  "portraits/william":  ("3:4", "諾曼第公爵威廉,冷靜銳利的黑髮青年公爵,短髮,華麗的黑色鎖子甲與金色獅紋罩袍,手持權杖與風箏形盾,眼神深沉。" + PORTRAIT),
  "portraits/odo":      ("3:4", "巴約主教厄德,威廉的弟弟,優雅的深棕色長髮美青年主教,身穿鎖子甲外罩華麗的主教長袍與金色十字架,手持權杖。" + PORTRAIT),
  # ── 兵種棋子 1:1 ──
  "units/saxon-huscarl":  ("1:1", "撒克遜王室家臣兵,英氣的黑髮少女戰士,戴鼻護頭盔,鎖子甲與深紅罩袍,肩扛長柄丹麥斧,手持風箏形盾。" + TOKEN),
  "units/saxon-fyrd":     ("1:1", "撒克遜民兵,樸實的棕髮農家少年,戴皮帽,粗布衣外罩皮甲,手持長矛與木製圓盾。" + TOKEN),
  "units/saxon-archer":   ("1:1", "撒克遜弓手,清秀的淺棕髮少女,綠色與深紅的獵裝兜帽,背著箭袋,手持長弓。" + TOKEN),
  "units/saxon-thegn":    ("1:1", "騎乘的撒克遜鄉紳,帥氣的金髮少年貴族騎在黑馬上,鎖子甲與飄揚的深紅斗篷,手持長矛。" + TOKEN),
  "units/norse-hirdman":  ("1:1", "維京親衛,冷酷的銀髮少年戰士,戴維京頭盔,鎖子甲與藍黑色罩袍,手持彩繪圓盾與長劍。" + TOKEN),
  "units/norse-raider":   ("1:1", "維京戰士,豪爽的金色辮髮少女,毛皮披肩與皮甲,手持單手斧與彩繪圓盾。" + TOKEN),
  "units/norse-berserker":("1:1", "維京狂戰士,狂野俊美的銀髮少年,披著熊皮斗篷,臉上有藍色戰紋,雙手握著雙刃斧,眼神熾烈。" + TOKEN),
  "units/norse-archer":   ("1:1", "維京弓手,神秘的白金色長髮少女,毛皮兜帽與深藍斗篷,手持獵弓,冷藍色光影。" + TOKEN),
  "units/norman-knight":  ("1:1", "諾曼騎士,高傲俊美的黑髮少年騎士騎在白色戰馬上,尖頂鼻護頭盔,鎖子甲,金色獅紋風箏盾與騎槍。" + TOKEN),
  "units/norman-breton":  ("1:1", "布列塔尼輕騎兵,活潑的紅棕髮少女騎在棕色快馬上,輕便皮甲與白黑相間的斗篷,手持標槍。" + TOKEN),
  "units/norman-crossbow":("1:1", "諾曼弩手,冷靜的灰髮少年,鎖子甲兜帽,舉著上弦的十字弓瞄準。" + TOKEN),
  "units/norman-archer":  ("1:1", "諾曼弓手,俏皮的黑色短髮少女,金色與黑色的輕裝,拉滿短弓。" + TOKEN),
  "units/norman-infantry":("1:1", "諾曼步兵,認真的棕髮少年,尖頂鼻護頭盔,鎖子甲,手持長矛與金色紋飾的風箏形盾。" + TOKEN),
  # ── 地形 tile 1:1(俯視、只有地面) ──
  "terrain/plains":  ("1:1", "從正上方俯視的一小片草原地面紋理,低飽和的橄欖綠與土黃色短草,零星小白花,平坦均勻,手繪水彩質感,偏暗的秋日色調"),
  "terrain/hills":   ("1:1", "從正上方俯視的丘陵地面紋理,起伏的土坡與岩石、枯黃草叢,手繪水彩質感,暗色調"),
  "terrain/forest":  ("1:1", "從正上方俯視的茂密森林樹冠紋理,深綠色的樹頂擠滿畫面,手繪水彩質感,暗色調"),
  "terrain/swamp":   ("1:1", "從正上方俯視的沼澤地面紋理,泥濘的黑綠色水窪、蘆葦與浮萍,手繪水彩質感,陰暗"),
  "terrain/river":   ("1:1", "從正上方俯視的深藍色河水紋理,水面有細小波紋與光點,手繪水彩質感"),
  "terrain/ford":    ("1:1", "從正上方俯視的淺灘紋理,清澈淺水下可見卵石與沙,水流分成細流,手繪水彩質感"),
  "terrain/bridge":  ("1:1", "從正上方俯視的一座古老木橋橋面,木板橫向排列、兩側是深藍色河水,手繪水彩質感"),
  "terrain/village": ("1:1", "從正上方俯視的中世紀小村莊,幾間茅草屋頂與木籬笆、泥土小路,手繪水彩質感,暗色調"),
  # ── 大圖 16:9 ──
  "story/title":      ("16:9", "史詩主視覺:三位美型青年君王對峙——中央是金髮的英格蘭國王哈羅德手持長斧,左側是銀髮披熊皮的挪威王哈拉爾,右側是黑髮身穿金獅罩袍的諾曼第公爵威廉,背景是燃燒的天空、飄揚的軍旗與哥德式大教堂剪影"),
  "story/war-1066":   ("16:9", "一張華麗的古老羊皮紙地圖,描繪中世紀的英格蘭島與海峽,邊框是金色的哥德式花紋與渡鴉、獅子、龍的紋章,海上畫著長船與帆船"),
  "story/fulford":    ("16:9", "戰場全景:1066 年約克城外的河畔,泥濘沼澤前撒克遜盾牆列陣,對面是舉著渡鴉旗的維京大軍,陰沉的秋日天空"),
  "story/stamford":   ("16:9", "戰場全景:陽光下的德文特河,一座木橋上一名巨漢維京狂戰士獨自擋住整支撒克遜大軍,對岸是沒穿盔甲的維京人與營帳"),
  "story/hastings":   ("16:9", "戰場全景:森拉克山脊上撒克遜盾牆與金色龍旗,山下諾曼騎士策馬衝鋒、弓箭如雨,夕陽染紅的天空"),
}

SIZES = {"portraits": (600, 800), "units": (384, 384), "terrain": (256, 256), "story": (1280, 720)}


def api(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def paint(prompt, ratio):
    j = api("/api/jobs", {"prompt": prompt, "mode": "int8", "size": ratio})
    while j["status"] not in ("done", "error", "failed"):
        time.sleep(3)
        j = api(f"/api/jobs/{j['id']}")
    if j["status"] != "done":
        raise RuntimeError(j.get("error"))
    with urllib.request.urlopen(API + j["image_url"], timeout=180) as r:
        return r.read(), j.get("seconds")


def main():
    want = sys.argv[1:]
    RAW.mkdir(parents=True, exist_ok=True)
    for key, (ratio, desc) in SPECS.items():
        if want and not any(w in key for w in want):
            continue
        out = ROOT / "public" / "art" / f"{key}.webp"
        if out.exists():
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        prompt = desc + (STYLE if not key.startswith("terrain") else "")
        data, secs = paint(prompt, ratio)
        (RAW / f"{key.replace('/', '_')}.png").write_bytes(data)
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img = img.resize(SIZES[key.split("/")[0]], Image.LANCZOS)
        img.save(out, "WEBP", quality=82, method=6)
        print(f"{key}  {secs}s  {out.stat().st_size // 1024}KB", flush=True)


if __name__ == "__main__":
    main()
