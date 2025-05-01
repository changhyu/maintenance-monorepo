/**
 * Expo File System 폴리필
 * 웹 환경에서 파일 시스템 기능을 IndexedDB와 localStorage를 사용하여 모방합니다.
 */

// 상수 정의
export const documentDirectory = 'file://document/';
export const cacheDirectory = 'file://cache/';
export const bundleDirectory = 'file://bundle/';
export const downloadDirectory = 'file://download/';

// 권한 상태
export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

// 파일 타입
export const FileSystemSessionType = {
  BACKGROUND: 'BACKGROUND',
  FOREGROUND: 'FOREGROUND',
};

// 인코딩 타입
export const EncodingType = {
  UTF8: 'utf8',
  BASE64: 'base64',
};

// 에러 클래스
class FileSystemError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FileSystemError';
    this.code = code;
  }
}

// IndexedDB 접근을 위한 헬퍼 함수
const getDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new FileSystemError('IndexedDB is not available', 'E_UNAVAILABLE'));
      return;
    }

    const request = window.indexedDB.open('ExpoFileSystemDB', 1);
    
    request.onerror = (event) => {
      reject(new FileSystemError('Failed to open database', 'E_DATABASE'));
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'path' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
};

// 파일 경로 정규화
const normalizePath = (path) => {
  // 모든 파일 경로를 내부 형식으로 변환
  if (!path) return '';
  
  // 슬래시로 시작하도록 정규화
  if (!path.startsWith('/') && !path.startsWith('file://')) {
    path = '/' + path;
  }
  
  // 기본 URL 구문 제거
  path = path.replace(/^file:\/\//, '/');
  
  // 중복 슬래시 제거
  return path.replace(/\/+/g, '/');
};

// 파일 메타데이터 조회
const getFileInfo = async (path) => {
  const normalizedPath = normalizePath(path);
  
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const objectStore = transaction.objectStore('files');
      const request = objectStore.get(normalizedPath);
      
      request.onerror = () => reject(new FileSystemError('File not found', 'E_NOT_FOUND'));
      
      request.onsuccess = (event) => {
        const file = event.target.result;
        if (!file) {
          reject(new FileSystemError('File not found', 'E_NOT_FOUND'));
        } else {
          resolve(file);
        }
      };
    });
  } catch (e) {
    // IndexedDB를 사용할 수 없는 경우 localStorage 사용
    const fileData = localStorage.getItem(`expo-fs:${normalizedPath}`);
    if (!fileData) {
      throw new FileSystemError('File not found', 'E_NOT_FOUND');
    }
    try {
      return JSON.parse(fileData);
    } catch (err) {
      throw new FileSystemError('Failed to parse file data', 'E_PARSE');
    }
  }
};

