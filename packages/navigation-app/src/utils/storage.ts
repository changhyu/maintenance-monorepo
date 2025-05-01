/**
 * 플랫폼에 독립적인 키-값 저장소 유틸리티
 * 웹과 네이티브 환경에서 모두 작동하는 스토리지 인터페이스
 */

// 스토리지 인터페이스
export interface StorageInterface {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

// 웹 환경 스토리지 구현 (localStorage)
class WebStorage implements StorageInterface {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}

// 메모리 기반 스토리지 구현 (fallback)
class MemoryStorage implements StorageInterface {
  private store: Record<string, string> = {};

  async getItem(key: string): Promise<string | null> {
    return this.store[key] || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store[key] = value;
  }

  async removeItem(key: string): Promise<void> {
    delete this.store[key];
  }

  async clear(): Promise<void> {
    this.store = {};
  }
}

// 환경에 맞는 스토리지 인스턴스 생성
let storageImplementation: StorageInterface;

// 웹 환경인지 확인 (window 객체 존재)
const isWeb = typeof window !== 'undefined' && window.localStorage;

// 웹 환경에서는 localStorage 사용, 그 외에는 메모리 스토리지 사용
if (isWeb) {
  storageImplementation = new WebStorage();
} else {
  // 웹 빌드시 AsyncStorage 로딩을 피하기 위해 이 부분은 제거
  storageImplementation = new MemoryStorage();
}

export const Storage = storageImplementation;