import { useState, useEffect } from 'react';

/**
 * 로컬 스토리지에 데이터를 저장하고 접근하는 커스텀 훅
 * 
 * @template T 데이터 타입
 * @param {string} key 로컬 스토리지 키
 * @param {T} initialValue 초기값
 * @returns {[T, (value: T | ((val: T) => T)) => void]} 저장된 값과 setter 함수
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // 로컬 스토리지에서 값을 읽어오는 함수
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // 상태 초기화
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 로컬 스토리지에 값을 저장하는 함수
  const setValue = (value: T | ((val: T) => T)) => {
    if (typeof window === 'undefined') {
      console.warn(`Cannot set localStorage key "${key}" when window is undefined`);
      return;
    }

    try {
      // 함수가 전달된 경우 현재 상태를 기반으로 새 값 계산
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // 상태 업데이트
      setStoredValue(valueToStore);
      
      // 로컬 스토리지에 저장
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // 저장 이벤트 발생 (다른 탭/창과 동기화를 위함)
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // 다른 탭/창에서 변경된 내용 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    // 로컬 저장소 변경 이벤트 리스너 추가
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', () => setStoredValue(readValue()));

    // 컴포넌트 언마운트 시 정리
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', () => setStoredValue(readValue()));
    };
  }, [key, readValue]);

  return [storedValue, setValue];
}

export default useLocalStorage; 