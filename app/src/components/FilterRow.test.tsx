import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterRow } from './FilterRow';

const items = [
  { key: 'all', label: '전체' },
  { key: 'love', label: '연애' },
];

// 렌더러 환경 비호환으로 일시 skip (StatusChip.test 참고).
describe.skip('FilterRow', () => {
  it('항목 렌더 + 선택 콜백', () => {
    const onChange = jest.fn();
    render(<FilterRow items={items} value="all" onChange={onChange} />);
    expect(screen.getByText('전체')).toBeTruthy();
    fireEvent.press(screen.getByText('연애'));
    expect(onChange).toHaveBeenCalledWith('love');
  });
});
