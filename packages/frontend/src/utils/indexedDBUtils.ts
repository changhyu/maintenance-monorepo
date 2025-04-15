/**
 * IndexedDB를 활용한 오프라인 데이터 관리 유틸리티
 * 로컬 스토리지 대신 대용량 데이터 보관과 구조화된 쿼리를 지원합니다.
 */

const DB_NAME = 'vehicleMaintenanceDB';
const DB_VERSION = 1;

// 스토어 이름 상수
export const STORES = {
  OFFLINE_MODE: 'offlineMode',
  PENDING_OPERATIONS: 'pendingOperations',
  TODOS: 'todos',
  VEHICLES: 'vehicles',
  USER_SETTINGS: 'userSettings',
  REPORTS: 'reports',
  REPORT_TEMPLATES: 'reportTemplates',
  REPORT_SCHEDULES: 'reportSchedules'
};

// IndexedDB가 지원되지 않는 환경에서 로컬 스토리지를 사용할 키 접두사
const LS_PREFIX = 'vehicleMaintenance_';

/**
 * LocalStorage에 데이터 저장 (IndexedDB 대체용)
 */
const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(data));
  } catch (error) {
    console.error('LocalStorage 저장 실패:', error);
  }
};

/**
 * LocalStorage에서 데이터 조회 (IndexedDB 대체용)
 */
