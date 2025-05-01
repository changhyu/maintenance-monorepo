/**
 * React Native FS 웹 폴리필
 * 
 * 웹 환경에서 react-native-fs 모듈의 기능을 제한적으로 모방합니다.
 */

// 웹 환경에서 사용할 수 있는 경로 상수
const DOCUMENT_DIRECTORY_PATH = '/documents';
const DOWNLOAD_DIRECTORY_PATH = '/downloads';
const EXTERNAL_DIRECTORY_PATH = '/external';
const EXTERNAL_STORAGE_DIRECTORY_PATH = '/storage';
const TEMP_DIRECTORY_PATH = '/temp';
const PICTURES_DIRECTORY_PATH = '/pictures';
const CACHES_DIRECTORY_PATH = '/caches';
const MAIN_BUNDLE_PATH = '/bundle';

// 웹에서 LocalStorage를 활용한 간단한 파일 시스템 모킹
const fileSystem = {
  // 로컬 스토리지 접두사
  FS_PREFIX: 'react_native_fs_',

  // 파일 저장
  _saveFile(path, content) {
    try {
      localStorage.setItem(`${this.FS_PREFIX}${path}`, content);
      return true;
    } catch (e) {
      console.error(`Error saving file at path: ${path}`, e);
      return false;
    }
  },

  // 파일 읽기
  _readFile(path) {
    return localStorage.getItem(`${this.FS_PREFIX}${path}`);
  },

  // 파일 삭제
  _deleteFile(path) {
    localStorage.removeItem(`${this.FS_PREFIX}${path}`);
  },

  // 파일 존재 여부 확인
  _exists(path) {
    return localStorage.getItem(`${this.FS_PREFIX}${path}`) !== null;
  }
};

// 파일 시스템 API
const FileSystem = {
  // 디렉토리 상수
  DocumentDirectoryPath: DOCUMENT_DIRECTORY_PATH,
  DownloadDirectoryPath: DOWNLOAD_DIRECTORY_PATH,
  ExternalDirectoryPath: EXTERNAL_DIRECTORY_PATH,
  ExternalStorageDirectoryPath: EXTERNAL_STORAGE_DIRECTORY_PATH,
  TemporaryDirectoryPath: TEMP_DIRECTORY_PATH,
  PicturesDirectoryPath: PICTURES_DIRECTORY_PATH,
  CachesDirectoryPath: CACHES_DIRECTORY_PATH,
  MainBundlePath: MAIN_BUNDLE_PATH,

  // 파일 읽기
  readFile: async (path) => {
    console.warn('RNFS.readFile - simplified implementation in web environment');
    const content = fileSystem._readFile(path);
    if (content === null) {
      throw new Error(`File not found at path: ${path}`);
    }
    return content;
  },

  // 텍스트 파일로 저장
  writeFile: async (path, content, encoding = 'utf8') => {
    console.warn('RNFS.writeFile - simplified implementation in web environment');
    return fileSystem._saveFile(path, content);
  },

  // 파일 삭제
  unlink: async (path) => {
    console.warn('RNFS.unlink - simplified implementation in web environment');
    fileSystem._deleteFile(path);
    return true;
  },

  // 디렉토리 생성 (웹에서는 아무 작업도 하지 않음)
  mkdir: async (path) => {
    console.warn('RNFS.mkdir - not fully implemented in web environment');
    return true;
  },

  // 디렉토리 정보 읽기 - 웹에서는 빈 배열 반환
  readDir: async (path) => {
    console.warn('RNFS.readDir - not fully implemented in web environment');
    return [];
  },

  // 파일 정보 확인
  stat: async (path) => {
    console.warn('RNFS.stat - simplified implementation in web environment');
    const exists = fileSystem._exists(path);
    if (!exists) {
      throw new Error(`File not found at path: ${path}`);
    }
    
    const now = new Date();
    return {
      path,
      ctime: now,
      mtime: now,
      size: (fileSystem._readFile(path) || '').length,
      isFile: () => true,
      isDirectory: () => false,
    };
  },

  // 파일 존재 여부 확인
  exists: async (path) => {
    console.warn('RNFS.exists - simplified implementation in web environment');
    return fileSystem._exists(path);
  },
  
  // 다운로드 (웹에서는 새 창에서 URL 열기)
  downloadFile: (options) => {
    console.warn('RNFS.downloadFile - opening URL in new tab for web environment');
    const { fromUrl, progressDivider = 1 } = options;
    
    // 브라우저가 아닌 환경에서는 오류 반환
    if (typeof window === 'undefined') {
      return {
        jobId: 0,
        promise: Promise.reject(new Error('downloadFile requires a browser environment'))
      };
    }

    // 새 창에서 URL 열기
    window.open(fromUrl, '_blank');
    
    // 가짜 진행 상황 이벤트 생성
    const jobId = Math.floor(Math.random() * 1000);
    
    // 성공으로 간주
    const promise = Promise.resolve({ statusCode: 200, bytesWritten: 0 });
    
    return { jobId, promise };
  }
};

export default FileSystem;

// RNFS와의 호환성을 위한 추가 내보내기
export const DocumentDirectoryPath = DOCUMENT_DIRECTORY_PATH;
export const DownloadDirectoryPath = DOWNLOAD_DIRECTORY_PATH;
export const ExternalDirectoryPath = EXTERNAL_DIRECTORY_PATH;
export const ExternalStorageDirectoryPath = EXTERNAL_STORAGE_DIRECTORY_PATH;
export const TemporaryDirectoryPath = TEMP_DIRECTORY_PATH;
export const PicturesDirectoryPath = PICTURES_DIRECTORY_PATH;
export const CachesDirectoryPath = CACHES_DIRECTORY_PATH;
export const MainBundlePath = MAIN_BUNDLE_PATH;