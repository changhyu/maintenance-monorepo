import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        role: string;
      } | null; // null 허용하여 undefined 문제 해결
    }
  }
}

// JWT 비밀 키
const JWT_SECRET = process.env['JWT_SECRET'] || 'default-secret-change-in-production';

// 토큰 검증 미들웨어
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  // 헤더에서 Authorization 토큰 가져오기
  const authHeader = req.headers.authorization;
  
  // 토큰 형식 확인
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 쿠키에서 토큰 확인 (백업 방법)
    const token = req.cookies && req.cookies['token'];
    if (!token) {
      res.status(401).json({ error: '인증 토큰이 필요합니다.' });
      return;
    }
    
    try {
      // 토큰이 없을 수 있으므로 타입 확인 필요
      if (typeof token !== 'string') {
        res.status(401).json({ error: '유효하지 않은 토큰 형식입니다.' });
        return;
      }
      
      // 명시적으로 string 타입임을 확인한 토큰 사용
      const decoded = jwt.verify(token, JWT_SECRET);
      // user 할당 전 null로 초기화
      req.user = null;
      // decoded가 존재할 때만 할당
      if (decoded) {
        req.user = decoded as { id: string; email: string; role: string; };
      }
      next();
    } catch (error) {
      res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    return;
  }
  
  // Bearer 형식 토큰에서 실제 토큰 부분 추출
  const token = authHeader.split(' ')[1];
  
  try {
    // token이 undefined일 가능성 체크
    if (!token) {
      res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
      return;
    }
    
    // 토큰 검증 - token은 이 시점에서 string 타입임
    const decoded = jwt.verify(token, JWT_SECRET);
    // 검증된 사용자 정보를 요청 객체에 추가
    req.user = null; // 먼저 null로 초기화
    if (decoded) {
      req.user = decoded as { id: string; email: string; role: string; };
    }
    next();
  } catch (error) {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

// 관리자 권한 확인 미들웨어
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    return;
  }
  
  next();
};

// 선택적 토큰 검증 (있으면 검증, 없어도 통과)
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 인증 정보가 없을 때는 req.user를 null로 초기화
    req.user = null;
    next();
    return;
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // req.user 초기화
    req.user = null;
    // 토큰이 유효한 경우에만 사용자 정보 설정
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded) {
        req.user = decoded as { id: string; email: string; role: string; };
      }
    }
  } catch (error) {
    // 토큰이 유효하지 않아도 오류를 반환하지 않음
  }
  
  next();
};