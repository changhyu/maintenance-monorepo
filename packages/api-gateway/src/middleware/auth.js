import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';
// 토큰 캐시 설정 (블랙리스트 및 화이트리스트용)
const tokenCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
// 시크릿 키를 환경 변수에서 가져오기
const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_key';
// JWT 유효성 검사 및 사용자 정보 추출
export const verifyToken = (req, res, next) => {
    // 공개 경로는 인증 없이 접근 가능
    const publicPaths = ['/api/health', '/api/domain-status'];
    if (publicPaths.includes(req.path)) {
        return next();
    }
    try {
        // 토큰 추출: Authorization 헤더 또는 쿠키에서
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
        }
        // 블랙리스트에서 토큰 확인
        if (tokenCache.get(`blacklist:${token}`)) {
            return res.status(401).json({ error: '토큰이 무효화되었습니다. 다시 로그인하세요.' });
        }
        // 토큰 검증
        const decoded = jwt.verify(token, JWT_SECRET);
        // 토큰 만료 시간 검증 (예: 1시간)
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
            return res.status(401).json({ error: '토큰이 만료되었습니다. 다시 로그인하세요.' });
        }
        // 사용자 정보를 요청 객체에 추가
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
};
// 특정 역할이 필요한 엔드포인트 보호
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '인증이 필요합니다.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: '접근 권한이 없습니다.' });
        }
        next();
    };
};
// 로그아웃 시 토큰 무효화 (블랙리스트에 추가)
export const invalidateToken = (token) => {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
        // 토큰 만료 시간까지만 블랙리스트에 보관
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
            tokenCache.set(`blacklist:${token}`, true, ttl);
            return true;
        }
    }
    return false;
};
