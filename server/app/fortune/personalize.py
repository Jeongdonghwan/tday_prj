"""개인화 레이어 (FORTUNE_UPDATE.md §4-3/4-4) — 결정론적 해시, DB 저장 없음.

같은 유저는 하루 종일 동일 결과(재현 가능), 날짜 바뀌면 자동 변경.
"""
import hashlib
from datetime import date

from .packs import pack


def _seed(*parts) -> int:
    return int(hashlib.sha256(":".join(str(p) for p in parts).encode()).hexdigest(), 16)


def personalize(user_id: int, d: date, lang: str = "ko") -> dict:
    """유저·날짜로 점수/행운/타로 인덱스 결정론 배정 (§4-3 공식). lang 으로 행운 팩 선택."""
    p = pack(lang)
    seed = _seed(user_id, d.isoformat())
    score = 55 + seed % 45
    cat_scores = [55 + (seed >> (8 * i)) % 45 for i in range(2)]  # 주의보 제외 2개
    return {
        "score": score,
        "cat_scores": cat_scores,
        "lucky": {
            "color": p["colors"][seed % len(p["colors"])],
            "item": p["items"][(seed >> 4) % len(p["items"])],
            "time": p["times"][(seed >> 8) % len(p["times"])],
            "place": p["places"][(seed >> 12) % len(p["places"])],
        },
        "tarot_index": (seed >> 16) % 22,
    }


def tarot_card(index: int, lang: str = "ko") -> dict:
    name_kr, name_en, meaning = pack(lang)["tarot"][index % 22]
    return {"index": index % 22, "name_kr": name_kr, "name_en": name_en, "meaning": meaning}


def compatibility(user_birth_iso: str, partner_birth_iso: str, d: date, lang: str = "ko") -> dict:
    """궁합 점수+코멘트 (§4-4). 두 생일 정렬 + 날짜 해시로 결정론. lang 으로 코멘트 팩 선택."""
    comp = pack(lang)["comp"]
    pair = ":".join(sorted([user_birth_iso, partner_birth_iso]))
    cseed = _seed(pair, d.isoformat())
    score = 50 + cseed % 50  # 50~99
    band = min(score // 10 - 5, 4)  # 0~4
    comment = comp[band][cseed % 5]
    return {"score": score, "comment": comment}
