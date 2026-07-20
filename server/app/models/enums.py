"""스펙 §6 의 ENUM 값 정의 — 앱 전역에서 재사용."""

# 연애 상태 (상태칩). 라벨: 커플/돌싱/유부
RELATIONSHIP_STATUSES = ("couple", "single", "married")

# 글 카테고리(게시판). superset 확장 — 기존 값 유지(데이터 이관 불필요).
# photo = 인증·사진 앨범(이미지 글, 초기엔 비활성 — 텍스트 피드 제외). story = 썰·후기 텍스트 게시판.
POST_CATEGORIES = ("love", "dating", "marriage", "counsel", "daily", "story", "free", "photo")

# 소셜 provider. dev 는 개발용 모의 로그인, email 은 이메일+비밀번호 간편가입.
SOCIAL_PROVIDERS = ("kakao", "apple", "email", "dev")

# 투표 선택지
POLL_SIDES = ("A", "B")

# 일정 소유자 (나=a / 상대=b / 함께=both)
SCHEDULE_OWNERS = ("a", "b", "both")

# 신고 대상
REPORT_TARGETS = ("post", "comment", "issue_comment", "user")

# 상태값 -> 한글 라벨 (서버 응답에 함께 실어주면 클라가 매핑 불필요)
STATUS_LABELS = {"couple": "커플", "single": "돌싱", "married": "유부"}

# 카테고리 -> 한글 라벨 (게시판 개편)
CATEGORY_LABELS = {
    "love": "연애",
    "dating": "썸·소개팅",
    "marriage": "결혼·동거",
    "counsel": "인간관계",
    "daily": "일상잡담",
    "story": "썰·후기",
    "free": "자유",
    "photo": "인증·사진",
}

# 광고 슬롯 포지션 (Phase 3)
AD_POSITIONS = ("feed_native", "issue_bottom", "web_wing_l", "web_wing_r", "web_rail")
