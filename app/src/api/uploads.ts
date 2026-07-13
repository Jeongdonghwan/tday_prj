/** 이미지 업로드 — multipart. 반환: 서버 저장 URL. */
import { Platform } from 'react-native';
import { API_BASE_URL } from './client';

export async function uploadImage(uri: string, token: string): Promise<string> {
  const name = uri.split('/').pop()?.split('?')[0] || 'photo.jpg';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, name);
  } else {
    // RN: { uri, name, type } 형태
    form.append('file', { uri, name, type } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error('upload_failed');
  const data = (await res.json()) as { url: string };
  return data.url;
}
