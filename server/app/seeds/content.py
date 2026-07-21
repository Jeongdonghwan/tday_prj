"""초기 커뮤니티 콘텐츠 시드 — 실서비스처럼 피드를 채운다 (스크린샷·초기 유입 체감용).

seed_content(reset=True) 는 기존 글/댓글/투표를 모두 지우고 아래 데이터로 재구성.
닉네임은 앱의 랜덤닉(수식어+아바타) 톤에 맞춘 시드 유저. author_status 는 작성 시점 스냅샷.
"""
from datetime import datetime, timedelta

from ..extensions import db

# (닉네임, 연애상태) — 아바타는 생성 시 자동 배정
USERS = [
    ("속상한펭귄", "couple"), ("현명한며느리", "married"), ("새출발오리", "single"),
    ("무뚝뚝한곰돌이", "married"), ("중립기어햄찌", "couple"), ("설레는여우", "single"),
    ("불안한하트토끼", "couple"), ("직진하는판다", "single"), ("철벽인개구리", "single"),
    ("금사빠멍뭉이", "couple"), ("눈치보는병아리", "couple"), ("낭만적인고양이", "married"),
    ("질투많은꿀꿀이", "couple"), ("사랑꾼펭귄", "married"), ("소심한햄찌", "single"),
    ("당당한여우", "single"), ("츤데레곰돌이", "couple"), ("순정파오리", "married"),
    ("밀당고수토끼", "single"), ("다정한판다", "couple"), ("현실연애", "married"),
]

