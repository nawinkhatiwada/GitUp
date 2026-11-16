"""Generate extension icons + store promo tile. Run: python3 scripts/make_icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
S = 1024  # draw large, downscale for crisp anti-aliasing
TOP, BOTTOM = (46, 160, 67), (26, 127, 55)  # GitHub-ish greens
WHITE = (255, 255, 255, 255)


def gradient(w, h):
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)) + (255,)
        for x in range(w):
            px[x, y] = c
    return img


def bezier(p0, p1, p2, n=64):
    return [
        ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
         (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
        for t in (i / n for i in range(n + 1))
    ]


def glyph(draw, ox=0, oy=0, k=1.0):
    """Up-arrow trunk with a merging branch: 'GitUp'."""
    P = lambda x, y: (ox + x * k, oy + y * k)
    w = int(92 * k)
    draw.line([P(470, 330), P(470, 790)], fill=WHITE, width=w)                    # trunk
    draw.polygon([P(470, 160), P(670, 380), P(270, 380)], fill=WHITE)             # arrow head
    half = w / 2                                                                  # branch: stamp
    for x, y in (P(*p) for p in bezier((700, 520), (700, 740), (470, 740), n=400)):  # discs = smooth
        draw.ellipse([x - half, y - half, x + half, y + half], fill=WHITE)
    r = 78 * k
    for cx, cy in ((700, 500), (470, 800)):                                       # nodes
        x, y = P(cx, cy)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=WHITE)


def icon():
    bg = gradient(S, S)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=230, fill=255)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(bg, (0, 0), mask)
    glyph(ImageDraw.Draw(img), ox=25, oy=0)
    return img


def store_icon(out):
    """Chrome Web Store icon: 128x128 canvas, 96x96 artwork, 16px transparent padding, soft shadow."""
    from PIL import ImageFilter
    k = 8  # supersample
    C, A = 128 * k, 96 * k
    art = icon().resize((A, A), Image.LANCZOS)
    shadow = Image.new("RGBA", (C, C), (0, 0, 0, 0))
    sm = Image.new("L", (C, C), 0)
    pad = (C - A) // 2
    sm.paste(art.getchannel("A"), (pad, pad + 2 * k))
    sm = sm.filter(ImageFilter.GaussianBlur(3 * k)).point(lambda v: v * 0.35)
    shadow.putalpha(sm)
    canvas = Image.alpha_composite(Image.new("RGBA", (C, C), (0, 0, 0, 0)), shadow)
    canvas.alpha_composite(art, (pad, pad))
    canvas.resize((128, 128), Image.LANCZOS).save(out)


def font(size, bold=False):
    for path in (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(path, size, index=1 if bold and path.endswith(".ttc") else 0)
        except Exception:
            continue
    return ImageFont.load_default()


def promo(w, h, out):
    k = 2  # supersample
    img = gradient(w * k, h * k)
    d = ImageDraw.Draw(img)
    ic = icon().resize((int(h * 0.55 * k),) * 2, Image.LANCZOS)
    img.paste(ic, (int(w * 0.08 * k), (h * k - ic.height) // 2), ic)
    tx = int(w * 0.08 * k) + ic.width + int(28 * k)
    d.text((tx, int(h * 0.30 * k)), "GitUp", font=font(int(h * 0.20 * k), True), fill=WHITE)
    d.text((tx, int(h * 0.56 * k)), "Pro tools for GitHub", font=font(int(h * 0.075 * k)), fill=(220, 255, 228, 255))
    img.resize((w, h), Image.LANCZOS).convert("RGB").save(out)


if __name__ == "__main__":
    big = icon()
    for size in (16, 32, 48, 128):
        big.resize((size, size), Image.LANCZOS).save(ROOT / "icons" / f"icon{size}.png")
    store_icon(ROOT / "store" / "store-icon-128x128.png")
    promo(440, 280, ROOT / "store" / "promo-small-440x280.png")
    promo(1400, 560, ROOT / "store" / "promo-marquee-1400x560.png")
    print("ok")
