import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// React 19 업그레이드 호환성 설정
const react19Config = {
    // React 19 콘커런트 활성화
    concurrent: true,
    // 디버거 활성화
    enableDebugTools: process.env.NODE_ENV === 'development',
};
// TypeScript 이슈 회피를 위한 타입 어설션
const rootElement = document.getElementById('root');
if (!rootElement)
    throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);
// React 19의 기능을 활용한 StrictMode 설정
root.render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