# 각 글: dict(author, cat, title, body, h(=시간전), views, likes, poll, comments)
#  poll = (A라벨, A표, B라벨, B표) 또는 None
#  comments = [(닉, 상태, 본문, 좋아요, 분전), ...]
POSTS = [
    dict(author="속상한펭귄", cat="love", h=2, views=1834, likes=643,
         title="기념일 까먹은 남친, 이거 헤어질 일임?",
         body="사귄 지 1년 됐는데 100일도 그냥 넘어갔고 이번엔 제 생일까지 까먹었어요. 미안하다는 말도 제가 서운하다고 한참 말하고 나서야 했고요. 저만 이 관계에 진심인 것 같아서 지칩니다.",
         poll=("여친이 서운한 게 당연", 1620, "너무 예민한 듯", 388),
         comments=[("무뚝뚝한곰돌이", "married", "1년 동안 기념일 다 까먹는 건 무딘 게 아니라 우선순위에서 밀린 거예요.", 214, 62),
                   ("중립기어햄찌", "couple", "근데 헤어질 일까진 아닌 듯. 저런 사람도 대화로 바뀌긴 하더라고요.", 56, 48),
                   ("당당한여우", "single", "저라면 한 번 더 진지하게 말해보고 그래도 안 바뀌면 끝냅니다.", 133, 30)]),
    dict(author="현명한며느리", cat="marriage", h=5, views=4120, likes=1100,
         title="명절에 시댁만 3일, 친정은 안 가도 되는 건가요",
         body="결혼 2년 차예요. 매번 명절마다 시댁에서 3일을 꽉 채우고 친정은 잠깐 들르는 게 당연한 분위기라 이번엔 좀 서운하다고 했더니 유별나다는 반응이네요.",
         poll=("이건 아니지", 3340, "어쩔 수 없어", 780),
         comments=[("순정파오리", "married", "요즘 세상에 아직도 이런 집이 있네요. 반반이 맞죠.", 402, 120),
                   ("낭만적인고양이", "married", "남편이 먼저 나서서 조율해줘야 하는 문제예요.", 288, 90)]),
    dict(author="새출발오리", cat="counsel", h=6, views=2980, likes=921,
         title="전 애인이 6개월 만에 갑자기 연락 왔어요",
         body="잘 지내냐고 연락이 왔는데 심장이 철렁했어요. 헤어질 때 안 좋게 끝나서 정리했다고 생각했는데… 답장해야 할지 무시해야 할지 모르겠어요.",
         poll=("읽씹이 답", 1990, "한 번은 만나봐", 990),
         comments=[("철벽인개구리", "single", "6개월 뒤 연락은 그냥 심심해서예요. 답장하면 또 휘둘립니다.", 341, 200),
                   ("금사빠멍뭉이", "couple", "저는 답장했다가 또 시작했고 또 똑같이 헤어졌어요. 반복됩니다.", 512, 150)]),
    dict(author="설레는여우", cat="dating", h=1, views=760, likes=180,
         title="썸 3주째, 먼저 고백하면 지는 건가요?",
         body="매일 연락하고 주말마다 만나는데 둘 다 '우리 뭐지?' 소리를 안 해요. 분위기는 완전 사귀는 것 같은데 애매한 이 상태가 답답합니다.",
         poll=("먼저 고백해", 520, "조금 더 기다려", 240),
         comments=[("밀당고수토끼", "single", "3주면 충분히 확인됐어요. 먼저 말하는 사람이 이기는 거예요.", 88, 40)]),
    dict(author="직진하는판다", cat="dating", h=9, views=1420, likes=402,
         title="소개팅 애프터 신청 언제 하는 게 국룰인가요",
         body="어제 소개팅 괜찮았는데 헤어지고 나서 연락 텀을 얼마나 둬야 할지 모르겠어요. 당일에 하면 급해 보이고 이틀 뒤면 식은 것 같고.",
         poll=("당일 밤에", 910, "다음 날 낮에", 510),
         comments=[("소심한햄찌", "single", "당일에 '오늘 즐거웠어요' 정도는 보내는 게 좋아요. 애프터는 다음 날.", 156, 300)]),
    dict(author="철벽인개구리", cat="counsel", h=12, views=3310, likes=1240,
         title="친구가 자기 남친 욕만 하는데 어떻게 반응해야 하죠",
         body="만날 때마다 남친 욕을 두 시간씩 해요. 그래서 헤어지라고 하면 또 화내고, 편들면 지치고. 이제 만나기가 좀 부담스러워요.",
         poll=None,
         comments=[("당당한여우", "single", "그냥 들어주기만 하세요. 조언 원하는 거 아니에요.", 620, 400),
                   ("다정한판다", "couple", "저도 이런 친구 있는데 '넌 어떻게 하고 싶은데?' 만 물어봐요.", 290, 260)]),
    dict(author="질투많은꿀꿀이", cat="love", h=3, views=2210, likes=770,
         title="여친 인스타에 남사친이 댓글 다는 거 신경 쓰이면 속좁은 건가요",
         body="'누나 오랜만~' 이런 댓글에 여친이 하트 답글 달고 하는데 저만 불편한 건가 싶어서요. 말하면 예민하다 할 것 같고.",
         poll=("충분히 그럴 수 있어", 1560, "그건 좀 속좁다", 650),
         comments=[("사랑꾼펭귄", "married", "불편한 감정 자체는 잘못 아니에요. 근데 통제하려 들면 그때부터 문제죠.", 344, 100)]),
    dict(author="눈치보는병아리", cat="love", h=7, views=1890, likes=560,
         title="남친이 데이트 때마다 폰만 봐요",
         body="밥 먹을 때도 게임, 카페에서도 릴스. 대화하다가도 폰 봐서 '내 얘기 듣고 있어?' 물으면 듣고 있대요. 저랑 있는 게 재미없나 싶어요.",
         poll=("헤어짐 각", 700, "대화로 풀 문제", 1190),
         comments=[("츤데레곰돌이", "couple", "이건 습관이라 한 번 세게 말해야 고쳐져요. 참으면 계속 그래요.", 210, 55)]),
    dict(author="낭만적인고양이", cat="marriage", h=14, views=5200, likes=1610,
         title="예비 시어머니가 상견례 전에 예단 얘기를 꺼내셨어요",
         body="아직 결혼 날짜도 안 잡았는데 벌써 예단·예물 얘기가 나와서 당황했어요. 남편 될 사람은 '그냥 흘려들어' 하는데 저는 벌써 걱정입니다.",
         poll=("남편이 확실히 선 그어야", 4100, "부모님 뜻도 존중해야", 1100),
         comments=[("현명한며느리", "married", "결혼 전에 이런 거 안 잡아두면 결혼 후엔 더 못 바꿔요. 지금 확실히 하세요.", 880, 240),
                   ("순정파오리", "married", "저는 이거 대충 넘어갔다가 3년째 스트레스받고 있어요.", 455, 180)]),
    dict(author="금사빠멍뭉이", cat="story", h=4, views=2670, likes=1030,
         title="[후기] 3년 연애 끝에 결혼한 사람인데 질문 받아요",
         body="대학 때 만나서 3년 연애하고 작년에 결혼했어요. 권태기, 장거리, 양가 반대 다 겪어봤어요. 궁금한 거 있으면 댓글 남겨주세요.",
         poll=None,
         comments=[("설레는여우", "single", "권태기 어떻게 넘기셨어요? 지금 딱 그 시기 같아서요.", 190, 200),
                   ("불안한하트토끼", "couple", "장거리 팁 있으면 알려주세요 ㅠㅠ", 145, 160),
                   ("소심한햄찌", "single", "양가 반대는 어떻게 설득하셨나요?", 98, 120)]),
    dict(author="당당한여우", cat="free", h=8, views=1120, likes=310,
         title="솔로 3년 차, 이제 연애 세포가 죽은 것 같아요",
         body="한때는 설렘이 뭔지 알았는데 이제 소개팅 들어와도 귀찮기만 하고. 이거 그냥 편한 건가요 아니면 문제인 건가요.",
         poll=("편한 거 맞음", 620, "회피하는 중", 500),
         comments=[("직진하는판다", "single", "저도 그랬는데 막상 마음 가는 사람 생기니 세포 다 살아나더라고요.", 233, 90)]),
    dict(author="중립기어햄찌", cat="daily", h=10, views=980, likes=240,
         title="커플들 데이트 비용 진짜 어떻게 나눠요?",
         body="반반이 제일 깔끔한 것 같으면서도, 매번 계산할 때 애매해요. 데이트 통장 만드는 게 나을까요?",
         poll=("데이트 통장", 660, "그때그때 반반", 320),
         comments=[("사랑꾼펭귄", "married", "데이트 통장 강추. 다툼이 확 줄어요.", 178, 130)]),
    dict(author="소심한햄찌", cat="dating", h=16, views=1650, likes=430,
         title="상대가 답장이 느린데 이거 관심 없는 거 맞죠?",
         body="한두 시간은 기본이고 가끔 반나절 뒤에 와요. 근데 막상 만나면 잘해줘서 헷갈려요. 원래 연락에 무딘 사람도 있는 건가요?",
         poll=("관심 없는 거", 720, "성향 차이일 수도", 930),
         comments=[("밀당고수토끼", "single", "만나면 잘해주면 관심은 있는 거예요. 연락 텀은 성향이라 맞춰가야 해요.", 265, 210)]),
    dict(author="불안한하트토끼", cat="love", h=6, views=2340, likes=810,
         title="남친이랑 100일인데 아무 계획이 없대요",
         body="여자친구는 은근 기대하고 있는데 남친은 '그냥 밥이나 먹자' 이래요. 이 정도는 서운해해도 되는 거죠?",
         poll=("당연히 서운", 1780, "밥도 좋은 데이트지", 560),
         comments=[("질투많은꿀꿀이", "couple", "기대치를 미리 말해두는 게 나아요. 남자들 진짜 몰라요.", 320, 70)]),
    dict(author="츤데레곰돌이", cat="counsel", h=20, views=3900, likes=1350,
         title="여사친이랑 단둘이 여행 가는 남친, 참아야 하나요",
         body="10년 지기 여사친이라는데 단둘이 1박2일 여행을 간다네요. '너는 왜 그걸 이해 못 하냐'는 식이라 제가 이상한 건가 싶어요.",
         poll=("이건 못 참지", 3300, "친구면 괜찮", 600),
         comments=[("당당한여우", "single", "성별 바꿔서 생각해보라 하세요. 본인이 못 참을걸요.", 940, 300),
                   ("낭만적인고양이", "married", "10년 지기든 뭐든 연인이 불편하면 안 가는 게 배려예요.", 610, 240)]),
    dict(author="순정파오리", cat="story", h=18, views=3120, likes=1180,
         title="[썰] 소개팅에서 만난 사람이 알고 보니 전 남친 친구",
         body="분위기 좋게 커피 마시다가 공통 지인 얘기 나왔는데… 알고 보니 제 전 남친이랑 절친이더라고요. 서로 얼굴 하얘져서 급 마무리했어요.",
         poll=None,
         comments=[("설레는여우", "single", "헐 이건 진짜 소름 ㅋㅋㅋ 그래서 그 뒤로 연락은요?", 288, 220),
                   ("직진하는판다", "single", "세상 진짜 좁다…", 150, 180)]),
    dict(author="사랑꾼펭귄", cat="marriage", h=22, views=2760, likes=900,
         title="맞벌이인데 집안일 분담이 안 돼요",
         body="둘 다 똑같이 일하는데 집에 오면 저만 움직여요. 말하면 '알겠어' 하고 그때뿐이고. 결혼 전엔 안 이랬는데.",
         poll=("역할 정해서 분담", 2000, "그때그때 눈치껏", 760),
         comments=[("현명한며느리", "married", "'눈치껏'이 안 되니까 문제인 거예요. 요일별로 딱 정하세요.", 420, 260)]),
    dict(author="밀당고수토끼", cat="dating", h=11, views=1380, likes=360,
         title="썸 탈 때 먼저 연락 vs 기다리기",
         body="먼저 연락하면 좋아하는 티 나는 것 같고, 기다리면 관심 없어 보일까 봐 걱정이고. 다들 어떻게 하세요?",
         poll=("표현하는 게 이득", 990, "밀당도 필요", 390),
         comments=[("금사빠멍뭉이", "couple", "밀당하다 놓친 사람이 한둘이 아니라… 그냥 표현하세요.", 205, 95)]),
    dict(author="다정한판다", cat="daily", h=13, views=870, likes=210,
         title="장거리 연애 하시는 분들 어떻게 버텨요?",
         body="서울-부산인데 한 달에 한 번 보기도 빠듯해요. 영상통화로 버티는데 가끔 현타가 옵니다. 팁 있으면 공유해주세요.",
         poll=None,
         comments=[("금사빠멍뭉이", "couple", "저희는 다음 만남 날짜를 항상 정해뒀어요. 기다릴 게 있으면 버텨지더라고요.", 188, 140)]),
    dict(author="무뚝뚝한곰돌이", cat="counsel", h=24, views=4400, likes=1520,
         title="여친이 제 친구들 모임을 싫어해요",
         body="한 달에 한두 번 있는 모임인데 갈 때마다 기분 안 좋아 해요. 친구를 끊을 수도 없고, 여친을 서운하게 할 수도 없고 중간에서 힘드네요.",
         poll=("빈도·귀가시간 조율", 3600, "여친이 이해해야", 800),
         comments=[("낭만적인고양이", "married", "'몇 시까지 갈게' 하고 지키면 대부분 풀려요. 불안해서 그런 거예요.", 710, 350)]),
    dict(author="눈치보는병아리", cat="free", h=15, views=1040, likes=280,
         title="연애할 때 자기 얘기 하나도 안 하는 사람 어때요",
         body="만난 지 두 달인데 과거 연애는커녕 가족 얘기도 잘 안 해요. 벽이 있는 느낌인데 원래 시간이 필요한 걸까요?",
         poll=("시간 주면 열려", 590, "안 맞는 신호", 450),
         comments=[("철벽인개구리", "single", "저 원래 이런 사람인데, 진짜 편해지면 얘기해요. 근데 두 달이면 좀 더 봐야.", 175, 110)]),
    dict(author="설레는여우", cat="story", h=30, views=2050, likes=740,
         title="[후기] 3개월 만에 헤어진 이유가 어이없음",
         body="다 좋았는데 치약 짜는 방법으로 시작해서 별거 아닌 걸로 계속 부딪혔어요. 결국 '우리 안 맞나 봐'로 끝. 사소한 게 제일 무섭더라고요.",
         poll=None,
         comments=[("중립기어햄찌", "couple", "사소한 게 쌓이면 그게 제일 크죠. 이해됩니다.", 210, 400)]),
    dict(author="질투많은꿀꿀이", cat="love", h=19, views=1760, likes=520,
         title="남친이 옛날 연애 얘기를 너무 아무렇지 않게 해요",
         body="'전 여친은 이랬는데' 이런 말을 비교하듯이 아니라 그냥 얘기하는데도 저는 신경 쓰여요. 하지 말라고 하면 예민한 걸까요?",
         poll=("듣기 싫다 말해도 됨", 1300, "네가 예민한 듯", 460),
         comments=[("사랑꾼펭귄", "married", "비교가 아니어도 듣는 사람이 불편하면 안 하는 게 맞아요.", 240, 130)]),
    dict(author="직진하는판다", cat="daily", h=26, views=760, likes=190,
         title="첫 데이트 장소로 영화관 어때요?",
         body="말 안 해도 되고 편하긴 한데, 두 시간 동안 서로 알아갈 시간이 없어서 별로라는 말도 있더라고요. 첫 데이트엔 좀 그런가요?",
         poll=("첫 데이트엔 비추", 480, "무난해서 좋음", 280),
         comments=[("밀당고수토끼", "single", "첫 데이트는 대화가 되는 곳이 나아요. 영화는 두 번째부터.", 132, 210)]),
    dict(author="새출발오리", cat="counsel", h=28, views=2890, likes=980,
         title="헤어진 지 3개월인데 아직도 안 잊혀요",
         body="새 사람 만나보려 해도 자꾸 비교하게 되고, SNS도 못 끊고. 다들 이별 극복 어떻게 하셨어요?",
         poll=None,
         comments=[("당당한여우", "single", "SNS 차단부터 하세요. 안 보이면 확실히 빨라져요.", 388, 300),
                   ("금사빠멍뭉이", "couple", "시간이 약이라는 말 진부하지만 진짜예요. 3개월이면 아직 초반.", 256, 250)]),
    dict(author="소심한햄찌", cat="free", h=21, views=1210, likes=340,
         title="연애하고 싶은데 어디서 사람을 만나야 할지 모르겠어요",
         body="직장-집만 반복하는 30대 직장인입니다. 소개팅도 이제 씨가 말랐고. 다들 요즘 어떻게 만나요?",
         poll=("소개팅 앱도 방법", 720, "지인 소개가 최고", 490),
         comments=[("다정한판다", "couple", "저는 취미 모임에서 만났어요. 공통 관심사 있으니 대화가 편하더라고요.", 210, 170)]),
    dict(author="현실연애", cat="marriage", h=34, views=3600, likes=1240,
         title="결혼 준비하면서 싸움이 늘었어요",
         body="스드메부터 신혼집까지 결정할 게 산더미고, 돈 얘기 나오면 예민해져요. 결혼 준비하다 헤어진다는 말이 이해돼요.",
         poll=("원래 다 그럼", 2900, "가치관 점검 필요", 700),
         comments=[("현명한며느리", "married", "이때 싸우는 방식이 결혼 후에도 그대로예요. 잘 맞춰보세요.", 540, 400)]),
    dict(author="낭만적인고양이", cat="love", h=32, views=1580, likes=470,
         title="사랑 표현 안 하는 남친, 원래 그런 걸까요",
         body="'사랑해' 소리를 먼저 한 적이 거의 없어요. 제가 하면 '나도' 정도. 마음이 없는 건 아닌 것 같은데 표현이 없으니 자꾸 불안해요.",
         poll=("표현도 노력해야", 1200, "행동으로 보면 됨", 380),
         comments=[("츤데레곰돌이", "couple", "저도 표현 못 하는 편인데, 노력하니까 되긴 하더라고요. 말해주세요.", 198, 220)]),
    dict(author="당당한여우", cat="dating", h=36, views=990, likes=250,
         title="애프터 신청 받았는데 애매하면 나가야 하나요",
         body="나쁘진 않은데 설렘이 없어요. 한 번 더 보면 다를까 싶다가도 시간 낭비인가 싶고. 이런 경우 다들 어떻게 하세요?",
         poll=("한 번은 더 봐", 560, "설렘 없으면 패스", 430),
         comments=[("설레는여우", "single", "두 번째에 확 좋아지는 경우도 있어요. 저는 한 번은 더 봐요.", 140, 280)]),
    dict(author="사랑꾼펭귄", cat="story", h=40, views=2400, likes=860,
         title="[썰] 7년 만에 재회해서 결혼한 이야기",
         body="스무 살에 만나 헤어졌다가 스물일곱에 우연히 다시 만났어요. 서로 많이 컸더라고요. 첫사랑이랑 결혼하는 사람 진짜 있습니다.",
         poll=None,
         comments=[("불안한하트토끼", "couple", "이런 얘기 들으면 첫사랑 생각나요… 축하드려요!", 310, 350),
                   ("순정파오리", "married", "재회는 신중해야 하지만 잘 되는 경우도 있군요.", 175, 300)]),
    dict(author="철벽인개구리", cat="daily", h=38, views=680, likes=160,
         title="연애 안 한 지 오래되면 연애가 무서워지지 않나요",
         body="설레는 것도 좋지만 또 상처받을까 봐, 맞춰가는 게 귀찮을까 봐 미리 겁부터 나요. 이거 극복하신 분 있나요?",
         poll=None,
         comments=[("금사빠멍뭉이", "couple", "겁나는 게 정상이에요. 근데 좋은 사람 만나면 그 걱정이 사라져요.", 145, 320)]),
    dict(author="눈치보는병아리", cat="counsel", h=42, views=2100, likes=690,
         title="남친이 저보다 게임을 더 좋아하는 것 같아요",
         body="주말에 하루 종일 게임만 해요. 같이 있어도 게임, 약속도 게임 때문에 미루고. 취미인 건 아는데 우선순위가 밀리는 기분이에요.",
         poll=("우선순위 문제 맞음", 1500, "취미는 존중해야", 600),
         comments=[("무뚝뚝한곰돌이", "married", "취미는 존중하되 '같이 있을 땐 집중' 규칙은 필요해요.", 230, 380)]),
    dict(author="밀당고수토끼", cat="free", h=44, views=1340, likes=380,
         title="이상형 다 맞는데 설렘이 없으면 만나야 하나요",
         body="조건도 성격도 다 좋은 사람인데 이상하게 두근거리지가 않아요. 설렘이 없으면 안 되는 걸까요, 아니면 그게 편한 사랑일까요?",
         poll=("편한 게 오래감", 780, "설렘 없으면 아님", 560),
         comments=[("낭만적인고양이", "married", "설렘은 시간 지나면 어차피 줄어요. 편한 사람이 오래 가더라고요.", 290, 400)]),
    dict(author="다정한판다", cat="love", h=46, views=1620, likes=500,
         title="여친이 힘들 때 위로하는 법을 모르겠어요",
         body="울면서 얘기하는데 해결책을 말하면 '그게 아니라'고 하고, 가만있으면 관심 없냐고 하고. 남자들은 이거 어떻게 해요?",
         poll=("공감이 먼저", 1300, "해결책도 필요", 320),
         comments=[("현명한며느리", "married", "'많이 힘들었겠다' 이 한마디면 돼요. 해결책은 물어볼 때만.", 480, 400),
                   ("당당한여우", "single", "들어주는 것만으로 90%는 해결돼요.", 265, 350)]),
    dict(author="중립기어햄찌", cat="dating", h=48, views=1180, likes=330,
         title="번호 물어봤는데 카톡 아이디 준 거, 관심 없는 건가요",
         body="번호 물어봤더니 '카톡으로 해요~' 하면서 아이디만 줬어요. 이거 은근한 거절인가요 아니면 요즘 이게 국룰인가요?",
         poll=("요즘 흔한 일", 760, "살짝 선 긋는 중", 420),
         comments=[("소심한햄찌", "single", "요즘 번호보다 카톡 먼저 주는 사람 많아요. 너무 의미 두지 마세요.", 190, 450)]),
]

