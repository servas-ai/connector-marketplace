#!/usr/bin/env python3
"""Logo-WebPs: public/logos/<x>.png → public/logos/t/<x>.webp (96×96, Listen/Karten ≤48 px, 2× DPR)
und public/logos/w/<x>.webp (≤256 px, Detail-Header 112 px; ~4 KB statt ~27 KB PNG, LCP-Bild der Detailseite).

Original-PNGs sind bis 256 px / ~50 KB groß; die Home-Tabelle zeigt sie mit 32 px. Ohne Thumbnails lädt
die mobile Startseite ~700 KB Logos (Lighthouse-LCP ~3.8 s). Inkrementell (mtime), ohne Pillow → No-Op
(UI fällt per onError auf das Original zurück)."""
import os, sys, glob

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'public', 'logos')
SIZE = 96

try:
    from PIL import Image
except ImportError:
    print('build-logo-thumbs: Pillow fehlt – übersprungen (Fallback auf Original-Logos)')
    sys.exit(0)

VARIANTS = (('t', SIZE, True), ('w', 256, False))  # (Ordner, Kantenlänge, auf Quadrat auffüllen)
for sub, _, _ in VARIANTS:
    os.makedirs(os.path.join(SRC, sub), exist_ok=True)
made = kept = failed = 0
src_bytes = dst_bytes = 0
for f in sorted(glob.glob(os.path.join(SRC, '*'))):
    stem, ext = os.path.splitext(os.path.basename(f))
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.ico'):
        continue
    src_bytes += os.path.getsize(f)
    for sub, size, square in VARIANTS:
        out = os.path.join(SRC, sub, stem + '.webp')
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f):
            kept += 1; dst_bytes += os.path.getsize(out); continue
        try:
            im = Image.open(f)
            im.load()
            im = im.convert('RGBA')
            im.thumbnail((size, size), Image.LANCZOS)
            if square:
                canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
                canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
                im = canvas
            im.save(out, 'WEBP', quality=86 if square else 88, method=4)
            made += 1; dst_bytes += os.path.getsize(out)
        except Exception as e:  # defektes Bild → kein WebP, UI nutzt Original
            failed += 1
            print(f'build-logo-thumbs: {sub}/{os.path.basename(f)}: {e}', file=sys.stderr)
            if os.path.exists(out): os.remove(out)
print(f'build-logo-thumbs: {made} neu, {kept} aktuell, {failed} Fehler · Quelle {src_bytes // 1024} KB → WebP (t+w) {dst_bytes // 1024} KB')
