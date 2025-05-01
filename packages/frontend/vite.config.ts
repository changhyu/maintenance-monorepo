// @ts-nocheck - 타입 체크를 일시적으로 비활성화해 충돌 방지
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'esbuild',
    rollupOptions: {
      external: ['turbo-stream', 'set-cookie-parser'],
      output: {
        manualChunks: (id) => {
          // React 관련 라이브러리
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom')) {
            return 'react';
          }
          
          // MUI 관련 라이브러리
          if (id.includes('node_modules/@mui')) {
            return 'mui';
          }
          
          // Ant Design 관련 라이브러리
          if (id.includes('node_modules/antd') || 
              id.includes('node_modules/@ant-design')) {
            return 'antd';
          }
          
          // 차트 관련 라이브러리
          if (id.includes('node_modules/chart.js') || 
              id.includes('node_modules/react-chartjs') || 
              id.includes('node_modules/@ant-design/plots')) {
            return 'charts';
          }
          
          // 유틸리티 라이브러리
          if (id.includes('node_modules/axios') || 
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/dayjs') ||
              id.includes('node_modules/moment')) {
            return 'utils';
          }
          
          // 폼 관련 라이브러리
          if (id.includes('node_modules/formik') || 
              id.includes('node_modules/yup')) {
            return 'forms';
          }
        },
        // 청크 네이밍 방식 변경
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // 사용되지 않는 CSS 제거
    cssCodeSplit: true,
    // 빌드 성능 개선
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    // gzip 압축 활성화
    target: 'es2018',
  },
  // 성능 개선 옵션
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@mui/material', 
      'antd', 
      'axios', 
      'react-router-dom'
    ],
    exclude: ['@vercel/sdk'], // 일반적으로 필요하지 않은 라이브러리
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  // 환경변수 설정
  define: {
    '__API_URL__': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000/api'),
    '__DEBUG__': process.env.NODE_ENV !== 'production',
    '__ENV__': JSON.stringify(process.env.VITE_ENVIRONMENT || 'development')
  },
});