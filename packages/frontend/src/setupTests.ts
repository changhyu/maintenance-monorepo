import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { setLogger } from 'react-query';
import 'jest-environment-jsdom';

// React Testing Library 설정
configure({
  testIdAttribute: 'data-testid',
});

// React Query 로깅 비활성화
setLogger({
  log: console.log,
  warn: console.warn,
  error: () => {},
});

// 전역 모의 객체 설정
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 날짜 관련 테스트를 위한 타임존 설정
process.env.TZ = 'Asia/Seoul';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
window.IntersectionObserver = IntersectionObserver;

// Mock ResizeObserver
class ResizeObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
window.ResizeObserver = ResizeObserver; 