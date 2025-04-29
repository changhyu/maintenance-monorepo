import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { csrfProtection, setCsrfHeader } from './middleware/csrf';

// 기존 import 및 코드...

const app = express();

// 보안 강화 미들웨어 적용
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secure-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// CSRF 보호 미들웨어 적용
app.use(csrfProtection());
app.use(setCsrfHeader());

// 기존 라우터 및 코드...

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'build')));

// API 라우트 설정
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 모든 요청을 React 앱으로 라우팅
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});