"""Frame raw captures into Chrome Web Store screenshots (1280x800, 24-bit PNG, no alpha).

Put up to 5 raw captures in store/raw/ (any size, e.g. Cmd+Shift+4 on a GitHub tab).
Files are processed in name order; captions come from CAPTIONS by file stem, else the stem itself.
Run: python3 scripts/make_screenshots.py  ->  store/screenshot-1.png ... screenshot-5.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from make_icons import gradient, font, WHITE

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "store" / "raw"
W, H = 1280, 800
CAPTIONS = {
    "1-pr": "Copy PR base & head branches in one click",
    "2-pr-list": "See base ← head on every row of PR lists",
    "3-actions": "Branch & tag chips with copy in GitHub Actions",
    "4-tags": "Tag runs show the branch they were cut from",
    "5-dark": "Follows GitHub's light & dark themes",
}


def frame(src, caption, out):
    bg = gradient(W, H)
    d = ImageDraw.Draw(bg)
    f = font(40, bold=True)
    tw = d.textlength(caption, font=f)
    d.text(((W - tw) / 2, 36), caption, font=f, fill=WHITE)

    top, side, bottom = 112, 56, 0           # screenshot bleeds off the bottom edge
    shot = Image.open(src).convert("RGB")
    bw, bh = W - 2 * side, H - top - bottom
    scale = bw / shot.width                    # fit width; crop height from top if too tall
    shot = shot.resize((bw, round(shot.height * scale)), Image.LANCZOS)
    if shot.height > bh:
        shot = shot.crop((0, 0, bw, bh))
    else:                                      # short capture: center vertically in the area
        top += (bh - shot.height) // 2

    r = 14
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width - 1, shot.height + r], radius=r, fill=255)
    sh = Image.new("L", (W, H), 0)
    sh.paste(mask, (side, top + 6))
    sh = sh.filter(ImageFilter.GaussianBlur(14)).point(lambda v: v * 0.4)
    bg = Image.composite(Image.new("RGBA", (W, H), (0, 0, 0, 255)), bg, sh)
    bg.paste(shot, (side, top), mask)
    bg.convert("RGB").save(out, optimize=True)


if __name__ == "__main__":
    srcs = sorted(p for p in RAW.glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg"))[:5]
    if not srcs:
        raise SystemExit(f"No captures in {RAW} — add 1–5 PNG/JPEG screenshots first.")
    for i, p in enumerate(srcs, 1):
        out = ROOT / "store" / f"screenshot-{i}.png"
        frame(p, CAPTIONS.get(p.stem, p.stem.replace("-", " ")), out)
        print(out.relative_to(ROOT))
