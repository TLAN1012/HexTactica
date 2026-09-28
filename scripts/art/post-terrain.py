#!/usr/bin/env python3
"""地形 tile 後製(生成後跑一次):橋轉成東西向、河流降飽和壓暗、渡口壓暗帶水色,讓整組色調一致。"""
from pathlib import Path
from PIL import Image, ImageEnhance

T = Path(__file__).resolve().parents[2] / "public" / "art" / "terrain"

def load(n): return Image.open(T / f"{n}.webp").convert("RGB")
def save(img, n): img.save(T / f"{n}.webp", "WEBP", quality=82, method=6)

save(ImageEnhance.Color(load("bridge").rotate(90)).enhance(0.7), "bridge")
r = ImageEnhance.Color(load("river")).enhance(0.55)
save(ImageEnhance.Brightness(r).enhance(0.72), "river")
f = ImageEnhance.Brightness(load("ford")).enhance(0.62)
f = Image.blend(f, Image.new("RGB", f.size, (60, 95, 120)), 0.3)
save(f, "ford")
print("ok")
