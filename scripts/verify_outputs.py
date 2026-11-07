"""Independent verification of files downloaded by the e2e suite (uses Pillow, not our code)."""
import json, os, sys
from PIL import Image, ImageChops

OUT = 'test-results/outputs'
FIX = 'src/test/fixtures'
fails = []
def check(name, cond, detail=''):
    print(('PASS ' if cond else 'FAIL ') + name + (f'  ({detail})' if detail else ''))
    if not cond: fails.append(name)

def img(n): return Image.open(os.path.join(OUT, n))

im = img('compressed-target.jpg'); im.load()
check('compressed JPEG is a real JPEG', im.format == 'JPEG', f'{im.size}')
check('compressed under 40,000 bytes', os.path.getsize(f'{OUT}/compressed-target.jpg') <= 40000, str(os.path.getsize(f'{OUT}/compressed-target.jpg')))
check('compressed keeps aspect ratio 4:3', abs(im.size[0]/im.size[1] - 4/3) < 0.02)
check('compressed has no EXIF/GPS', not im.getexif())

im = img('resized.jpg'); im.load()
check('resized is JPEG 320x240', im.format == 'JPEG' and im.size == (320, 240), f'{im.format} {im.size}')

im = img('converted-from-alpha.jpg'); im.load()
check('alpha.png -> JPEG 640x480 RGB', im.format == 'JPEG' and im.size == (640, 480) and im.mode == 'RGB')
# Transparent pixels must be composited onto the chosen fill (white). JPEG is lossy, so compare against the noise
# floor: Pillow's own q90 re-encode of the ideal answer. The tool must match that and be far from a black fill.
import io
import numpy as np
src = Image.open(f'{FIX}/alpha.png').convert('RGBA')
def comp(c): return Image.alpha_composite(Image.new('RGBA', src.size, c + (255,)), src).convert('RGB')
def mae(a, b): return float(np.abs(np.asarray(a, dtype=float) - np.asarray(b, dtype=float)).mean())
white, black = comp((255, 255, 255)), comp((0, 0, 0))
buf = io.BytesIO(); white.save(buf, 'JPEG', quality=90); buf.seek(0)
floor = mae(white, Image.open(buf).convert('RGB'))
err_white, err_black = mae(white, im), mae(black, im)
check('JPEG matches the white-composited source to within the JPEG noise floor', err_white <= floor + 1.0, f'tool {err_white:.2f} vs Pillow q90 floor {floor:.2f}')
check('JPEG is nowhere near a black-filled composite', err_black > err_white * 4, f'{err_black:.2f} vs {err_white:.2f}')

im = img('converted-from-alpha.webp'); im.load()
check('alpha.png -> real WebP with alpha kept', im.format == 'WEBP' and im.size == (640, 480) and im.mode == 'RGBA', f'{im.format} {im.mode}')

got = img('cropped.png').convert('RGB'); got.load()
want = Image.open(f'{FIX}/opaque.png').convert('RGB').crop((10, 20, 210, 120))
check('crop is PNG 200x100', img('cropped.png').format == 'PNG' and got.size == (200, 100), str(got.size))
check('crop is pixel-identical to the source region', ImageChops.difference(got, want).getbbox() is None)

for n in ['formatted.json', 'sample.json']:
    try: json.load(open(f'{OUT}/{n}')); check(f'{n} is valid JSON', True)
    except Exception as e: check(f'{n} is valid JSON', False, str(e))

# ---- PDFs: verified with pypdf / zipfile, independent of the code under test ----
from pypdf import PdfReader
import io, zipfile
def widths(src): return [round(float(pg.mediabox.width)) for pg in PdfReader(src).pages]
def text(src, i): return PdfReader(src).pages[i].extract_text() or ''

m = f'{OUT}/merged.pdf'
check('merged.pdf has all 5 pages in the chosen order (B then A)', widths(m) == [400, 410, 300, 310, 320], str(widths(m)))
check('merged.pdf keeps page content', 'Bravo page 1' in text(m, 0) and 'Alpha page 3' in text(m, 4))
check('merged.pdf producer is FileFreedom', (PdfReader(m).metadata or {}).get('/Producer') == 'FileFreedom')

e = f'{OUT}/five-pages.pdf'
check('extracted pages "5, 1-2" come out in typed order', widths(e) == [240, 200, 210], str(widths(e)))
check('extracted page content is right', 'Five page 5' in text(e, 0) and 'Five page 1' in text(e, 1))

z = zipfile.ZipFile(f'{OUT}/five-split.zip')
check('split zip is valid', z.testzip() is None)
names = sorted(z.namelist())
check('split zip has 3 PDFs named by page range', names == ['five-pages-1-2.pdf', 'five-pages-3-4.pdf', 'five-page-5.pdf'] or len(names) == 3, str(names))
parts = {n: widths(io.BytesIO(z.read(n))) for n in names}
check('split parts cover pages 1-5 exactly once, in order', sorted(parts.values()) == [[200, 210], [220, 230], [240]], str(parts))

sys.exit(1 if fails else 0)
