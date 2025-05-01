/**
 * Enhanced API Client with React Query integration
 * 
 * 이 모듈은 기존의 API 클라이언트를 React Query와 통합하여
 * 캐싱, 데이터 동기화, 오프라인 지원 등의 기능을 강화합니다.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api/api-client';
import { indexedDBStorage } from '../utils/indexedDBUtils';

/**
 * API 응답을 캐시에 저장하기 위한 유틸리티 함수
 */
const persistQueryData = async (queryKey, data) => {
  try {
    await indexedDBStorage.setItem(`query_${JSON.stringify(queryKey)}`, {
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Query 데이터 캐싱 실패:', error);
  }
};

/**
 * 캐시에서 API 응답 가져오기 위한 유틸리티 함수
 */
const getPersistedQueryData = async (queryKey) => {
  try {
    return await indexedDBStorage.getItem(`query_${JSON.stringify(queryKey)}`);
  } catch (error) {
    console.error('캐시된 Query 데이터 로드 실패:', error);
    return null;
  }
};

/**
 * API GET 요청을 위한 React Query 훅
 * 
 * @param {string} url - API 엔드포인트 URL
 * @param {object} options - 추가 옵션 (React Query 옵션 포함)
 * @returns {object} React Query useQuery 결과
 */
export const useApiQuery = (url, options = {}) => {
  const { 
    params = {}, 
    config = {},
    queryKey = [url, params],
    enabled = true,
    staleTime,
    cacheTime,
    ...queryOptions 
  } = options;

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        // 온라인 상태인 경우 API 호출
        const response = await apiClient.get(url, { params, ...config });
        
        // 응답 데이터 캐싱
        await persistQueryData(queryKey, response.data);
        
        return response.data;
      } catch (error) {
        // 오프라인이거나 API 호출 실패 시 캐시 데이터 사용
        if (!navigator.onLine) {
          const cachedData = await getPersistedQueryData(queryKey);
          if (cachedData) {
            console.log('오프라인 모드: 캐시된 데이터 사용', url);
            return cachedData.data;
          }
        }
        
        throw error;
      }
    },
    enabled,
    staleTime,
    cacheTime,
    ...queryOptions
  });
};

/**
 * API POST 요청을 위한 React Query 훅
 * 
 * @param {string} url - API 엔드포인트 URL
 * @param {object} options - 추가 옵션 (React Query 옵션 포함)
 * @returns {object} React Query useMutation 결과
 */
export const useApiMutation = (url, options = {}) => {
  const queryClient = useQueryClient();
  const { 
    config = {},
    invalidateQueries = [],
    onSuccess: onSuccessCallback,
    ...mutationOptions 
  } = options;

  return useMutation({
    mutationFn: async (data) => {
      // 오프라인 상태인 경우 요청 큐에 추가
      if (!navigator.onLine) {
        console.log('오프라인 모드: 요청 큐에 추가됨', url, data);
        await indexedDBStorage.setItem(`mutation_${Date.now()}`, {
          url,
          method: 'post',
          data,
          config,
          timestamp: Date.now()
        });
        
        throw new Error('현재 오프라인 상태입니다. 요청이 큐에 저장되었으며 온라인 상태가 되면 처리됩니다.');
      }
      
      const response = await apiClient.post(url, data, config);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // 지정된 쿼리 무효화
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      // 사용자 정의 성공 콜백 실행
      if (onSuccessCallback) {
        onSuccessCallback(data, variables, context);
      }
    },
    ...mutationOptions
  });
};

/**
 * API PUT 요청을 위한 React Query 훅
 */
export const useApiPutMutation = (url, options = {}) => {
  const queryClient = useQueryClient();
  const { 
    config = {},
    invalidateQueries = [],
    onSuccess: onSuccessCallback,
    ...mutationOptions 
  } = options;

  return useMutation({
    mutationFn: async (data) => {
      // 오프라인 상태 처리
      if (!navigator.onLine) {
        console.log('오프라인 모드: 요청 큐에 추가됨', url, data);
        await indexedDBStorage.setItem(`mutation_${Date.now()}`, {
          url,
          method: 'put',
          data,
          config,
          timestamp: Date.now()
        });
        
        throw new Error('현재 오프라인 상태입니다. 요청이 큐에 저장되었으며 온라인 상태가 되면 처리됩니다.');
      }
      
      const response = await apiClient.put(url, data, config);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // 지정된 쿼리 무효화
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      // 사용자 정의 성공 콜백 실행
      if (onSuccessCallback) {
        onSuccessCallback(data, variables, context);
      }
    },
    ...mutationOptions
  });
};

