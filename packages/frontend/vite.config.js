import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// 필수 환경변수 검증
const validateEnv = (env) => {
  const required = ['VITE_API_URL', 'VITE_ENVIRONMENT'];
  const missing = required.filter(key => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 현재 작업 디렉터리에서 `mode`를 기반으로 env 파일을 불러옵니다.
  const env = loadEnv(mode, process.cwd(), '');
  
  // 환경변수 검증
  validateEnv(env);
  
  const isDev = mode === 'development';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      port: parseInt(env.VITE_PORT || '3000'),
      host: env.VITE_HOST || "0.0.0.0",
      open: false,
      proxy: isDev ? {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      } : undefined
    },
    build: {
      outDir: 'build',
      sourcemap: env.VITE_DEBUG === 'true'
    },
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
      __DEBUG__: env.VITE_DEBUG === 'true',
      __ENV__: JSON.stringify(env.VITE_ENVIRONMENT)
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx'
        }
      }
    }
  };
});