DAILY_QUESTIONS = [
    "싸우고 나면 누가 먼저 연락하는 게 맞을까?",
    "데이트 비용은 어떻게 나누는 게 좋을까?",
    "연락 텀, 하루 몇 번이 적당할까?",
    "기념일은 꼭 챙겨야 할까?",
    "이성 친구, 어디까지 괜찮을까?",
    "권태기, 어떻게 극복해야 할까?",
    "결혼 전 동거, 찬성 vs 반대?",
    "장거리 연애, 가능할까?",
    "첫 데이트 비용은 누가?",
    "연인의 SNS, 어디까지 봐도 될까?",
    "다툰 날 바로 화해 vs 시간 두기?",
    "연애 초반 매일 연락, 필수일까?",
    "상대의 과거 연애, 알고 싶을까?",
    "커플 통장, 만들까 말까?",
]


def seed_content(reset: bool = True) -> dict:
    """실서비스 톤의 콘텐츠로 피드 구성. reset=True면 기존 글/댓글/투표 전부 삭제."""
    from ..models import (
        Comment, CommentLike, DailyQuestion, PollOption, Post, PostLike, User, Vote,
    )
    from ..ranking import recompute_hot_scores

    if reset:
        for Model in (CommentLike, PostLike, Vote, Comment, PollOption, Post):
            db.session.query(Model).delete()
        db.session.query(DailyQuestion).delete()
        db.session.commit()

    # 시드 유저 생성/조회
    umap: dict[str, User] = {}
    for i, (nick, status) in enumerate(USERS):
        u = User.query.filter_by(nickname=nick).first()
        if not u:
            u = User(nickname=nick, social_provider="dev", social_id=f"seed:{nick}",
                     relationship_status=status, avatar_no=(i % 12) + 1)
            db.session.add(u)
            db.session.flush()
        umap[nick] = u

    now = datetime.utcnow()
    n_posts = n_comments = 0
    for d in POSTS:
        author = umap[d["author"]]
        post = Post(
            user_id=author.id, category=d["cat"], title=d["title"], body=d["body"],
            is_poll=bool(d.get("poll")), author_status=author.relationship_status,
            view_count=d["views"], like_count=d["likes"],
            comment_count=len(d.get("comments", [])),
            created_at=now - timedelta(hours=d["h"]),
        )
        db.session.add(post)
        db.session.flush()
        n_posts += 1

        if d.get("poll"):
            a_label, a_votes, b_label, b_votes = d["poll"]
            db.session.add_all([
                PollOption(post_id=post.id, side="A", label=a_label, vote_count=a_votes),
                PollOption(post_id=post.id, side="B", label=b_label, vote_count=b_votes),
            ])
        for nick, status, body, likes, mins in d.get("comments", []):
            cu = umap.get(nick)
            if not cu:
                continue
            db.session.add(Comment(
                post_id=post.id, user_id=cu.id, body=body, like_count=likes,
                author_status=status, created_at=now - timedelta(minutes=mins),
            ))
            n_comments += 1

    # 커플 오늘의 질문 — 오늘부터 과거로 채워 (오늘 = 첫 항목)
    from datetime import date
    today = date.today()
    for i, q in enumerate(DAILY_QUESTIONS):
        db.session.add(DailyQuestion(question=q, scheduled_date=today - timedelta(days=i)))

    db.session.commit()
    recompute_hot_scores()
    return {"posts": n_posts, "comments": n_comments, "daily_questions": len(DAILY_QUESTIONS)}
