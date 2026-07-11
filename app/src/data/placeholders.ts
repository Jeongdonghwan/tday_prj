/**
 * 골격 단계용 더미 데이터 (목업 내용 그대로). 3단계에서 API 연동으로 교체.
 */
import type { FeedPost } from '@/components/PostCard';

export const CATEGORY_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'love', label: '연애' },
  { key: 'marriage', label: '결혼·부부' },
  { key: 'counsel', label: '고민상담' },
  { key: 'free', label: '자유' },
];

export const FEED_POSTS: FeedPost[] = [
  {
    id: 1,
    categoryLabel: '연애 · 다툼',
    title: '기념일 까먹은 남친, 이거 헤어질 일임?',
    body: '사귄 지 1년인데 100일도 그냥 넘어가고 이번 생일도 까먹었어요. 미안하다는 말도 먼저 안 하고…',
    authorName: '속상러',
    authorStatus: 'couple',
    timeText: '2시간 전',
    poll: { aLabel: '여친 편', bLabel: '남친 편', aPct: 62 },
    voteCount: 1204,
    commentCount: 87,
  },
  {
    id: 2,
    categoryLabel: '결혼 · 시월드',
    title: '명절에 시댁만 3일, 친정은 안 가도 되는 건가요',
    body: '결혼 2년 차예요. 매번 명절마다 시댁에서 3일을 꽉 채우고 친정은 잠깐 들르는 게 당연한 분위기라…',
    authorName: '현명한며느리',
    authorStatus: 'married',
    timeText: '5시간 전',
    hot: true,
    poll: { aLabel: '이건 아니지', bLabel: '어쩔 수 없어', aPct: 81 },
    voteCount: 2847,
    commentCount: 312,
  },
  {
    id: 3,
    categoryLabel: '고민상담 · 재회',
    title: '전 애인이 6개월 만에 연락 왔어요',
    body: '갑자기 잘 지내냐고 연락이 왔는데 받아야 할지 모르겠어요…',
    authorName: '새출발',
    authorStatus: 'single',
    timeText: '6시간 전',
  },
];
