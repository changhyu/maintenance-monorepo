import React from 'react';

import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';

// TypeScript 이슈 회피를 위한 타입 어설션
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
