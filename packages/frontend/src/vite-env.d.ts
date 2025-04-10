/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
  // 다른 환경 변수를 여기에 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 