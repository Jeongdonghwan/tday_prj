import { getDday } from '@/api/couple';
import { getToday } from '@/api/daily';
import { buildWidgetData } from './widgetData';

jest.mock('@/api/couple', () => ({ getDday: jest.fn() }));
jest.mock('@/api/daily', () => ({ getToday: jest.fn() }));

const mockDday = getDday as jest.Mock;
const mockToday = getToday as jest.Mock;

describe('buildWidgetData', () => {
  it('커플 연결 + 미답변 질문', async () => {
    mockDday.mockResolvedValue({ connected: true, partner: '준호', days: 327, next: { label: '1주년', d_day: 37 } });
    mockToday.mockResolvedValue({ question: { id: 1, text: 'q', date: '2026-06-12' }, my_answer: null, past: [] });

    const w = await buildWidgetData('tok');
    expect(w.ddayText).toBe('준호님과 327일째');
    expect(w.hasToday).toBe(true);
    expect(w.questionText).toBe('오늘 질문 도착');
  });

  it('답변 완료 상태', async () => {
    mockDday.mockResolvedValue({ connected: true, partner: '준호', days: 10 });
    mockToday.mockResolvedValue({ question: { id: 1, text: 'q', date: 'd' }, my_answer: '답', past: [] });

    const w = await buildWidgetData('tok');
    expect(w.hasToday).toBe(false);
    expect(w.questionText).toBe('오늘 답변 완료');
  });

  it('미연결 폴백', async () => {
    mockDday.mockResolvedValue({ connected: false });
    mockToday.mockResolvedValue({ question: null, my_answer: null, past: [] });

    const w = await buildWidgetData('tok');
    expect(w.ddayText).toBe('커플 연결하기');
    expect(w.questionText).toBe('오늘 질문 준비 중');
  });

  it('API 실패해도 안전한 폴백', async () => {
    mockDday.mockRejectedValue(new Error('net'));
    mockToday.mockRejectedValue(new Error('net'));

    const w = await buildWidgetData('tok');
    expect(w.ddayText).toBe('커플 연결하기');
    expect(w.hasToday).toBe(false);
  });
});
