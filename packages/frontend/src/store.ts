import { configureStore } from '@reduxjs/toolkit';

// 슬라이스 임포트 (앱이 커지면 추가 예정)

// 초기 상태 타입 정의
export interface RootState {
  // 필요한 상태 타입 정의
}

// 스토어 생성
export const store = configureStore({
  reducer: {
    // 리듀서가 추가되면 여기에 추가
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== 'production'
});

// 디스패치 타입 생성
export type AppDispatch = typeof store.dispatch; 