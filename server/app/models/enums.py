"""스펙 §6 의 ENUM 값 정의 — 앱 전역에서 재사용."""

# 연애 상태 (상태칩). 라벨: 커플/돌싱/유부
RELATIONSHIP_STATUSES = ("couple", "single", "married")

# 글 카테고리. 라벨: 연애/결혼·부부/고민상담/자유
POST_CATEGORIES = ("love", "marriage", "counsel", "free")

# 소셜 provider. dev 는 개발용 모의 로그인.
SOCIAL_PROVIDERS = ("kakao", "apple", "dev")

# 투표 선택지
POLL_SIDES = ("A", "B")

# 일정 소유자 (나=a / 상대=b / 함께=both)
SCHEDULE_OWNERS = ("a", "b", "both")

# 신고 대상
REPORT_TARGETS = ("post", "comment", "user")

# 상태값 -> 한글 라벨 (서버 응답에 함께 실어주면 클라가 매핑 불필요)
STATUS_LABELS = {"couple": "커플", "single": "돌싱", "married": "유부"}

# 카테고리 -> 한글 라벨
CATEGORY_LABELS = {"love": "연애", "marriage": "결혼·부부", "counsel": "고민상담", "free": "자유"}
