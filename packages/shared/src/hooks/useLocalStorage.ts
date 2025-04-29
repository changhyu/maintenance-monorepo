import { useState, useEffect } from 'react';

/**
 * localStorage를 React state와 동기화하는 훅
 * @param key localStorage 키
 * @param initialValue 초기값 (localStorage에 데이터가 없을 때 사용)
 * @returns [storedValue, setValue] - 저장된 값과 값을 갱신하는 함수
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // 초기값 가져오기 (lazy initialization)
  const [storedValue, setStoredValue] = useState<T>(() => {
    // localStorage를 사용할 수 없는 경우 (SSR 또는 접근 권한 문제)
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // localStorage 값 설정 함수
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // useState와 유사하게 함수도 받을 수 있게 함
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // State 업데이트
      setStoredValue(valueToStore);
      
      // localStorage 업데이트
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // 다른 윈도우/탭에서의 변경 감지
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value "${event.newValue}":`, error);
        }
      } else if (event.key === key && event.newValue === null) {
        // 항목이 삭제된 경우
        setStoredValue(initialValue);
      }
    }

    // storage 이벤트 리스너 등록
    window.addEventListener('storage', handleStorageChange);
    
    // cleanup 함수
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
} 