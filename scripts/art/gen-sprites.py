#!/usr/bin/env python3
"""去背立繪與戰場小人(需要家用 tailnet 的畫室 + ~/rembg-venv 的 rembg isnet-anime)。

1. 立繪:原圖 → 畫室「以圖改圖」把背景換純白(人物不動)→ rembg 去背 → public/art/portraits/<id>.webp(透明)
2. 小人:畫室直接畫白底 Q 版全身小人 → rembg 去背 → public/art/sprites/<id>.webp(透明,裁到內容)

直接在深色背景上去背會留暗色殘影,所以一律先換白底。已存在的檔案跳過。
用法:~/rembg-venv/bin/python scripts/art/gen-sprites.py [portraits|sprites] [關鍵字…]
"""
import base64, io, json, sys, time, urllib.request
from pathlib import Path
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(__file__).resolve().parent / "raw"
ART = ROOT / "public" / "art"
API = "http://qwen-image:8189"
SESSION = new_session("isnet-anime")

STYLE = "。精緻華麗的哥德風日系動畫插畫,細膩上色,黑色、深紅、金色的華麗配色,蕾絲與金屬飾邊,乾淨的純白色背景"
CHIBI = "Q版二頭身的可愛小人,全身站姿,側身朝向畫面右方,腳踏地面,整個人完整在畫面中央,輪廓清楚。"

SPRITES = {
    # 1066
    "saxon-huscarl": "撒克遜王室家臣兵,黑髮少女,鼻護頭盔,鎖子甲與深紅罩袍,扛著長柄大斧,手持風箏形盾",
    "saxon-fyrd": "撒克遜民兵,棕髮農家少年,皮帽,粗布衣與皮甲,手持長矛與木圓盾",
    "saxon-archer": "撒克遜弓手,淺棕髮少女,綠色兜帽,背箭袋,拉開長弓",
    "saxon-thegn": "騎馬的撒克遜鄉紳,金髮少年騎在黑色小馬上,鎖子甲與紅斗篷,手持長矛",
    "norse-hirdman": "維京親衛,銀髮少年,角盔,鎖子甲,彩繪圓盾與長劍",
    "norse-raider": "維京戰士,金色辮髮少女,毛皮披肩,單手斧與彩繪圓盾",
    "norse-berserker": "維京狂戰士,銀髮少年披熊皮,臉有藍色戰紋,雙手高舉雙刃大斧",
    "norse-archer": "維京弓手,白金長髮少女,毛皮兜帽與深藍斗篷,持獵弓",
    "norman-knight": "諾曼騎士,黑髮少年騎在白色戰馬上,尖頂頭盔,鎖子甲,金獅風箏盾與長騎槍",
    "norman-breton": "布列塔尼輕騎兵,紅棕髮少女騎在棕色快馬上,輕皮甲,手持標槍",
    "norman-crossbow": "諾曼弩手,灰髮少年,鎖子甲兜帽,舉著十字弓瞄準",
    "norman-archer": "諾曼弓手,黑色短髮少女,黑金輕裝,拉滿短弓",
    "norman-infantry": "諾曼步兵,棕髮少年,尖頂頭盔,鎖子甲,長矛與金紋風箏盾",
    # 指揮官
    "cmd-harold": "英格蘭國王哈羅德,金髮青年,金色王冠,鎖子甲與深紅鑲金斗篷,手持長柄丹麥斧",
    "cmd-gyrth": "東盎格利亞伯爵吉爾斯,栗色短髮少年,鎖子甲與深綠斗篷,手持長劍",
    "cmd-morcar": "諾森布里亞伯爵莫卡,黑色長髮少年,銀色鎖子甲與深藍毛皮斗篷,長矛與圓盾",
    "cmd-edwin": "麥西亞伯爵埃德溫,黑髮青年,銀色鎖子甲與深紅斗篷,腰佩長劍",
    "cmd-hardrada": "挪威國王哈拉爾,銀白長髮青年戰王,金頭環,黑熊皮斗篷,扛著巨斧",
    "cmd-tostig": "托斯提格,陰鬱的金髮美少年,黑紅華麗外套,細長的劍",
    "cmd-orri": "挪威將領奧里,紅髮熱血青年,全副鎖子甲,背圓盾,手持劍",
    "cmd-william": "諾曼第公爵威廉,黑髮青年,黑色鎖子甲與金獅罩袍,手持權杖與風箏盾",
    "cmd-odo": "巴約主教厄德,深棕長髮美青年,鎖子甲外罩主教長袍,手持金色權杖",
    # 奇幻外傳
    "infantry": "劍盾兵,藍色罩袍的少年騎士,鐵盔,長劍與大盾",
    "spearman": "長槍兵,藍色罩袍的少女,鐵盔,手持長槍",
    "archer": "弓兵,藍綠色兜帽的少女,拉開長弓",
    "longbow": "長弓兵,高個子少年,藍色披風,持比人還高的長弓",
    "velite": "標槍兵,輕裝的活潑少年,藍色短袍,手持數支標槍",
    "light-cavalry": "輕騎兵,藍色披風的少女騎在棕色快馬上,手持軍刀",
    "heavy-cavalry": "重騎兵,全身板甲的少年騎士騎在披甲戰馬上,手持長騎槍",
    "orc-warrior": "獸人戰士,綠皮膚的哥德風美型獸人少年,獠牙,粗獷盔甲,彎刀",
    "orc-impaler": "獸人戳刺手,綠皮膚的獸人少女,獠牙,扛著削尖的長木樁",
    "orc-archer": "獸人射手,綠皮膚的獸人少年,獠牙,粗製短弓",
    "troll-slinger": "巨魔投石手,灰皮膚的大個子巨魔少年,扛著一架小型木製投石機",
    "orc-axethrower": "獸人擲斧手,綠皮膚的獸人少女,腰間掛滿飛斧,舉斧投擲",
    "wolf-rider": "座狼騎兵,綠皮膚的獸人少年騎在灰色巨狼上",
    "troll-crusher": "巨魔衝撞者,灰皮膚的巨魔穿著廢鐵盔甲,低頭衝撞",
    # 百年戰爭
    "eng-longbow": "英格蘭長弓手,短髮少年,皮甲與白底紅十字罩衫,拉開比人還高的長弓",
    "eng-manatarms": "英格蘭徒步重甲兵,少女騎士,全身板甲與紅白罩袍,手持長柄戰斧",
    "eng-billman": "英格蘭鉤鐮槍兵,農家少年,皮帽與紅十字罩衫,手持長柄鉤鐮槍",
    "eng-hobelar": "英格蘭騎乘弓手,少女騎在小矮馬上,輕皮甲,背著長弓",
    "eng-knight": "英格蘭騎士,金髮少年騎在披紅布的戰馬上,板甲,手持騎槍",
    "fr-knight": "法蘭西重甲騎士,黑髮少年騎在披藍色金百合馬衣的戰馬上,尖頂頭盔,手持騎槍",
    "fr-manatarms": "法蘭西徒步重甲兵,全身板甲的少年,藍色金百合罩袍,手持短矛與劍",
    "genoese": "熱那亞弩手,少女,紅白條紋外衣,背著大型盾牌,舉著十字弓",
    "fr-militia": "法蘭西城市民兵,少女,藍色外衣與鐵盔,手持長戟",
    "cmd-edward3": "英格蘭國王愛德華三世,金褐色長髮青年,金王冠,英法紋章罩袍,長劍",
    "cmd-blackprince": "黑太子愛德華,黑髮少年,漆黑板甲與黑羽飾,長劍",
    "cmd-henry5": "英格蘭國王亨利五世,棕色短髮青年,頭盔上戴王冠,紅藍紋章罩袍",
    "cmd-captal": "布赫領主,金色捲髮青年騎在白馬上,銀甲金披風,騎槍",
    "cmd-glasdale": "英格蘭守將格拉斯戴爾,灰髮青年,厚重板甲與深紅斗篷,手持戰錘",
    "cmd-philip6": "法蘭西國王腓力六世,深褐長髮青年,金百合藍罩袍,王冠,權杖",
    "cmd-johnbohemia": "盲眼波希米亞國王,雙眼蒙黑絲帶的銀髮青年騎在戰馬上,黑金盔甲",
    "cmd-john2": "法蘭西國王約翰二世,淺棕髮青年,金百合藍罩袍,王冠,戰斧",
    "cmd-dalbret": "法蘭西統帥達爾布雷,黑髮青年,板甲,手持統帥權杖",
    "cmd-joan": "聖女貞德,黑色短髮少女,銀白色全身板甲,高舉白色百合旗幟",
    "cmd-dunois": "奧爾良私生子杜諾瓦,黑色長髮青年,銀甲深藍斗篷,長劍",
}


