import { configureStore } from '@reduxjs/toolkit';
// 스토어 생성
export const store = configureStore({
    reducer: {
    // 리듀서가 추가되면 여기에 추가
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false,
    }),
    devTools: process.env.NODE_ENV !== 'production'
});
