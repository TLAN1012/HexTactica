#!/usr/bin/env python3
"""地形 tile 後製(每張只做一次,記在 .post):橋轉東西向、河流與渡口壓暗降飽和,新地形微調色調。"""
from pathlib import Path
from PIL import Image, ImageEnhance

T = Path(__file__).resolve().parents[2] / "public" / "art" / "terrain"
done_f = T / ".post"
done = set(done_f.read_text().split()) if done_f.exists() else set()

def load(n): return Image.open(T / f"{n}.webp").convert("RGB")
def save(img, n): img.save(T / f"{n}.webp", "WEBP", quality=82, method=6)

def once(name, fn):
    if name in done or not (T / f"{name}.webp").exists():
        return
    save(fn(load(name)), name)
    done.add(name)

once("bridge", lambda im: ImageEnhance.Color(im.rotate(90)).enhance(0.7))
once("river", lambda im: ImageEnhance.Brightness(ImageEnhance.Color(im).enhance(0.55)).enhance(0.72))
once("ford", lambda im: Image.blend(ImageEnhance.Brightness(im).enhance(0.62), Image.new("RGB", im.size, (60, 95, 120)), 0.3))
for n in ("mud", "stakes", "hedge", "fort"):
    once(n, lambda im: ImageEnhance.Color(im).enhance(0.8))
done_f.write_text("\n".join(sorted(done)) + "\n")
print("ok")
