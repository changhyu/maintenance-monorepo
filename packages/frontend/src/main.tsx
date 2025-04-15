import React from 'react';

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ApiProvider } from './context/ApiContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// React 19의 개선된 Strict Mode 사용
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ApiProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ApiProvider>
    </AuthProvider>
  </React.StrictMode>
);
