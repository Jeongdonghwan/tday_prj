import { ApiError, apiRequest } from './client';

describe('apiRequest', () => {
  beforeEach(() => {
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
  });

  it('성공 시 JSON 반환', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ a: 1 }) });
    expect(await apiRequest('/x')).toEqual({ a: 1 });
  });

  it('실패 시 서버 message 로 ApiError', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 409, text: async () => JSON.stringify({ message: '이미 투표했어요.' }) });
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 409, message: '이미 투표했어요.' });
  });

  it('토큰을 Bearer 헤더로 주입', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });
    await apiRequest('/x', { token: 'abc', method: 'POST', body: { k: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ k: 1 });
  });

  it('ApiError 는 status 를 보존', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, text: async () => '' });
    await expect(apiRequest('/x')).rejects.toBeInstanceOf(ApiError);
  });
});
