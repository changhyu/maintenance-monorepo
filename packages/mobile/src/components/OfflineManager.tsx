import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EnhancedOfflineDataManager } from '../utils/EnhancedOfflineDataManager';
import { OfflineCacheService } from '../services/OfflineCacheService';
import { CacheOptimizationStrategy } from '../utils/CacheOptimizationStrategy';

/**
 * 오프라인 관리 컴포넌트
 * 
 * 앱의 오프라인 상태와 캐시를 관리합니다.
 * OfflineCacheService와 EnhancedOfflineDataManager를 통합적으로 초기화하고
 * 네트워크 연결 상태를 모니터링합니다.
 */
export const OfflineManager: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'idle' | 'error'>('idle');
  const [pendingOperations, setPendingOperations] = useState(0);
  
  useEffect(() => {
    // 향상된 오프라인 데이터 관리자 인스턴스
    const enhancedManager = EnhancedOfflineDataManager.getInstance();
    
    // 오프라인 캐시 서비스 인스턴스
    const cacheService = OfflineCacheService.getInstance();
    
    // 캐시 최적화 전략 인스턴스
    const optimizationStrategy = CacheOptimizationStrategy.getInstance();
    
    // 기본 최적화 전략 적용 (기기 성능에 따라 다른 전략 적용 가능)
    optimizationStrategy.applyStrategy('balanced');
    
    // 네트워크 상태 변경 리스너 등록
    const unsubscribe = cacheService.addNetworkStatusChangeListener(async (online) => {
      setIsOnline(online);
      
      if (online) {
        try {
          setSyncStatus('syncing');
          
          // 네트워크가 복구되면 오프라인 캐시 동기화
          await enhancedManager.synchronize({
            force: true,
            onSyncComplete: () => {
              setSyncStatus('idle');
            },
            onSyncError: (error) => {
              console.error('오프라인 데이터 동기화 오류:', error);
              setSyncStatus('error');
            }
          });
          
          // 캐시 최적화 실행
          setTimeout(() => {
            optimizationStrategy.optimizeNow()
              .catch(error => console.error('캐시 최적화 오류:', error));
          }, 5000); // 동기화 후 5초 지연 후 최적화
          
        } catch (error) {
          console.error('오프라인 데이터 동기화 중 오류:', error);
          setSyncStatus('error');
        }
      }
    });
    
    // 초기화
    const initialize = async () => {
      try {
        // 캐시 서비스 초기화
        await cacheService.initialize();
        
        // 캐시 최적화 시작
        optimizationStrategy.startOptimization();
        
        // 보류 중인 작업 갯수 모니터링
        const checkPendingOperations = () => {
          const count = enhancedManager.getPendingOperationsCount();
          setPendingOperations(count);
        };
        
        // 주기적으로 보류 중인 작업 확인
        const intervalId = setInterval(checkPendingOperations, 10000);
        
        return () => {
          clearInterval(intervalId);
          optimizationStrategy.stopOptimization();
        };
      } catch (error) {
        console.error('오프라인 관리자 초기화 오류:', error);
      }
    };
    
    initialize();
    
    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      unsubscribe();
    };
  }, []);
  
  // 오프라인 관리자는 UI를 렌더링하지 않고 백그라운드에서만 작동
  return null;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
  },
  text: {
    color: 'white',
    fontSize: 12,
  }
}); 