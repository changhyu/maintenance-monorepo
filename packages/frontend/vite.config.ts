import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
        target: 'http://localhost:9999',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:9999',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    rollupOptions: {
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
    exclude: ['@vercel/sdk'] // 일반적으로 필요하지 않은 라이브러리
  },
  // 환경변수 설정
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:9999/api/v1')
  },
});