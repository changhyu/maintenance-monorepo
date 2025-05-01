import React, { createContext, useContext, useState, useEffect } from 'react';
import OfflineDataManager from '../utils/OfflineDataManager';

interface OfflineContextType {
  isOffline: boolean;
  lastSyncTime: number;
  pendingOperations: number;
  syncOperations: () => Promise<void>;
  queueOperation: (
    entity: string,
    type: 'create' | 'update' | 'delete',
    entityId: string,
    data: any
  ) => Promise<string>;
  getOfflineData: <T>(entity: string) => Promise<T[]>;
  saveOfflineData: <T>(entity: string, data: T[]) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [manager] = useState(OfflineDataManager.getInstance());

  useEffect(() => {
    const initialize = async () => {
      try {
        await manager.initialize();
        setLastSyncTime(manager.getLastSyncTime());
        setPendingOperations(manager.getPendingOperations().length);
      } catch (error) {
        console.error('오프라인 매니저 초기화 실패:', error);
      }
    };

    initialize();

    return () => {
      manager.destroy();
    };
  }, [manager]);

  const syncOperations = async () => {
    try {
      await manager.syncOperations();
      setLastSyncTime(manager.getLastSyncTime());
      setPendingOperations(manager.getPendingOperations().length);
    } catch (error) {
      console.error('동기화 실패:', error);
    }
  };

  const queueOperation = async (
    entity: string,
    type: 'create' | 'update' | 'delete',
    entityId: string,
    data: any
  ) => {
    const operationId = await manager.queueOperation(entity, type, entityId, data);
    setPendingOperations(manager.getPendingOperations().length);
    return operationId;
  };

  const getOfflineData = async <T,>(entity: string): Promise<T[]> => {
    return manager.getOfflineData<T>(entity);
  };

  const saveOfflineData = async <T,>(entity: string, data: T[]): Promise<void> => {
    await manager.saveOfflineData(entity, data);
  };

  return (
    <OfflineContext.Provider
      value={{
        isOffline,
        lastSyncTime,
        pendingOperations,
        syncOperations,
        queueOperation,
        getOfflineData,
        saveOfflineData,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineManager = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOfflineManager must be used within an OfflineProvider');
  }
  return context;
}; 