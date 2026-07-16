"""회원 탈퇴 — 개인정보 익명화 + 소프트 삭제 (애플/구글 심사 요건).

작성물(글·댓글)은 커뮤니티 맥락 보존을 위해 남기되, 유저의 개인식별정보
(소셜 ID·닉네임·푸시토큰·아바타)를 지우고 재로그인을 차단한다. 커플 연결도 해제.
"""
from ..extensions import db
from ..models import Couple, User


def delete_account(user: User) -> None:
    """유저를 익명화하고 is_deleted=True 로 표시. 커플이 있으면 연결 해제."""
    # 커플 해제 — 상대방의 couple_id 도 끊어 연애중 상태가 유령으로 남지 않게.
    if user.couple_id:
        couple = db.session.get(Couple, user.couple_id)
        if couple:
            for uid in (couple.user_a, couple.user_b):
                if uid:
                    partner = db.session.get(User, uid)
                    if partner:
                        partner.couple_id = None
            db.session.delete(couple)

    # 개인정보 익명화 — social_id 를 유니크하게 바꿔 재로그인 시 신규 계정으로 분리.
    user.social_id = f"deleted:{user.id}"
    user.nickname = f"탈퇴회원{user.id}"
    user.email = None
    user.password_hash = None
    user.push_token = None
    user.avatar_no = None
    user.relationship_status = "single"
    user.is_deleted = True

    db.session.commit()
