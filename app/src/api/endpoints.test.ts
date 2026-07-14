/** API 빌더 회귀 — 경로·메서드·바디 정확성 (fetch 모킹). */
import { getAd, clickAd } from './ads';
import { getMyPosts, getMyComments } from './me';
import { getNotifications } from './notifications';
import { getTrending } from './home';
import { bestPosts, bestComments } from './best';
import { getTodayIssue, voteIssue } from './issues';
import { createPost, votePost, likePost } from './posts';
import { getDailyPoll, voteDailyPoll } from './dailyPoll';
import { reportTarget, blockUser, unblock } from './moderation';
import { getTestPromo } from './tests';

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ ok: true }) });
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});

function call() {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: url as string, method: (init?.method as string) || 'GET', body: init?.body ? JSON.parse(init.body as string) : undefined };
}

describe('API endpoints', () => {
  it('getAd → GET /ads?position', async () => { await getAd('feed_native'); const c = call(); expect(c.url).toContain('/ads?position=feed_native'); expect(c.method).toBe('GET'); });
  it('clickAd → POST /ads/{id}/click', async () => { await clickAd(5); const c = call(); expect(c.url).toContain('/ads/5/click'); expect(c.method).toBe('POST'); });
  it('getMyPosts → GET /me/posts', async () => { await getMyPosts('t'); expect(call().url).toContain('/me/posts'); });
  it('getMyComments → GET /me/comments', async () => { await getMyComments('t'); expect(call().url).toContain('/me/comments'); });
  it('getNotifications → GET /notifications', async () => { await getNotifications('t'); expect(call().url).toContain('/notifications'); });
  it('getTrending → GET /home/trending', async () => { await getTrending('t'); expect(call().url).toContain('/home/trending'); });
  it('bestPosts → GET /best?period&category', async () => { await bestPosts('weekly', 'love', 't'); expect(call().url).toContain('period=weekly'); expect(call().url).toContain('category=love'); });
  it('bestPosts all → category 제외', async () => { await bestPosts('realtime', 'all', 't'); expect(call().url).not.toContain('category='); });
  it('bestComments → GET /best/comments', async () => { await bestComments('t'); expect(call().url).toContain('/best/comments'); });
  it('getTodayIssue → GET /issues/today', async () => { await getTodayIssue('t'); expect(call().url).toContain('/issues/today'); });
  it('voteIssue → POST /issues/{id}/vote {side}', async () => { await voteIssue(3, 'a', 't'); const c = call(); expect(c.url).toContain('/issues/3/vote'); expect(c.method).toBe('POST'); expect(c.body).toEqual({ side: 'a' }); });
  it('createPost → POST /posts {body}', async () => { await createPost({ category: 'free', title: '제목' }, 't'); const c = call(); expect(c.url).toContain('/posts'); expect(c.method).toBe('POST'); expect(c.body).toMatchObject({ category: 'free', title: '제목' }); });
  it('votePost → POST /posts/{id}/vote {side}', async () => { await votePost(9, 'B', 't'); const c = call(); expect(c.url).toContain('/posts/9/vote'); expect(c.body).toEqual({ side: 'B' }); });
  it('likePost → POST /posts/{id}/like', async () => { await likePost(9, 't'); const c = call(); expect(c.url).toContain('/posts/9/like'); expect(c.method).toBe('POST'); });
  it('getDailyPoll → GET /daily-poll/today', async () => { await getDailyPoll('t'); expect(call().url).toContain('/daily-poll/today'); });
  it('voteDailyPoll → POST /daily-poll/vote {side}', async () => { await voteDailyPoll('a', 't'); const c = call(); expect(c.url).toContain('/daily-poll/vote'); expect(c.body).toEqual({ side: 'a' }); });
  it('reportTarget → POST /reports', async () => { await reportTarget({ target_type: 'post', target_id: 1, reason: 'x' }, 't'); const c = call(); expect(c.url).toContain('/reports'); expect(c.body).toMatchObject({ target_type: 'post', target_id: 1 }); });
  it('blockUser → POST /blocks {blocked_user_id}', async () => { await blockUser(7, 't'); const c = call(); expect(c.url).toContain('/blocks'); expect(c.body).toEqual({ blocked_user_id: 7 }); });
  it('unblock → DELETE /blocks/{id}', async () => { await unblock(4, 't'); const c = call(); expect(c.url).toContain('/blocks/4'); expect(c.method).toBe('DELETE'); });
  it('getTestPromo → GET /tests/promo', async () => { await getTestPromo('t'); expect(call().url).toContain('/tests/promo'); });
});