const getFromLocalStorage = (key: string): any => {
  const data = localStorage.getItem(`${LS_PREFIX}${key}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('LocalStorage 데이터 파싱 실패:', error);
    return null;
  }
};

/**
 * 데이터베이스 연결 및 스키마 초기화
 * @returns Promise<IDBDatabase>
 */
export const initDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB 오류:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB 연결 성공');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 오프라인 모드 상태 저장소
      if (!db.objectStoreNames.contains(STORES.OFFLINE_MODE)) {
        db.createObjectStore(STORES.OFFLINE_MODE, { keyPath: 'id' });
      }
      
      // 오프라인 작업 큐 저장소
      if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
        const operationsStore = db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id' });
        operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        operationsStore.createIndex('method', 'method', { unique: false });
      }
      
      // Todo 항목 캐시 저장소
      if (!db.objectStoreNames.contains(STORES.TODOS)) {
        const todoStore = db.createObjectStore(STORES.TODOS, { keyPath: 'id' });
        todoStore.createIndex('vehicleId', 'vehicleId', { unique: false });
        todoStore.createIndex('status', 'status', { unique: false });
        todoStore.createIndex('dueDate', 'dueDate', { unique: false });
      }
      
      // 차량 정보 캐시 저장소
      if (!db.objectStoreNames.contains(STORES.VEHICLES)) {
        const vehicleStore = db.createObjectStore(STORES.VEHICLES, { keyPath: 'id' });
        vehicleStore.createIndex('status', 'status', { unique: false });
      }
      
      // 사용자 설정 저장소
      if (!db.objectStoreNames.contains(STORES.USER_SETTINGS)) {
        db.createObjectStore(STORES.USER_SETTINGS, { keyPath: 'key' });
      }
      
      // 보고서 저장소
      if (!db.objectStoreNames.contains(STORES.REPORTS)) {
        const reportsStore = db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
        reportsStore.createIndex('type', 'type', { unique: false });
        reportsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // 보고서 템플릿 저장소
      if (!db.objectStoreNames.contains(STORES.REPORT_TEMPLATES)) {
        const templatesStore = db.createObjectStore(STORES.REPORT_TEMPLATES, { keyPath: 'id' });
        templatesStore.createIndex('type', 'type', { unique: false });
        templatesStore.createIndex('name', 'name', { unique: false });
      }
      
      // 보고서 일정 저장소
      if (!db.objectStoreNames.contains(STORES.REPORT_SCHEDULES)) {
        const schedulesStore = db.createObjectStore(STORES.REPORT_SCHEDULES, { keyPath: 'id' });
        schedulesStore.createIndex('templateId', 'templateId', { unique: false });
        schedulesStore.createIndex('frequency', 'frequency', { unique: false });
        schedulesStore.createIndex('nextRun', 'nextRun', { unique: false });
      }
      
      console.log('IndexedDB 스키마 초기화 완료');
    };
  });
};

/**
 * 데이터 저장
 * @param storeName 저장소 이름
 * @param data 저장할 데이터
 * @returns Promise<string> 저장된 데이터의 키
 */
export const saveData = async (storeName: string, data: any): Promise<string> => {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.put(data);
    
    request.onsuccess = () => {
      resolve(request.result as string);
    };
    
    request.onerror = (event) => {
      console.error(`데이터 저장 실패 (${storeName}):`, (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    
    transaction.oncomplete = () => db.close();
  });
};

/**
 * 데이터 조회
 * @param storeName 저장소 이름
 * @param key 조회할 데이터 키
 * @returns Promise<T | null> 조회된 데이터
 */
export const getData = async <T>(storeName: string, key: string): Promise<T | null> => {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.get(key);
    
    request.onsuccess = () => {
      resolve(request.result as T || null);
    };
    
    request.onerror = (event) => {
      console.error(`데이터 조회 실패 (${storeName}):`, (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    
    transaction.oncomplete = () => db.close();
  });
};

/**
 * 모든 데이터 조회
 * @param storeName 저장소 이름
 * @returns Promise<T[]> 조회된 데이터 배열
 */
export const getAllData = async <T>(storeName: string): Promise<T[]> => {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result as T[]);
    };
    
    request.onerror = (event) => {
      console.error(`데이터 조회 실패 (${storeName}):`, (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    
    transaction.oncomplete = () => db.close();
  });
};

/**
 * 인덱스를 통한 데이터 조회
 * @param storeName 저장소 이름
 * @param indexName 인덱스 이름
 * @param value 검색할 값
 * @returns Promise<T[]> 조회된 데이터 배열
 */
export const getDataByIndex = async <T>(
  storeName: string, 
  indexName: string, 
  value: any
): Promise<T[]> => {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    const request = index.getAll(value);
    
    request.onsuccess = () => {
      resolve(request.result as T[]);
    };
    
    request.onerror = (event) => {
      console.error(`인덱스 조회 실패 (${storeName}.${indexName}):`, (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    
    transaction.oncomplete = () => db.close();
  });
};

/**
 * 데이터 삭제
 * @param storeName 저장소 이름
 * @param key 삭제할 데이터 키
 * @returns Promise<void>
 */
export const deleteData = async (storeName: string, key: string): Promise<void> => {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.delete(key);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      console.error(`데이터 삭제 실패 (${storeName}):`, (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    
    transaction.oncomplete = () => db.close();
  });
};

/**
 * 저장소 초기화 (모든 데이터 삭제)
 * @param storeName 저장소 이름
 * @returns Promise<void>
 */
export const clearStore = async (storeName: string): Promise<void> => {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.clear();
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      console.error(`저장소 초기화 실패 (${storeName}):`, (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    
    transaction.oncomplete = () => db.close();
  });
};

/**
 * 오프라인 모드 상태 저장
 * @param isOffline 오프라인 모드 여부
 * @returns Promise<void>
 */
export const setOfflineMode = async (isOffline: boolean): Promise<void> => {
  try {
    await saveData(STORES.OFFLINE_MODE, {
      id: 'offlineStatus',
      isOffline,
      timestamp: new Date().toISOString()
    });
    console.log(`오프라인 모드 ${isOffline ? '활성화' : '비활성화'} 상태가 저장되었습니다.`);
  } catch (error) {
    console.error('오프라인 모드 상태 저장 실패:', error);
    // 폴백: 로컬 스토리지 사용
    localStorage.setItem('apiOfflineMode', isOffline ? 'true' : 'false');
  }
};

/**
 * 오프라인 모드 상태 조회
 * @returns Promise<boolean> 오프라인 모드 여부
 */
export const getOfflineMode = async (): Promise<boolean> => {
  try {
    const data = await getData(STORES.OFFLINE_MODE, 'offlineStatus');
    return data ? (data as any).isOffline : false;
  } catch (error) {
    console.error('오프라인 모드 상태 조회 실패:', error);
    // 폴백: 로컬 스토리지 사용
    return localStorage.getItem('apiOfflineMode') === 'true';
  }
};

/**
 * 오프라인 작업 큐에 작업 추가
 * @param method HTTP 메소드
 * @param url 엔드포인트 URL
 * @param data 요청 데이터
 * @returns Promise<string> 작업 ID
 */
export const queueOfflineOperation = async (
  method: string, 
  url: string, 
  data?: any
): Promise<string> => {
  const id = Date.now().toString();
  const operation = {
    id,
    method,
    url,
    data,
    timestamp: new Date().toISOString()
  };
  
  try {
    await saveData(STORES.PENDING_OPERATIONS, operation);
    console.log(`오프라인 작업이 큐에 추가되었습니다: ${method} ${url}`);
    return id;
  } catch (error) {
    console.error('오프라인 작업 추가 실패:', error);
    // 폴백: 로컬 스토리지 사용
    const pendingOps = JSON.parse(localStorage.getItem('apiPendingOperations') ?? '[]');
    pendingOps.push(operation);
    localStorage.setItem('apiPendingOperations', JSON.stringify(pendingOps));
    return id;
  }
};

/**
 * 오프라인 작업 큐에서 모든 대기 작업 조회
 * @returns Promise<any[]> 대기 중인 작업 목록
 */
export const getPendingOperations = async (): Promise<any[]> => {
  try {
    return await getAllData(STORES.PENDING_OPERATIONS);
  } catch (error) {
    console.error('대기중인 작업 조회 실패:', error);
    // 폴백: 로컬 스토리지 사용
    return JSON.parse(localStorage.getItem('apiPendingOperations') ?? '[]');
  }
};

/**
 * 성공한 오프라인 작업 큐에서 제거
 * @param operationIds 제거할 작업 ID 배열
 * @returns Promise<void>
 */
export const removeOperationsFromQueue = async (operationIds: string[]): Promise<void> => {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(STORES.PENDING_OPERATIONS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_OPERATIONS);
    
    const promises = operationIds.map(id => 
      new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject();
      })
    );
    
    await Promise.all(promises);
    transaction.oncomplete = () => db.close();
    console.log(`${operationIds.length}개 작업이 큐에서 제거되었습니다.`);
  } catch (error) {
    console.error('작업 제거 실패:', error);
    // 폴백: 로컬 스토리지 사용
    try {
      const pendingOps = JSON.parse(localStorage.getItem('apiPendingOperations') ?? '[]');
      const filteredOps = pendingOps.filter((op: any) => !operationIds.includes(op.id));
      localStorage.setItem('apiPendingOperations', JSON.stringify(filteredOps));
    } catch (e) {
      console.error('로컬 스토리지 폴백 작업 제거 실패:', e);
    }
  }
};

/**
 * 오프라인 캐시에 Todo 아이템 저장/업데이트
 * @param todo Todo 아이템
 * @returns Promise<string> Todo ID
 */
export const cacheTodo = async (todo: any): Promise<string> => {
  return await saveData(STORES.TODOS, {
    ...todo,
    cachedAt: new Date().toISOString()
  });
};

/**
 * 오프라인 캐시에서 Todo 아이템 조회
 * @param id Todo ID
 * @returns Promise<any | null> Todo 아이템
 */
export const getCachedTodo = async (id: string): Promise<any | null> => {
  return await getData(STORES.TODOS, id);
};

/**
 * 오프라인 캐시에서 특정 차량의 모든 Todo 아이템 조회
 * @param vehicleId 차량 ID
 * @returns Promise<any[]> Todo 아이템 배열
 */
export const getCachedTodosByVehicle = async (vehicleId: string): Promise<any[]> => {
  return await getDataByIndex(STORES.TODOS, 'vehicleId', vehicleId);
};

/**
 * 오프라인 캐시 상태 진단
 * @returns Promise<object> 캐시 상태 정보
 */
export const getDiagnostics = async (): Promise<any> => {
  try {
    const db = await initDatabase();
    const result: any = {
      database: DB_NAME,
      version: DB_VERSION,
      stores: {}
    };
    
    for (const store of Object.values(STORES)) {
      try {
        const items = await getAllData(store);
        result.stores[store] = {
          count: items.length,
          sizeEstimate: JSON.stringify(items).length,
        };
      } catch (error) {
        result.stores[store] = { error: (error as Error).message };
      }
    }
    
    db.close();
    return result;
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/**
 * JSON 파일에서 데이터 가져오기
 * @param file JSON 파일
 * @returns 성공 여부 반환
 */
export const importDataFromJSON = async (file: File): Promise<boolean> => {
  try {
    // 파일 내용 읽기
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('파일 읽기 실패'));
        }
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsText(file);
    });

    // JSON 파싱
    const data = JSON.parse(fileContent);
    
    // 유효한 데이터 구조 확인
    if (!data || typeof data !== 'object') {
      throw new Error('유효하지 않은 JSON 형식');
    }

    // DB 초기화
    await initDatabase();

    // 각 스토어에 데이터 저장
    const storeNames = Object.values(STORES);
    let importedCount = 0;

    for (const storeName of storeNames) {
      if (data[storeName] && Array.isArray(data[storeName])) {
        for (const item of data[storeName]) {
          if (item && typeof item === 'object' && 'id' in item) {
            await saveData(storeName, item);
            importedCount++;
          }
        }
      }
    }

    console.log(`${importedCount}개 항목을 가져왔습니다`);
    return true;
  } catch (error) {
    console.error('JSON에서 데이터 가져오기 실패:', error);
    throw error;
  }
};

/**
 * LocalStorage에서 데이터 가져오기
 * @returns 성공 여부 반환
 */
export const importFromLocalStorage = async (): Promise<boolean> => {
  try {
    // LocalStorage에서 데이터 가져오기
    const storeNames = Object.values(STORES);
    let importedCount = 0;

    await initDatabase();

    for (const storeName of storeNames) {
      // 해당 스토어에 연결된 LocalStorage 키 찾기
      const prefix = `${LS_PREFIX}_${storeName}_`;
      
      // 모든 LocalStorage 키 순회
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith(prefix)) {
          // ID 추출 (prefix_ID 형식)
          const id = key.substring(prefix.length);
          
          // 데이터 추출
          const data = getFromLocalStorage(storeName);
          
          if (data) {
            await saveData(storeName, data);
            importedCount++;
          }
        }
      }
    }

    console.log(`LocalStorage에서 ${importedCount}개 항목을 가져왔습니다`);
    return true;
  } catch (error) {
    console.error('LocalStorage에서 데이터 가져오기 실패:', error);
    throw error;
  }
};

/**
 * 원본 스토어에서 대상 스토어로 데이터 병합
 * @param sourceStore 원본 스토어 이름
 * @param targetStore 대상 스토어 이름
 * @returns 병합된 항목 수
 */
export const mergeStores = async (sourceStore: string, targetStore: string): Promise<number> => {
  try {
    // 유효한 스토어인지 확인
    const storeNames = Object.values(STORES);
    if (!storeNames.includes(sourceStore as any) || !storeNames.includes(targetStore as any)) {
      throw new Error('유효하지 않은 스토어 이름');
    }

    // 같은 스토어인 경우 오류
    if (sourceStore === targetStore) {
      throw new Error('원본과 대상 스토어가 동일합니다');
    }

    // DB 초기화
    await initDatabase();

    // 원본 스토어의 모든 데이터 가져오기
    const sourceData = await getAllData(sourceStore) as Record<string, any>[];
    const targetData = await getAllData(targetStore) as Record<string, any>[];
    
    if (!sourceData || !targetData) {
      throw new Error(`스토어 데이터를 가져오는데 실패했습니다.`);
    }
    
    // 타겟 스토어의 기존 ID 목록
    const existingIds = targetData.map(item => String(item.id));
    
    // 중복되지 않는 항목만 저장
    let mergedCount = 0;
    
    // 타입 안전성을 위한 타입 가드 함수
    function isValidStoreItem(item: unknown): item is Record<string, any> {
      return item !== null && typeof item === 'object' && 'id' in (item as object);
    }
    
    // sourceData가 배열인지 확인하고 각 항목을 처리
    const items = Array.isArray(sourceData) ? sourceData : [];
    for (const item of items) {
      if (isValidStoreItem(item) && 
          !existingIds.includes(String(item.id))) {
        await saveData(targetStore, item);
        mergedCount++;
      }
    }

    console.log(`${sourceStore}에서 ${targetStore}로 ${mergedCount}개 항목을 병합했습니다`);
    return mergedCount;
  } catch (error) {
    console.error('스토어 병합 실패:', error);
    throw error;
  }
};

/**
 * 보고서 템플릿 조회
 * @returns Promise<any[]> 조회된 템플릿 배열
 */
export const getReportTemplates = async (): Promise<any[]> => {
  try {
    return await getAllData(STORES.REPORT_TEMPLATES);
  } catch (error) {
    console.error('보고서 템플릿 조회 실패:', error);
    return [];
  }
};

/**
 * 보고서 템플릿 저장
 * @param template 저장할 템플릿 데이터
 * @returns Promise<string> 저장된 템플릿 ID
 */
export const saveReportTemplate = async (template: any): Promise<string> => {
  try {
    // ID가 없는 경우 자동 생성
    if (!template.id) {
      template.id = `template_${Date.now()}`;
    }
    
    // 생성일이 없는 경우 현재 시간 설정
    if (!template.createdAt) {
      template.createdAt = new Date().toISOString();
    }
    
    return await saveData(STORES.REPORT_TEMPLATES, template);
  } catch (error) {
    console.error('보고서 템플릿 저장 실패:', error);
    throw error;
  }
};

/**
 * 보고서 템플릿 삭제
 * @param templateId 삭제할 템플릿 ID
 * @returns Promise<void>
 */
export const deleteReportTemplate = async (templateId: string): Promise<void> => {
  try {
    await deleteData(STORES.REPORT_TEMPLATES, templateId);
  } catch (error) {
    console.error('보고서 템플릿 삭제 실패:', error);
    throw error;
  }
};

/**
 * 보고서 일정 조회
 * @returns Promise<any[]> 조회된 일정 배열
 */
export const getReportSchedules = async (): Promise<any[]> => {
  try {
    return await getAllData(STORES.REPORT_SCHEDULES);
  } catch (error) {
    console.error('보고서 일정 조회 실패:', error);
    return [];
  }
};

/**
 * 보고서 일정 저장
 * @param schedule 저장할 일정 데이터
 * @returns Promise<string> 저장된 일정 ID
 */
export const saveReportSchedule = async (schedule: any): Promise<string> => {
  try {
    // ID가 없는 경우 자동 생성
    if (!schedule.id) {
      schedule.id = `schedule_${Date.now()}`;
    }
    
    // 생성일이 없는 경우 현재 시간 설정
    if (!schedule.createdAt) {
      schedule.createdAt = new Date().toISOString();
    }
    
    // 다음 실행 시간 계산 (미구현 상태이면 계산)
    if (!schedule.nextRun) {
      schedule.nextRun = calculateNextRunDate(schedule);
    }
    
    return await saveData(STORES.REPORT_SCHEDULES, schedule);
  } catch (error) {
    console.error('보고서 일정 저장 실패:', error);
    throw error;
  }
};

/**
 * 보고서 일정 삭제
 * @param scheduleId 삭제할 일정 ID
 * @returns Promise<void>
 */
export const deleteReportSchedule = async (scheduleId: string): Promise<void> => {
  try {
    await deleteData(STORES.REPORT_SCHEDULES, scheduleId);
  } catch (error) {
    console.error('보고서 일정 삭제 실패:', error);
    throw error;
  }
};

/**
 * 다음 실행 시간 계산
 * @param schedule 일정 데이터
 * @returns 다음 실행 시간 (ISO 문자열)
 */
export const calculateNextRunDate = (schedule: any): string => {
  const now = new Date();
  let nextRun = new Date();
  
  // 시간 설정
  nextRun.setHours(schedule.hour || 0, 0, 0, 0);
  
  // 주기에 따른 계산
  switch (schedule.frequency) {
    case 'daily':
      // 매일: 오늘 설정된 시간으로 설정 (이미 지났으면 내일)
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'weekly':
      // 매주: 지정된 요일로 설정
      const dayOfWeek = schedule.dayOfWeek === undefined ? 1 : schedule.dayOfWeek; // 기본값: 월요일
      const currentDay = nextRun.getDay();
      const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
      
      // 같은 날이면서 이미 시간이 지났거나, 다른 날인 경우
      if ((daysUntilNext === 0 && nextRun <= now) || daysUntilNext > 0) {
        nextRun.setDate(nextRun.getDate() + daysUntilNext);
      }
      break;
      
    case 'monthly':
      // 매월: 지정된 날짜로 설정
      const dayOfMonth = schedule.dayOfMonth || 1; // 기본값: 1일
      nextRun.setDate(dayOfMonth);
      
      // 이미 지난 경우 다음 달로 설정
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
      
    default:
      // 기본값: 내일
      nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun.toISOString();
};

// 데이터베이스 초기화 (애플리케이션 시작 시)
initDatabase().catch(error => console.error('IndexedDB 초기화 실패:', error));