"""언어권별 운세 상수 팩 선택 (글로벌 확장 Phase 1-5).

ko=사주/십이지 톤, en=서구권 점성술 톤. personalize/today 가 lang 으로 팩을 고른다.
"""
from datetime import date

from . import constants as ko
from . import constants_en as en

# lang → {colors, items, times, places, tarot, comp, signs}
_PACKS = {
    "ko": {
        "colors": ko.LUCKY_COLORS, "items": ko.LUCKY_ITEMS, "times": ko.LUCKY_TIMES,
        "places": ko.LUCKY_PLACES, "tarot": ko.TAROT, "comp": ko.COMP_COMMENTS,
        "signs": ko.ZODIAC_KR,
    },
    "en": {
        "colors": en.LUCKY_COLORS_EN, "items": en.LUCKY_ITEMS_EN, "times": en.LUCKY_TIMES_EN,
        "places": en.LUCKY_PLACES_EN, "tarot": en.TAROT_EN, "comp": en.COMP_COMMENTS_EN,
        "signs": en.SUN_SIGN_EN,
    },
}


def pack(lang: str) -> dict:
    """lang 팩(미지원 시 ko)."""
    return _PACKS.get(lang, _PACKS["ko"])


def sign_name(index: int, lang: str) -> str:
    """띠/별자리 표시명 (ko=쥐..돼지 / en=Aries..Pisces)."""
    return pack(lang)["signs"][index % 12]


def sun_sign_of(birth: date) -> int:
    """생일(월/일)로 서양 별자리 인덱스 0~11 (0=Aries). ko 의 zodiac_of 와 대응되는 en 판정.
    12월/1월 경계 랩어라운드를 정확히 처리하기 위해 구간을 직접 판정한다."""
    m, d = birth.month, birth.day
    if (m == 3 and d >= 21) or (m == 4 and d <= 19):
        return 0  # Aries
    if (m == 4 and d >= 20) or (m == 5 and d <= 20):
        return 1  # Taurus
    if (m == 5 and d >= 21) or (m == 6 and d <= 20):
        return 2  # Gemini
    if (m == 6 and d >= 21) or (m == 7 and d <= 22):
        return 3  # Cancer
    if (m == 7 and d >= 23) or (m == 8 and d <= 22):
        return 4  # Leo
    if (m == 8 and d >= 23) or (m == 9 and d <= 22):
        return 5  # Virgo
    if (m == 9 and d >= 23) or (m == 10 and d <= 22):
        return 6  # Libra
    if (m == 10 and d >= 23) or (m == 11 and d <= 21):
        return 7  # Scorpio
    if (m == 11 and d >= 22) or (m == 12 and d <= 21):
        return 8  # Sagittarius
    if (m == 12 and d >= 22) or (m == 1 and d <= 19):
        return 9  # Capricorn
    if (m == 1 and d >= 20) or (m == 2 and d <= 18):
        return 10  # Aquarius
    return 11  # Pisces (2/19 ~ 3/20)
