"""AI 선택지 제안 (스펙 §6 글쓰기: 비워두면 AI가 제안).

Claude API(anthropic SDK)로 제목/본문에서 편 갈리는 2지선다 A/B 멘트를 만든다.
키 미설정이면 AIUnavailable.
"""
import json
import re

from flask import current_app

_PROMPT = """다음 글을 보고, 편이 갈리는 2지선다 투표 선택지 A/B를 만들어줘.

규칙:
- 둘 중 하나를 분명히 고르게 (대립). "둘 다", "중립" 같은 건 금지.
- 각 40자 이내, 한국어 구어체.
- 반드시 {{"a": "...", "b": "..."}} JSON 한 줄로만 답해.

제목: {title}
본문: {body}"""


class AIUnavailable(Exception):
    pass


def _parse(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise AIUnavailable("AI 응답을 해석할 수 없습니다.")
    data = json.loads(match.group(0))
    if not data.get("a") or not data.get("b"):
        raise AIUnavailable("AI 응답에 선택지가 없습니다.")
    return {"a": str(data["a"])[:40], "b": str(data["b"])[:40]}


def suggest_poll(title: str, body: str = "") -> dict:
    key = current_app.config.get("ANTHROPIC_API_KEY")
    if not key:
        raise AIUnavailable("AI 기능이 아직 설정되지 않았습니다.")

    try:
        # 선택 의존성 — anthropic 미설치 서버에서도 앱은 뜨고, 이 기능만 비활성
        from anthropic import Anthropic
    except ImportError:
        raise AIUnavailable("AI 기능이 아직 설정되지 않았습니다.")

    client = Anthropic(api_key=key)
    resp = client.messages.create(
        model=current_app.config["AI_MODEL"],
        max_tokens=200,
        messages=[{"role": "user", "content": _PROMPT.format(title=title, body=body or "(없음)")}],
    )
    return _parse(resp.content[0].text)
