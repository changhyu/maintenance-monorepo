/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_URL: string
  readonly VITE_APP_SOCKET_URL: string
  readonly VITE_APP_ENV: 'development' | 'production' | 'test'
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_DEBUG?: boolean
  readonly VITE_APP_LOG_LEVEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 