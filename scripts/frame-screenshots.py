"""Frame raw 1320x2868 simulator screenshots with a caption for the App Store.

Usage: python3 scripts/frame-screenshots.py store-screenshots/1.2/raw store-screenshots/1.2
Needs Pillow. Captions are indexed by Apple search, so each leads with words people type.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1320, 2868
INK = (14, 26, 43)
BRASS = (201, 164, 92)
WHITE = (255, 255, 255)
FONT = str(Path(__file__).resolve().parent.parent / "node_modules/@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf")

# (raw file, brass line, white line). Each caption leads with words people search for.
CAPTIONS = [
    ("1-dashboard.png", "Track income & expenses", "for every property"),
    ("2-new-ledger.png", "Rentals, your home,", "flips and investments"),
    ("3-ledgers.png", "Properties and household", "side by side"),
    ("4-property.png", "Every rent payment", "and bill in one place"),
    ("5-add.png", "Log an expense", "in seconds"),
    ("6-reports.png", "Profit and loss", "for each property"),
    ("7-household.png", "Household income", "and expenses too"),
]


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *img.size), radius, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0), mask)
    return out


def compose(raw: Path, line1: str, line2: str, out: Path):
    canvas = Image.new("RGB", (W, H), INK)
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(FONT, 96)
    for i, (text, color) in enumerate(((line1, BRASS), (line2, WHITE))):
        w = draw.textlength(text, font=font)
        draw.text(((W - w) / 2, 150 + i * 130), text, font=font, fill=color)

    shot = Image.open(raw).convert("RGB")
    sw = 1060
    shot = shot.resize((sw, round(sw * shot.height / shot.width)), Image.LANCZOS)
    x, y = (W - sw) // 2, 520
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (x, y + 20, x + sw, y + shot.height + 20), 72, fill=(0, 0, 0, 150)
    )
    canvas.paste(shadow.filter(ImageFilter.GaussianBlur(40)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(40)))
    framed = rounded(shot, 72)
    canvas.paste(framed, (x, y), framed)
    canvas.save(out, "PNG")


if __name__ == "__main__":
    raw_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, l1, l2 in CAPTIONS:
        if (raw_dir / name).exists():
            compose(raw_dir / name, l1, l2, out_dir / name)
            print("wrote", out_dir / name)
