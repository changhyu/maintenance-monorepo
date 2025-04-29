// Jest 설정 및 mocking 설정
jest.setTimeout(30000); // 테스트 타임아웃 30초로 설정

// 글로벌 테스트 설정
global.console = {
  ...console,
  // 테스트 중 경고는 오류로 처리하지 않음
  warn: jest.fn(),
  error: jest.fn(),
  // 필요한 경우 console.log를 감시하거나 비활성화
  log: jest.fn(),
};

// 환경 변수 설정
process.env.NODE_ENV = 'test';

// 모의 객체 설정 예시
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