def api(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def job(body):
    j = api("/api/jobs", body)
    while j["status"] not in ("done", "error", "failed"):
        time.sleep(3)
        j = api(f"/api/jobs/{j['id']}")
    if j["status"] != "done":
        raise RuntimeError(j.get("error"))
    with urllib.request.urlopen(API + j["image_url"], timeout=180) as r:
        return r.read()


def cutout(data: bytes) -> Image.Image:
    im = remove(Image.open(io.BytesIO(data)).convert("RGB"), session=SESSION)
    return im.crop(im.getbbox())


def portraits(want):
    out_dir = ART / "portraits"
    for raw in sorted(RAW.glob("portraits_*.png")):
        cid = raw.stem.split("_", 1)[1]
        if want and not any(w in cid for w in want):
            continue
        white = RAW / f"white_{cid}.png"
        out = out_dir / f"{cid}.webp"
        if out.exists() and (out_dir / ".cut").exists() and cid in (out_dir / ".cut").read_text().split():
            continue
        if not white.exists():
            white.write_bytes(job({
                "prompt": "把背景換成乾淨的純白色,人物的臉、髮型、服裝、武器、姿勢與構圖完全保持不變,人物周圍沒有任何背景物件",
                "mode": "int8", "size": "auto",
                "images": ["data:image/png;base64," + base64.b64encode(raw.read_bytes()).decode()],
            }))
        im = cutout(white.read_bytes())
        im.thumbnail((600, 900), Image.LANCZOS)
        im.save(out, "WEBP", quality=85, method=6)
        with open(out_dir / ".cut", "a") as f:
            f.write(cid + "\n")
        print("portrait", cid, im.size, flush=True)


def sprites(want):
    out_dir = ART / "sprites"
    out_dir.mkdir(parents=True, exist_ok=True)
    for sid, desc in SPRITES.items():
        if want and not any(w in sid for w in want):
            continue
        out = out_dir / f"{sid}.webp"
        if out.exists():
            continue
        data = job({"prompt": CHIBI + desc + STYLE, "mode": "int8", "size": "1:1"})
        (RAW / f"sprite_{sid}.png").write_bytes(data)
        im = cutout(data)
        im.thumbnail((256, 256), Image.LANCZOS)
        im.save(out, "WEBP", quality=85, method=6)
        print("sprite", sid, im.size, flush=True)


if __name__ == "__main__":
    kind, want = (sys.argv[1] if len(sys.argv) > 1 else "all"), sys.argv[2:]
    if kind in ("all", "portraits"):
        portraits(want)
    if kind in ("all", "sprites"):
        sprites(want)
