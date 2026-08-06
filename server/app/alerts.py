"""운영 알림 — 텔레그램 봇 (글로벌 확장 Phase 2).

배치 실패 등 운영 이벤트를 텔레그램으로 통지한다. push.py 와 동일한 best-effort:
토큰/챗ID 미설정이면 no-op, 전송 실패는 조용히 무시(알림 실패가 배치를 죽이지 않게).
"""
import requests
from flask import current_app

_API = "https://api.telegram.org/bot{token}/sendMessage"


def send_alert(text: str) -> bool:
    """운영 텔레그램 채널로 메시지 전송. 성공 여부(미설정/실패=False) 반환."""
    token = current_app.config.get("TELEGRAM_BOT_TOKEN")
    chat_id = current_app.config.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return False  # 미설정 → no-op
    try:
        requests.post(
            _API.format(token=token),
            json={"chat_id": chat_id, "text": text[:4000], "disable_web_page_preview": True},
            timeout=10,
        )
        return True
    except requests.RequestException:
        return False  # 알림 실패는 무시(best-effort)
