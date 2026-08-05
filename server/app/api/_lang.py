"""언어권(lang) 해석 헬퍼 (글로벌 확장 Phase 1-3).

피드/콘텐츠 리스트를 유저 언어권으로 격리한다.
- 인증 유저: 서버에 저장된 user.lang (클라 임의 지정 불가)
- 게스트: Accept-Language 헤더(en* → en, 그 외 ko)
기본값 'ko' (기존 한국 유저·구버전 클라 무변경).
"""
from flask import request

SUPPORTED_LANGS = ("ko", "en")


def resolve_lang(user=None) -> str:
    """요청 언어권 반환('ko'|'en')."""
    if user is not None:
        lang = getattr(user, "lang", None)
        if lang in SUPPORTED_LANGS:
            return lang
    header = (request.headers.get("Accept-Language") or "").strip().lower()
    return "en" if header.startswith("en") else "ko"
