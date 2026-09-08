"""Crop Arena runner screenshots down to the game card.

The capture runs at 1920x1080, but the arena only occupies a card in the
top-left. This finds the white card on the grey page per-image (so it stays
correct if a platform renders slightly differently), crops with a small
margin, and preserves the original full frame under _full-frame/.

Re-runnable: already-cropped files are skipped, so it can be run again after
a later batch (e.g. the macOS runners) is copied in.

    python _crop-shots.py
"""
import glob
import os
import shutil

from PIL import Image

PAD = 12
WHITE = 246          # card is pure white; page is (245,245,245)
FULL_DIR = "_full-frame"
FULL_W = 1920        # untouched captures are this wide; crops are much smaller


def card_bbox(im, step=4):
    """Bounding box of the near-white card, sampled on a grid for speed."""
    px = im.load()
    minx, miny = im.width, im.height
    maxx = maxy = 0
    for y in range(0, im.height, step):
        for x in range(0, im.width, step):
            r, g, b = px[x, y]
            if r > WHITE and g > WHITE and b > WHITE:
                minx, miny = min(minx, x), min(miny, y)
                maxx, maxy = max(maxx, x), max(maxy, y)
    if maxx <= minx or maxy <= miny:
        return None
    return minx, miny, maxx, maxy


def main():
    os.makedirs(FULL_DIR, exist_ok=True)
    shots = sorted(f for f in glob.glob("*__t*s.png") if os.path.isfile(f))
    if not shots:
        print("no runner screenshots found")
        return

    done = skipped = failed = 0
    for f in shots:
        im = Image.open(f).convert("RGB")
        if im.width < FULL_W:
            skipped += 1
            continue

        box = card_bbox(im)
        if not box:
            print(f"  ! {f}: no card detected, left untouched")
            failed += 1
            continue

        x1, y1, x2, y2 = box
        crop = (max(0, x1 - PAD), max(0, y1 - PAD),
                min(im.width, x2 + PAD), min(im.height, y2 + PAD))

        shutil.move(f, os.path.join(FULL_DIR, f))   # preserve the full frame
        out = im.crop(crop)
        out.save(f)
        print(f"  {f}: {im.size} -> {out.size}")
        done += 1

    print(f"\ncropped {done}, skipped {skipped} (already cropped), failed {failed}")
    print(f"full frames preserved in {FULL_DIR}/")


if __name__ == "__main__":
    main()