// 폴리필 메서드 구현
const FileSystem = {
  // 파일 읽기
  readAsStringAsync: async (path, options = {}) => {
    try {
      const { content } = await getFileInfo(path);
      return content;
    } catch (e) {
      if (e.code === 'E_NOT_FOUND') {
        throw e;
      }
      throw new FileSystemError('Failed to read file', 'E_READ');
    }
  },
  
  // 파일 쓰기
  writeAsStringAsync: async (path, content, options = {}) => {
    const normalizedPath = normalizePath(path);
    const fileData = {
      path: normalizedPath,
      content,
      size: content.length,
      modificationTime: Date.now(),
      isDirectory: false,
    };
    
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const objectStore = transaction.objectStore('files');
        const request = objectStore.put(fileData);
        
        request.onerror = () => reject(new FileSystemError('Failed to write file', 'E_WRITE'));
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      // IndexedDB 사용 불가능한 경우 localStorage 사용
      try {
        localStorage.setItem(`expo-fs:${normalizedPath}`, JSON.stringify(fileData));
        return;
      } catch (storageErr) {
        throw new FileSystemError('Failed to write file', 'E_WRITE');
      }
    }
  },
  
  // 디렉토리 생성
  makeDirectoryAsync: async (path, options = {}) => {
    const normalizedPath = normalizePath(path);
    const dirData = {
      path: normalizedPath,
      content: '',
      size: 0,
      modificationTime: Date.now(),
      isDirectory: true,
    };
    
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const objectStore = transaction.objectStore('files');
        const request = objectStore.put(dirData);
        
        request.onerror = () => reject(new FileSystemError('Failed to create directory', 'E_MKDIR'));
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      // IndexedDB 사용 불가능한 경우 localStorage 사용
      try {
        localStorage.setItem(`expo-fs:${normalizedPath}`, JSON.stringify(dirData));
        return;
      } catch (storageErr) {
        throw new FileSystemError('Failed to create directory', 'E_MKDIR');
      }
    }
  },
  
  // 파일/디렉토리 삭제
  deleteAsync: async (path, options = {}) => {
    const normalizedPath = normalizePath(path);
    
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const objectStore = transaction.objectStore('files');
        const request = objectStore.delete(normalizedPath);
        
        request.onerror = () => reject(new FileSystemError('Failed to delete file', 'E_DELETE'));
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      // IndexedDB 사용 불가능한 경우 localStorage 사용
      localStorage.removeItem(`expo-fs:${normalizedPath}`);
      return;
    }
  },
  
  // 파일 정보 가져오기
  getInfoAsync: async (path, options = {}) => {
    const normalizedPath = normalizePath(path);
    
    try {
      const fileInfo = await getFileInfo(normalizedPath);
      return {
        exists: true,
        uri: `file://${normalizedPath}`,
        size: fileInfo.size,
        modificationTime: fileInfo.modificationTime,
        isDirectory: fileInfo.isDirectory,
      };
    } catch (e) {
      if (e.code === 'E_NOT_FOUND') {
        return {
          exists: false,
          uri: `file://${normalizedPath}`,
          size: 0,
          isDirectory: false,
        };
      }
      throw e;
    }
  },
  
  // 디렉토리 내용 읽기
  readDirectoryAsync: async (path) => {
    const normalizedPath = normalizePath(path);
    const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/';
    
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const objectStore = transaction.objectStore('files');
        const request = objectStore.openCursor();
        
        const files = [];
        
        request.onerror = () => reject(new FileSystemError('Failed to read directory', 'E_READ_DIR'));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const filePath = cursor.value.path;
            if (filePath.startsWith(prefix) && filePath !== normalizedPath) {
              // 경로에서 마지막 부분(파일 이름만) 추출
              const remainingPath = filePath.substring(prefix.length);
              const fileName = remainingPath.split('/')[0];
              
              // 중복 제거
              if (!files.includes(fileName)) {
                files.push(fileName);
              }
            }
            cursor.continue();
          } else {
            resolve(files);
          }
        };
      });
    } catch (e) {
      // IndexedDB를 사용할 수 없는 경우 localStorage에서 시도
      const files = [];
      const filePrefix = `expo-fs:${prefix}`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(filePrefix)) {
          const fileName = key.substring(filePrefix.length).split('/')[0];
          if (fileName && !files.includes(fileName)) {
            files.push(fileName);
          }
        }
      }
      
      return files;
    }
  },
  
  // 파일 복사
  copyAsync: async ({ from, to }) => {
    try {
      const fileInfo = await getFileInfo(from);
      await FileSystem.writeAsStringAsync(to, fileInfo.content);
      return;
    } catch (e) {
      throw new FileSystemError('Failed to copy file', 'E_COPY');
    }
  },
  
  // 파일 이동
  moveAsync: async ({ from, to }) => {
    try {
      const fileInfo = await getFileInfo(from);
      await FileSystem.writeAsStringAsync(to, fileInfo.content);
      await FileSystem.deleteAsync(from);
      return;
    } catch (e) {
      throw new FileSystemError('Failed to move file', 'E_MOVE');
    }
  },
  
  // 파일 다운로드 - 웹 환경에서는 fetch 사용
  downloadAsync: async (uri, fileUri, options) => {
    try {
      const response = await fetch(uri, options);
      const content = await response.text();
      await FileSystem.writeAsStringAsync(fileUri, content);
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        uri: fileUri,
      };
    } catch (e) {
      throw new FileSystemError('Failed to download file', 'E_DOWNLOAD');
    }
  },
  
  // 업로드 세션 생성 - 웹 환경에서는 모의 구현
  createUploadTask: (url, fileUri, options) => {
    return {
      uploadAsync: async () => {
        try {
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          
          // 웹 환경에서 FormData로 파일 업로드 모방
          const formData = new FormData();
          formData.append(
            options?.fieldName || 'file',
            new Blob([fileContent], { type: options?.mimeType || 'application/octet-stream' }),
            fileUri.split('/').pop()
          );
          
          // 추가 양식 데이터가 있는 경우
          if (options?.parameters) {
            Object.entries(options.parameters).forEach(([key, value]) => {
              formData.append(key, value);
            });
          }
          
          const response = await fetch(url, {
            method: options?.httpMethod || 'POST',
            headers: options?.headers || {},
            body: formData,
          });
          
          const responseData = await response.json();
          
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData,
          };
        } catch (e) {
          throw new FileSystemError('Failed to upload file', 'E_UPLOAD');
        }
      },
      cancelAsync: async () => {},
    };
  },
  
  // 파일 해시 계산 - 웹 환경에서는 기본 해시만
  getHashAsync: async (fileUri, options) => {
    try {
      const content = await FileSystem.readAsStringAsync(fileUri);
      
      // 웹에서는 간단한 해시 생성
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) - hash) + content.charCodeAt(i);
        hash |= 0; // 32비트 정수로 변환
      }
      
      return hash.toString(16);
    } catch (e) {
      throw new FileSystemError('Failed to calculate hash', 'E_HASH');
    }
  },
  
  // 권한 관련 메서드 (웹 환경에서는 항상 권한 있음으로 가정)
  getPermissionsAsync: async () => ({
    granted: true,
    status: PermissionStatus.GRANTED,
  }),
  
  requestPermissionsAsync: async () => ({
    granted: true,
    status: PermissionStatus.GRANTED,
  }),
  
  // 상수
  documentDirectory,
  cacheDirectory,
  bundleDirectory,
  downloadDirectory,
};

export default FileSystem;