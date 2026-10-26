"""Re-encode posters and hero backdrops to optimised progressive JPEGs.

Run from anywhere:  python tools/optimize-images.py
Requires Pillow (pip install pillow).
"""
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = PROJECT_ROOT / "assets" / "img"

posters = sorted((IMG_DIR / "posters").glob("*.jpg"))
heroes = [IMG_DIR / name for name in ("hero-dune", "backdrop-desert-2", "backdrop-city", "backdrop-cinema")]
heroes += sorted((IMG_DIR / "backdrops").glob("*.jpg"))

for p in posters:
    im = Image.open(p).convert("RGB")
    if im.width > 520:
        target_w = 500
        im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
    im.save(p, "JPEG", quality=84, optimize=True, progressive=True)
    print(p.name, im.size, p.stat().st_size)

for p in heroes:
    if not p.exists():
        continue
    im = Image.open(p).convert("RGB")
    target_w = 1920
    im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
    im.save(p, "JPEG", quality=82, optimize=True, progressive=True)
    print(p.name, im.size, p.stat().st_size)
