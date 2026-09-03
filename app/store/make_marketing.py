"""플레이/앱스토어 마케팅 스크린샷 생성 — 실기기 캡처를 폰 목업에 넣고 헤드라인+서브카피.
입력: screenshots_v11/*.png (1080x1920, 실기기 배율). 출력: marketing/(1080x1920) · ios 인자 시 marketing_ios/(1290x2796).
레이아웃: 타이포는 세로(H) 비례, 폰 목업은 하단 앵커(캔버스 아래로 살짝 블리드) → 하단 여백 없음."""
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(__file__)
SHOTS = os.path.join(HERE, "screenshots_v11")
IOS = len(sys.argv) > 1 and sys.argv[1] == "ios"
OUT = os.path.join(HERE, "marketing_ios" if IOS else "marketing")
os.makedirs(OUT, exist_ok=True)

W, H = (1290, 2796) if IOS else (1080, 1920)
BOLD = "C:/Windows/Fonts/malgunbd.ttf"
REG = "C:/Windows/Fonts/malgun.ttf"
ROSE = (242, 59, 95)
INK = (26, 27, 30)
SUB = (74, 78, 88)

# (스크린샷, 헤드라인 2줄, 서브카피, 배경 그라데, 강조색)
SLIDES = [
    ("01_fortune.png", ["매일 자정,", "나만의 연애운세 도착"],
     "생년월일·연애 상태 맞춤 운세 — 점수·항목별 조언까지 전부 무료",
     ((236, 228, 255), (211, 195, 250)), (110, 84, 220)),
    ("02_tarot.png", ["타로 한 장,", "그 사람과 오늘의 궁합"],
     "마음속 질문 하나면 타로가, 생년월일 입력이면 궁합이 나와요",
     ((255, 228, 235), (255, 203, 219)), ROSE),
    ("03_community.png", ["연애 고민,", "익명으로 털어놓으세요"],
     "실명 걱정 없이 — 같은 고민을 겪어본 사람들의 진짜 조언",
     ((255, 234, 224), (255, 211, 191)), (240, 120, 60)),
    ("04_home.png", ["이거 내가 예민한 걸까?", "투표로 물어보세요"],
     "애매한 연애 상황, A/B 밸런스 투표로 바로 여론 확인",
     ((224, 245, 236), (193, 234, 214)), (32, 158, 112)),
    ("06_tests.png", ["나는 어떤 연애 유형?", "심리테스트 10가지"],
     "애착유형·데이트 스타일·사랑의 언어… 결과 공유는 덤",
     ((255, 240, 214), (255, 223, 167)), (214, 143, 20)),
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
    shot = Image.open(shot_path).convert("RGB")
    sw = shot.width
    sh = int(sw * 19.5 / 9)
    shot = shot.crop((0, 0, sw, min(sh, shot.height)))
    scr_w = target_w - 44
    scr = shot.resize((scr_w, int(scr_w * shot.height / shot.width)), Image.LANCZOS)
    bez = 22
    fw, fh = scr_w + bez * 2, scr.height + bez * 2
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle([0, 0, fw, fh], radius=64, fill=(18, 18, 22, 255))
    frame.paste(rounded(scr, 44), (bez, bez))
    nw, nh = 150, 30
    d.rounded_rectangle([(fw - nw) // 2, bez + 12, (fw + nw) // 2, bez + 12 + nh], radius=15, fill=(18, 18, 22, 255))
    return frame


def make(slide, idx, f, fs, sf, sfs):
    shot, lines, sub, (top, bot), accent = slide
    VS = H / 1920
    canvas = vgrad(W, H, top, bot).convert("RGBA")
    d = ImageDraw.Draw(canvas)

    # 헤드라인 — 전 슬라이드 공통 크기(레이아웃 통일)
    line_h = int(fs * 1.26)
    y = int(110 * VS)
    for i, line in enumerate(lines):
        w = d.textlength(line, font=f)
        color = accent if i == len(lines) - 1 else INK
        d.text(((W - w) / 2, y), line, font=f, fill=color)
        y += line_h
    y += int(24 * VS)
    sw_ = d.textlength(sub, font=sf)
    d.text(((W - sw_) / 2, y), sub, font=sf, fill=SUB)
    y += int(sfs * 1.3)

    # 폰 목업 — 고정 상단(y_end+간격), 하단 블리드까지 채움 (전 슬라이드 동일 위치·크기)
    phone_top = y + int(64 * VS)
    bleed = int(56 * VS)
    frame_h_target = H + bleed - phone_top
    scr_w_by_h = int((frame_h_target - 44) * 1080 / 1920)
    target_w = min(int(0.92 * W), scr_w_by_h + 44)
    frame = phone_frame(os.path.join(SHOTS, shot), target_w=target_w)
    fx = (W - frame.width) // 2
    fy = phone_top
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
    # 공통 폰트: 가장 긴 헤드라인/서브카피 기준으로 한 번만 산정 → 전 슬라이드 동일 크기
    probe = ImageDraw.Draw(Image.new("RGB", (W, H)))

    def fit(path, size, texts, max_w):
        while size > 20:
            ft = ImageFont.truetype(path, size)
            if all(probe.textlength(t, font=ft) <= max_w for t in texts):
                return ft, size
            size -= 2
        return ImageFont.truetype(path, size), size

    all_lines = [l for sl in SLIDES for l in sl[1]]
    all_subs = [sl[2] for sl in SLIDES]
    F, FS = fit(BOLD, int(96 * W / 1080), all_lines, W - int(90 * W / 1080))
    SF, SFS = fit(REG, int(42 * W / 1080), all_subs, W - int(80 * W / 1080))
    for i, sl in enumerate(SLIDES, 1):
        make(sl, i, F, FS, SF, SFS)
