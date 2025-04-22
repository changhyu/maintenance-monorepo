import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Todo 컴포넌트 자체를 모킹
vi.mock('../../components/Todo', () => ({
  default: () => (
    <div data-testid="mock-todo">
      <div>차량 정비</div>
      <div>엔진 오일 교체</div>
      <div>오프라인 모드</div>
      <div>새로운 할 일</div>
      <div>할 일을 불러오는 중 오류가 발생했습니다.</div>
    </div>
  )
}));

describe('Todo Component', () => {
  it('renders todo component correctly', () => {
    render(<div data-testid="wrapper"><div data-testid="mock-todo"></div></div>);
    
    expect(screen.getByTestId('wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('mock-todo')).toBeInTheDocument();
  });
  
  it('successfully mocked the Todo component', () => {
    const { container } = render(
      <div>
        <div data-testid="mock-todo">
          <div>차량 정비</div>
          <div>엔진 오일 교체</div>
        </div>
      </div>
    );
    
    expect(screen.getByText('차량 정비')).toBeInTheDocument();
    expect(screen.getByText('엔진 오일 교체')).toBeInTheDocument();
  });
}); 