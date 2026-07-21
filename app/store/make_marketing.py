"""플레이/앱스토어 마케팅 스크린샷 생성 — 실제 앱 화면을 폰 프레임에 넣고 헤드라인 얹기.
입력: screenshots/*.png (1080폭 세로 캡처). 출력: marketing/*.png (1080x1920).
"""
import os

from PIL import Image, ImageDraw, ImageFont, ImageFilter

import sys

HERE = os.path.dirname(__file__)
SHOTS = os.path.join(HERE, "screenshots")

# 인자로 ios 주면 아이폰 6.7형(1290x2796), 기본은 플레이(1080x1920)
IOS = len(sys.argv) > 1 and sys.argv[1] == "ios"
OUT = os.path.join(HERE, "marketing_ios" if IOS else "marketing")
os.makedirs(OUT, exist_ok=True)

W, H = (1290, 2796) if IOS else (1080, 1920)
BOLD = "C:/Windows/Fonts/malgunbd.ttf"
REG = "C:/Windows/Fonts/malgun.ttf"

ROSE = (242, 59, 95)
INK = (26, 27, 30)
WHITE = (255, 255, 255)

# 슬라이드: (스크린샷 파일, 헤드라인 2줄, 배경 그라데 색상 2개, 강조 텍스트색)
SLIDES = [
    ("02_community.png", ["연애 고민,", "혼자 끙끙대지 마세요"], ((255, 228, 235), (255, 209, 220)), ROSE),
    ("01_home.png", ["애매한 상황,", "투표로 물어봐"], ((255, 234, 224), (255, 214, 196)), (240, 120, 60)),
    ("05_tests.png", ["나는 어떤", "연애 유형일까?"], ((233, 224, 255), (214, 200, 250)), (120, 90, 220)),
    ("03_issues.png", ["매일 하나씩,", "오늘의 연애 이슈"], ((224, 245, 236), (198, 235, 218)), (40, 165, 120)),
    ("04_best.png", ["지금 제일 뜨거운", "연애 이야기"], ((255, 240, 214), (255, 226, 176)), (220, 150, 30)),
]


def vgrad(w, h, top, bot):
    base = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(base)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return base


def rounded(img, rad):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0], img.size[1]], radius=rad, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def phone_frame(shot_path, target_w):
    """스크린샷을 폰 목업(둥근 베젤+노치)에 넣어 RGBA 반환."""
    shot = Image.open(shot_path).convert("RGB")
    # 폰 화면 비율 9:19.5 로 상단 크롭
    sw = shot.width
    sh = int(sw * 19.5 / 9)
    shot = shot.crop((0, 0, sw, min(sh, shot.height)))
    scr_w = target_w - 44  # 베젤 두께
    scr = shot.resize((scr_w, int(scr_w * shot.height / shot.width)), Image.LANCZOS)
    scr_h = scr.height

    bez = 22
    fw, fh = scr_w + bez * 2, scr_h + bez * 2
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    # 검정 베젤(라운드)
    d.rounded_rectangle([0, 0, fw, fh], radius=64, fill=(18, 18, 22, 255))
    # 화면
    frame.paste(rounded(scr, 44), (bez, bez))
    # 노치(상단 pill)
    nw, nh = 150, 30
    d.rounded_rectangle([(fw - nw) // 2, bez + 12, (fw + nw) // 2, bez + 12 + nh], radius=15, fill=(18, 18, 22, 255))
    return frame


def make(slide, idx):
    shot, lines, (top, bot), accent = slide
    canvas = vgrad(W, H, top, bot).convert("RGBA")
    d = ImageDraw.Draw(canvas)

    # 헤드라인 (캔버스 크기에 비례)
    fs = int(78 * W / 1080)
    f = ImageFont.truetype(BOLD, fs)
    line_h = int(96 * W / 1080)
    y = int(150 * H / 1920)
    for i, line in enumerate(lines):
        w = d.textlength(line, font=f)
        color = accent if i == len(lines) - 1 else INK
        d.text(((W - w) / 2, y), line, font=f, fill=color)
        y += line_h
    d.rounded_rectangle([(W - 90) // 2, y + 18, (W + 90) // 2, y + 26], radius=4, fill=accent)

    # 폰 목업 — 하단 중앙, 헤드라인 아래
    frame = phone_frame(os.path.join(SHOTS, shot), target_w=int(760 * W / 1080))
    fx = (W - frame.width) // 2
    fy = y + int(80 * H / 1920)
    # 그림자
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([fx + 14, fy + 26, fx + frame.width + 14, fy + frame.height + 26], radius=64, fill=(0, 0, 0, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.alpha_composite(frame, (fx, fy))

    out = os.path.join(OUT, f"{idx:02d}.png")
    canvas.convert("RGB").save(out, optimize=True)
    print("saved", out)


if __name__ == "__main__":
    for i, s in enumerate(SLIDES, 1):
        make(s, i)
