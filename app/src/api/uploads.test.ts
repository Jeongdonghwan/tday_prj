import { uploadImage } from './uploads';

describe('uploadImage (native path)', () => {
  let fetchMock: jest.Mock;
  beforeEach(() => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  it('성공 시 저장 URL 반환 + /uploads POST + Bearer', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ url: 'http://x/uploads/a.png' }) });
    const url = await uploadImage('file:///tmp/photo.png', 'tok');
    expect(url).toBe('http://x/uploads/a.png');
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toContain('/uploads');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('non-ok 응답이면 throw', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(uploadImage('file:///tmp/x.png', 'tok')).rejects.toThrow();
  });
});
