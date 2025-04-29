import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * 안전한 CSRF 보호 미들웨어
 * csurf 대신 사용되는 맞춤형 보안 솔루션
 */
export const csrfProtection = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // CSRF 토큰이 세션에 없으면 생성
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    
    // GET 요청은 상태를 변경하지 않으므로 항상 허용
    if (req.method === 'GET') {
      res.locals.csrfToken = req.session.csrfToken;
      return next();
    }
    
    // POST/PUT/DELETE 요청 시 CSRF 토큰 검증
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).json({ error: 'CSRF token validation failed' });
    }
    
    // 요청마다 새 토큰 생성 (BREACH 공격 방지)
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    res.locals.csrfToken = req.session.csrfToken;
    
    next();
  };
};

/**
 * CSRF 토큰을 응답 헤더에 추가하는 미들웨어
 */
export const setCsrfHeader = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-CSRF-Token', req.session.csrfToken || '');
    next();
  };
};