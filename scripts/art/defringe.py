#!/usr/bin/env python3
"""去背後的白邊處理:alpha 往內收 1px 並把半透明邊緣的顏色壓暗,去掉白底留下的光暈。"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
ART = Path(__file__).resolve().parents[2] / "public" / "art"
for d, px in (("portraits", 3), ("sprites", 3)):
    for f in (ART / d).glob("*.webp"):
        im = Image.open(f).convert("RGBA")
        r, g, b, a = im.split()
        a2 = a.filter(ImageFilter.MinFilter(px))
        edge = ImageChops.subtract(a, a2)            # 被收掉的邊緣帶
        dark = Image.merge("RGB", (r, g, b)).point(lambda v: int(v * 0.55))
        rgb = Image.composite(dark, Image.merge("RGB", (r, g, b)), edge)
        out = Image.merge("RGBA", (*rgb.split(), a2.filter(ImageFilter.GaussianBlur(0.6))))
        out.save(f, "WEBP", quality=85, method=6)
print("ok")
