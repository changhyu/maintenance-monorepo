import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger, format, transports } from 'winston';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 환경 변수 로드
dotenv.config();

// 로거 설정
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ]
});

// 서비스 경로 설정
const services = {
  api: {
    url: process.env['API_SERVICE_URL'] || 'http://localhost:8000',
    pathRewrite: { '^/api': '' }
  },
  ml: {
    url: process.env['ML_SERVICE_URL'] || 'http://localhost:8001',
    pathRewrite: { '^/ml': '' }
  },
  mobile: {
    url: process.env['MOBILE_API_URL'] || 'http://localhost:8002',
    pathRewrite: { '^/mobile-api': '' }
  },
  auth: {
    url: process.env['AUTH_SERVICE_URL'] || 'http://localhost:8003',
    pathRewrite: { '^/auth': '' }
  }
};

// Express 앱 생성
const app: express.Application = express();
const port = process.env['PORT'] || 4000;

// 미들웨어 설정
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));
app.use(express.json());
app.use(cookieParser());

// 인증 미들웨어
import { verifyToken } from './middleware/auth';

// 상태 체크 엔드포인트
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: Object.keys(services),
    gateway: {
      uptime: process.uptime(),
      version: process.env['npm_package_version']
    }
  });
});

// 프록시 미들웨어 설정
// API 서비스 라우팅
app.use('/api', verifyToken, createProxyMiddleware({
  target: services.api.url,
  pathRewrite: services.api.pathRewrite,
  changeOrigin: true,
  logLevel: process.env['NODE_ENV'] === 'production' ? 'error' : 'debug',
  onError: (err, req, res) => {
    logger.error(`API 서비스 프록시 오류: ${err.message}`);
    res.status(500).json({ error: 'API 서비스 연결 오류' });
  }
}));

// ML 서비스 라우팅
app.use('/ml', verifyToken, createProxyMiddleware({
  target: services.ml.url,
  pathRewrite: services.ml.pathRewrite,
  changeOrigin: true,
  logLevel: process.env['NODE_ENV'] === 'production' ? 'error' : 'debug',
  onError: (err, req, res) => {
    logger.error(`ML 서비스 프록시 오류: ${err.message}`);
    res.status(500).json({ error: 'ML 서비스 연결 오류' });
  }
}));

// 모바일 API 라우팅
app.use('/mobile-api', verifyToken, createProxyMiddleware({
  target: services.mobile.url,
  pathRewrite: services.mobile.pathRewrite,
  changeOrigin: true,
  logLevel: process.env['NODE_ENV'] === 'production' ? 'error' : 'debug',
  onError: (err, req, res) => {
    logger.error(`모바일 API 프록시 오류: ${err.message}`);
    res.status(500).json({ error: '모바일 API 서비스 연결 오류' });
  }
}));

// 인증 서비스 라우팅 (토큰 검증 없음)
app.use('/auth', createProxyMiddleware({
  target: services.auth.url,
  pathRewrite: services.auth.pathRewrite,
  changeOrigin: true,
  logLevel: process.env['NODE_ENV'] === 'production' ? 'error' : 'debug',
  onError: (err, req, res) => {
    logger.error(`인증 서비스 프록시 오류: ${err.message}`);
    res.status(500).json({ error: '인증 서비스 연결 오류' });
  }
}));

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`서버 오류: ${err.message}`);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env['NODE_ENV'] === 'production' ? undefined : err.message
  });
});

// 서버 시작
app.listen(port, () => {
  logger.info(`API 게이트웨이가 포트 ${port}에서 실행 중입니다.`);
});

// 종료 핸들러
process.on('SIGINT', () => {
  logger.info('API 게이트웨이를 종료합니다.');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error(`처리되지 않은 예외: ${err.message}`);
  process.exit(1);
});

export default app;

/**
 * API Gateway Package
 * 
 * This package provides a gateway to route requests to different microservices.
 */

export interface GatewayConfig {
  port: number;
  host: string;
  services: {
    [key: string]: {
      url: string;
      timeout: number;
    };
  };
}

/**
 * Default gateway configuration
 */
export const defaultGatewayConfig: GatewayConfig = {
  port: 8000,
  host: '0.0.0.0',
  services: {
    api: {
      url: 'http://localhost:8001',
      timeout: 30000,
    },
    mobileApi: {
      url: 'http://localhost:8002',
      timeout: 30000,
    },
    mlService: {
      url: 'http://localhost:8003',
      timeout: 60000,
    },
    documentProcessing: {
      url: 'http://localhost:8004',
      timeout: 60000,
    }
  },
};

/**
 * Initialize API gateway
 */
export function initializeGateway(config: GatewayConfig = defaultGatewayConfig): void {
  // eslint-disable-next-line no-console
  console.log('API Gateway initialized with config:', {
    port: config.port,
    host: config.host,
    services: Object.keys(config.services)
  });
}