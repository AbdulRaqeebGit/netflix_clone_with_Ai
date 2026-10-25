from PIL import Image, ImageOps
from pathlib import Path
for p in Path('assets/img/posters').glob('*.jpg'):
    im = Image.open(p).convert('RGB')
    if im.width > 520:
        target_w = 500
        im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
    im.save(p, 'JPEG', quality=84, optimize=True, progressive=True)
    print(p.name, im.size, p.stat().st_size)
for name in ['hero-dune','backdrop-desert-2','backdrop-city','backdrop-cinema']:
    p = Path('assets/img') / f'{name}.jpg'
    im = Image.open(p).convert('RGB')
    target_w = 1920
    im = im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)
    im.save(p, 'JPEG', quality=82, optimize=True, progressive=True)
    print(name, im.size, p.stat().st_size)
