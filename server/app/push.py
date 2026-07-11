"""Expo Push 발송 (스펙 §7). 서버 → exp.host.

트리거: 오늘의질문 도착(notify-daily CLI), 커플 답변 완료(api/daily), 베스트 등재(notify-best CLI).
"""
import requests

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
_CHUNK = 100


def send_push(tokens, title: str, body: str, data: dict | None = None) -> int:
    """유효 토큰들에게 푸시 발송. 발송 시도한 토큰 수 반환(100개 청크)."""
    tokens = [t for t in tokens if t]
    if not tokens:
        return 0

    sent = 0
    for i in range(0, len(tokens), _CHUNK):
        chunk = tokens[i : i + _CHUNK]
        messages = [
            {"to": t, "title": title, "body": body, "sound": "default", "data": data or {}}
            for t in chunk
        ]
        try:
            requests.post(EXPO_PUSH_URL, json=messages, headers={"Content-Type": "application/json"}, timeout=10)
            sent += len(chunk)
        except requests.RequestException:
            pass  # 발송 실패는 무시(베스트 effort)
    return sent
