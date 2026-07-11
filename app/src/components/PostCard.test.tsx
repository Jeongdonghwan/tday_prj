import { fireEvent, render, screen } from '@testing-library/react-native';

import { PostCard, type FeedPost } from './PostCard';

const base: FeedPost = {
  id: 1,
  tag: '썰',
  categoryLabel: '연애',
  title: '기념일 까먹은 남친',
  body: '본문',
  authorName: '속상러',
  authorStatus: 'couple',
  authorAvatarNo: 2,
  timeText: '2시간 전',
  viewCount: 1800,
  likeCount: 643,
  commentCount: 87,
};

// 렌더러 환경 비호환으로 일시 skip (StatusChip.test 참고).
describe.skip('PostCard', () => {
  it('제목·작성자·상태칩 표시', () => {
    render(<PostCard post={base} />);
    expect(screen.getByText('기념일 까먹은 남친')).toBeTruthy();
    expect(screen.getByText(/속상러/)).toBeTruthy();
    expect(screen.getByText('커플')).toBeTruthy();
  });

  it('투표글이면 게이지 % 표시', () => {
    render(<PostCard post={{ ...base, poll: { aLabel: '여친', bLabel: '남친', aPct: 62 }, voteCount: 1204 }} />);
    expect(screen.getByText(/여친 · 62%/)).toBeTruthy();
    expect(screen.getByText(/38% · 남친/)).toBeTruthy();
  });

  it('onPress 호출', () => {
    const onPress = jest.fn();
    render(<PostCard post={base} onPress={onPress} />);
    fireEvent.press(screen.getByText('기념일 까먹은 남친'));
    expect(onPress).toHaveBeenCalled();
  });
});
