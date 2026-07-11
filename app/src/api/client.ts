/**
 * API 클라이언트 — Flask 서버 호출 래퍼.
 * base URL 은 EXPO_PUBLIC_API_BASE_URL (.env). JWT 는 호출 시 주입.
 */
import Constants from 'expo-constants';

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // 폴백: Expo 개발 호스트 IP 로 추정 (실기기 디버깅 편의), 포트 5000
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:5000`;
  return 'http://127.0.0.1:5000';
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    if (data && typeof data === 'object' && 'message' in data) {
      message = String((data as { message: unknown }).message);
    }
    throw new ApiError(res.status, data, message);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
