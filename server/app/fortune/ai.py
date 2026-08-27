"""연애운세 AI 생성 (B안) — Claude 로 날짜별 세그먼트 본문을 매일 새로 작성한다.

호출 단위: (날짜, 연애상태, 언어) 1회 → 띠/별자리 12개 세그먼트를 JSON 으로 한 번에 받는다.
  → 하루 4상태 × 2언어 = 8회 호출. 실패 시 호출자(generate.py)가 폴백 풀로 대체 + 텔레그램 알림.

항목(cats) 라벨은 상태별 고정(폴백 풀과 동일)이며 모델이 코멘트만 채운다.
점수·행운 아이템·타로는 personalize 해시가 붙이므로 본문에 숫자/점수를 넣지 않게 한다.
"""
import json
from datetime import date

from flask import current_app

from ..models.enums import FORTUNE_LOVE_STATUSES


class FortuneAIError(Exception):
    pass


# 직전 generate_for_date 실행의 누적 토큰 사용량 (CLI 비용 표시용)
USAGE = {"input": 0, "output": 0, "calls": 0}
# 모델별 $/1M 토큰 (input, output) — 비용 추정 표시용
_PRICE = {"claude-sonnet-5": (2.0, 10.0), "claude-haiku-4-5": (1.0, 5.0), "claude-opus-5": (5.0, 25.0)}


def reset_usage() -> None:
    USAGE.update(input=0, output=0, calls=0)


def estimated_cost_usd(model: str) -> float:
    pi, po = _PRICE.get(model, (2.0, 10.0))
    return USAGE["input"] / 1e6 * pi + USAGE["output"] / 1e6 * po


_STATUS_KO = {"solo": "솔로", "some": "썸 타는 중", "couple": "연애 중", "rebound": "재회를 바라는 중"}
_STATUS_EN = {"solo": "single", "some": "in a situationship / early talking stage", "couple": "in a relationship",
              "rebound": "hoping to get back with an ex"}
_WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"]


def cat_labels(status: str, lang: str) -> list[str]:
    """상태별 고정 항목 라벨 (폴백 풀의 라벨을 그대로 사용해 UI 와 일치)."""
    from .generate import _pools

    return [c["name"] for c in _pools(lang)[status][0]["cats"]]


