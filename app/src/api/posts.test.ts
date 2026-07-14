import { listPosts, toFeedPost, type ApiPost } from './posts';

const baseApiPost = (over: Partial<ApiPost> = {}): ApiPost => ({
  id: 1,
  category: 'free',
  category_label: '자유',
  title: '제목',
  body: null,
  is_poll: false,
  author: { id: 2, nickname: '닉', status: 'single', status_label: '돌싱', avatar_no: 3 },
  time_text: '방금 전',
  created_at: null,
  view_count: 0,
  like_count: 0,
  comment_count: 0,
  ...over,
});

describe('toFeedPost', () => {
  it('투표글 태그=투표, 카운트·작성자 매핑', () => {
    const fp = toFeedPost(baseApiPost({
      is_poll: true,
      poll: { a_label: 'A', b_label: 'B', a_votes: 3, b_votes: 1, total: 4, a_pct: 75, my_vote: 'A' },
      like_count: 5, comment_count: 2,
    }));
    expect(fp.tag).toBe('투표');
    expect(fp.poll).toEqual({ aLabel: 'A', bLabel: 'B', aPct: 75 });
    expect(fp.voteCount).toBe(4);
    expect(fp.myVote).toBe('A');
    expect(fp.likeCount).toBe(5);
    expect(fp.authorName).toBe('닉');
  });

  it('고민상담 비투표글 태그=고민', () => {
    expect(toFeedPost(baseApiPost({ category: 'counsel', is_poll: false })).tag).toBe('고민');
  });

  it('그 외 비투표글 태그=썰, body/image null 병합', () => {
    const fp = toFeedPost(baseApiPost({ category: 'free', body: null, image_url: null }));
    expect(fp.tag).toBe('썰');
    expect(fp.body).toBeUndefined();
    expect(fp.imageUrl).toBeUndefined();
  });

  it('image_url 있으면 imageUrl 매핑', () => {
    expect(toFeedPost(baseApiPost({ image_url: 'http://x/y.png' })).imageUrl).toBe('http://x/y.png');
  });
});

describe('listPosts query', () => {
  beforeEach(() => {
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ items: [], next_cursor: null }) });
  });
  const url = () => (global.fetch as jest.Mock).mock.calls[0][0] as string;

  it("category=all 은 쿼리에서 제외", async () => {
    await listPosts({ category: 'all' });
    expect(url()).not.toContain('category');
  });

  it('category·cursor·q(trim) 반영', async () => {
    await listPosts({ category: 'love', cursor: 42, q: '  축의금  ' });
    const u = url();
    expect(u).toContain('category=love');
    expect(u).toContain('cursor=42');
    expect(u).toContain('q=');
    expect(decodeURIComponent(u)).toContain('q=축의금');
  });

  it('빈 q 는 제외', async () => {
    await listPosts({ q: '   ' });
    expect(url()).not.toContain('q=');
  });
});
