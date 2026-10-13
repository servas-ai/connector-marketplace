#!/usr/bin/env python3
"""Logo-Thumbnails für Listen/Karten (≤48 px Anzeige): public/logos/<x>.png → public/logos/t/<x>.webp (96×96, 2× DPR).

Original-PNGs sind bis 256 px / ~50 KB groß; die Home-Tabelle zeigt sie mit 32 px. Ohne Thumbnails lädt
die mobile Startseite ~700 KB Logos (Lighthouse-LCP ~3.8 s). Inkrementell (mtime), ohne Pillow → No-Op
(UI fällt per onError auf das Original zurück)."""
import os, sys, glob

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'public', 'logos')
DST = os.path.join(SRC, 't')
SIZE = 96

try:
    from PIL import Image
except ImportError:
    print('build-logo-thumbs: Pillow fehlt – übersprungen (Fallback auf Original-Logos)')
    sys.exit(0)

os.makedirs(DST, exist_ok=True)
made = kept = failed = 0
src_bytes = dst_bytes = 0
for f in sorted(glob.glob(os.path.join(SRC, '*'))):
    stem, ext = os.path.splitext(os.path.basename(f))
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.ico'):
        continue
    out = os.path.join(DST, stem + '.webp')
    src_bytes += os.path.getsize(f)
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f):
        kept += 1; dst_bytes += os.path.getsize(out); continue
    try:
        im = Image.open(f)
        im.load()
        im = im.convert('RGBA')
        im.thumbnail((SIZE, SIZE), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2), im)
        canvas.save(out, 'WEBP', quality=86, method=4)
        made += 1; dst_bytes += os.path.getsize(out)
    except Exception as e:  # defektes Bild → kein Thumb, UI nutzt Original
        failed += 1
        print(f'build-logo-thumbs: {os.path.basename(f)}: {e}', file=sys.stderr)
        if os.path.exists(out): os.remove(out)
print(f'build-logo-thumbs: {made} neu, {kept} aktuell, {failed} Fehler · Quelle {src_bytes // 1024} KB → Thumbs {dst_bytes // 1024} KB')