def _schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "sign_index": {"type": "integer"},
                        "summary": {"type": "string"},
                        "full_text": {"type": "string"},
                        "cats": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {"comment": {"type": "string"}},
                                "required": ["comment"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "required": ["sign_index", "summary", "full_text", "cats"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["items"],
        "additionalProperties": False,
    }


def _prompt(fortune_date: date, status: str, lang: str, signs: list[str], labels: list[str]) -> str:
    sign_list = ", ".join(f"{i}={s}" for i, s in enumerate(signs))
    if lang == "en":
        return f"""You write the daily love horoscope for "TodayLoves", a dating community app.
Date: {fortune_date.isoformat()} ({fortune_date.strftime('%A')}). Audience: adults who are {_STATUS_EN[status]}.

Write ONE horoscope for EACH of the 12 sun signs (sign_index: {sign_list}).
Tone: Co-Star style — short, witty, warm, a little poetic, never cheesy. Second person ("you").
For each sign:
- summary: one punchy line, max 60 characters, no trailing period.
- full_text: 60-90 words, 3-4 sentences. Mention the day/season naturally. Give one concrete tiny action for today.
- cats: exactly 3 comments, in this order: {labels}. Each comment is a short phrase, max 6 words, max 45 characters.
Rules: all 12 must feel clearly different. No numbers, scores, percentages, or dates in the text.
No doom, no medical/financial advice, no naming specific people. Keep it playful and hopeful.
Return JSON only."""

    wd = _WEEKDAY_KO[fortune_date.weekday()]
    return f"""당신은 연애 커뮤니티 앱 "오늘연애"의 오늘의 연애운세 작가입니다.
날짜: {fortune_date.year}년 {fortune_date.month}월 {fortune_date.day}일 ({wd}요일). 대상: {_STATUS_KO[status]}인 성인 유저.

띠 12개(sign_index: {sign_list}) 각각에 대해 오늘의 연애운을 하나씩 쓰세요.
문체: 실제 운세 앱처럼 따뜻하고 구체적인 존댓말("~해요", "~보세요"). 사주/십이지 감성은 살리되 어렵지 않게.
각 띠마다:
- summary: 한 줄 요약, 15~25자, 마침표 없이.
- full_text: 180~230자, 3~4문장. 오전/오후/저녁 흐름이나 오늘 요일·계절을 자연스럽게 녹이고, 오늘 실천할 작은 행동 하나를 넣으세요.
- cats: 정확히 3개, 순서대로 {labels} 에 대한 코멘트. 각 12자 내외.
규칙: 12개가 서로 확실히 다른 내용이어야 합니다. 본문에 숫자·점수·퍼센트·날짜를 쓰지 마세요.
불안을 조장하거나 단정적으로 예언하지 말고, 특정 인물을 지목하지 마세요. 희망적이고 재미있게.
JSON 만 반환하세요."""


def generate_segments_ai(fortune_date: date, status: str, lang: str = "ko") -> dict[int, dict]:
    """Claude 호출 → {sign_index: {summary, full_text, cats:[{name,comment}×3]}} (12개). 실패 시 FortuneAIError."""
    if status not in FORTUNE_LOVE_STATUSES:
        raise FortuneAIError(f"unknown status {status}")
    key = current_app.config.get("ANTHROPIC_API_KEY")
    if not key:
        raise FortuneAIError("ANTHROPIC_API_KEY 미설정")
    try:
        from anthropic import Anthropic
    except ImportError:
        raise FortuneAIError("anthropic 미설치")

    from .packs import pack

    signs = list(pack(lang)["signs"])
    labels = cat_labels(status, lang)

    # 429/5xx 는 SDK 가 retry-after 를 존중해 지수 백오프 재시도 (신규 키는 분당 토큰 제한이 낮음)
    client = Anthropic(api_key=key, max_retries=5)
    try:
        resp = client.messages.create(
            model=current_app.config.get("FORTUNE_MODEL", "claude-sonnet-5"),
            max_tokens=12000,
            # 창작 문구엔 확장 사고가 불필요 — 생략하면 adaptive thinking 이 켜져 출력 토큰(과금)을 크게 늘리고
            # max_tokens 를 잠식해 응답이 잘린다. 명시적으로 끈다.
            thinking={"type": "disabled"},
            messages=[{"role": "user", "content": _prompt(fortune_date, status, lang, signs, labels)}],
            output_config={"format": {"type": "json_schema", "schema": _schema()}},
        )
    except Exception as e:  # SDK 오류 전부 → 폴백 대상
        raise FortuneAIError(f"api error: {type(e).__name__}: {e}") from e

    u = getattr(resp, "usage", None)
    if u is not None:
        USAGE["input"] += getattr(u, "input_tokens", 0) or 0
        USAGE["output"] += getattr(u, "output_tokens", 0) or 0
        USAGE["calls"] += 1
    if getattr(resp, "stop_reason", None) == "max_tokens":
        raise FortuneAIError("truncated (max_tokens)")
    if getattr(resp, "stop_reason", None) == "refusal":
        raise FortuneAIError("refusal")
    text = next((b.text for b in resp.content if getattr(b, "type", "") == "text"), None)
    if not text:
        raise FortuneAIError("empty response")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise FortuneAIError(f"bad json: {e}") from e

    out: dict[int, dict] = {}
    for it in data.get("items", []):
        idx = it.get("sign_index")
        if not isinstance(idx, int) or not (0 <= idx < 12) or idx in out:
            continue
        summary = (it.get("summary") or "").strip()
        full_text = (it.get("full_text") or "").strip()
        comments = [(c.get("comment") or "").strip() for c in it.get("cats", [])][:3]
        if not summary or not full_text or len(comments) < 3 or not all(comments):
            continue
        out[idx] = {
            "summary": summary[:60],
            "full_text": full_text[:600],
            "cats": [{"name": labels[i], "comment": comments[i][:60]} for i in range(3)],
        }
    if len(out) < 12:
        raise FortuneAIError(f"incomplete: {len(out)}/12 signs")
    return out