/**
 * API PATCH 요청을 위한 React Query 훅
 */
export const useApiPatchMutation = (url, options = {}) => {
  const queryClient = useQueryClient();
  const { 
    config = {},
    invalidateQueries = [],
    onSuccess: onSuccessCallback,
    ...mutationOptions 
  } = options;

  return useMutation({
    mutationFn: async (data) => {
      // 오프라인 상태 처리
      if (!navigator.onLine) {
        console.log('오프라인 모드: 요청 큐에 추가됨', url, data);
        await indexedDBStorage.setItem(`mutation_${Date.now()}`, {
          url,
          method: 'patch',
          data,
          config,
          timestamp: Date.now()
        });
        
        throw new Error('현재 오프라인 상태입니다. 요청이 큐에 저장되었으며 온라인 상태가 되면 처리됩니다.');
      }
      
      const response = await apiClient.patch(url, data, config);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // 지정된 쿼리 무효화
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      // 사용자 정의 성공 콜백 실행
      if (onSuccessCallback) {
        onSuccessCallback(data, variables, context);
      }
    },
    ...mutationOptions
  });
};

/**
 * API DELETE 요청을 위한 React Query 훅
 */
export const useApiDeleteMutation = (url, options = {}) => {
  const queryClient = useQueryClient();
  const { 
    config = {},
    invalidateQueries = [],
    onSuccess: onSuccessCallback,
    ...mutationOptions 
  } = options;

  return useMutation({
    mutationFn: async (params = {}) => {
      const finalConfig = { ...config };
      if (params) {
        finalConfig.params = params;
      }
      
      // 오프라인 상태 처리
      if (!navigator.onLine) {
        console.log('오프라인 모드: 요청 큐에 추가됨', url, params);
        await indexedDBStorage.setItem(`mutation_${Date.now()}`, {
          url,
          method: 'delete',
          params,
          config: finalConfig,
          timestamp: Date.now()
        });
        
        throw new Error('현재 오프라인 상태입니다. 요청이 큐에 저장되었으며 온라인 상태가 되면 처리됩니다.');
      }
      
      const response = await apiClient.delete(url, finalConfig);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // 지정된 쿼리 무효화
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      // 사용자 정의 성공 콜백 실행
      if (onSuccessCallback) {
        onSuccessCallback(data, variables, context);
      }
    },
    ...mutationOptions
  });
};

/**
 * 오프라인 모드에서 저장된 뮤테이션 요청 처리
 * 앱이 온라인 상태가 될 때 호출
 */
export const processPendingMutations = async () => {
  if (!navigator.onLine) return;
  
  try {
    // 저장된 모든 뮤테이션 키 가져오기
    const keys = await indexedDBStorage.keys();
    const mutationKeys = keys.filter(key => key.startsWith('mutation_'));
    
    if (mutationKeys.length === 0) return;
    
    console.log(`${mutationKeys.length}개의 대기 중인 API 요청 처리 중...`);
    
    // 각 뮤테이션 처리
    for (const key of mutationKeys) {
      const mutation = await indexedDBStorage.getItem(key);
      
      try {
        // 요청 메서드에 따라 처리
        let response;
        switch (mutation.method) {
          case 'post':
            response = await apiClient.post(mutation.url, mutation.data, mutation.config);
            break;
          case 'put':
            response = await apiClient.put(mutation.url, mutation.data, mutation.config);
            break;
          case 'patch':
            response = await apiClient.patch(mutation.url, mutation.data, mutation.config);
            break;
          case 'delete':
            response = await apiClient.delete(mutation.url, mutation.config);
            break;
          default:
            console.warn(`지원되지 않는 요청 메서드: ${mutation.method}`);
            continue;
        }
        
        console.log(`대기 중인 요청 처리 완료: ${mutation.method.toUpperCase()} ${mutation.url}`, response.data);
        
        // 성공적으로 처리된 뮤테이션 삭제
        await indexedDBStorage.removeItem(key);
      } catch (error) {
        console.error(`대기 중인 요청 처리 실패: ${mutation.method.toUpperCase()} ${mutation.url}`, error);
        
        // 요청이 영구적으로 실패한 경우 (예: 5xx 서버 오류가 아닌 4xx 클라이언트 오류)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          await indexedDBStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error('대기 중인 뮤테이션 처리 중 오류 발생:', error);
  }
};

// 온라인 상태가 될 때 대기 중인 뮤테이션 처리
if (typeof window !== 'undefined') {
  window.addEventListener('online', processPendingMutations);
}

// 사용자 정의 훅: 오프라인 모드 상태
export const useIsOffline = () => {
  const [isOffline, setIsOffline] = React.useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOffline;
};