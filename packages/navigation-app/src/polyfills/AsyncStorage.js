/**
 * AsyncStorage 웹 폴리필
 * 
 * localStorage를 사용하여 React Native의 AsyncStorage API를 흉내냅니다.
 * 웹 빌드에서만 사용되며, 네이티브 환경에서는 실제 AsyncStorage가 사용됩니다.
 */

const PREFIX = '@navigation-app:';

const AsyncStorage = {
  /**
   * 항목 저장
   * @param {string} key 
   * @param {string} value 
   * @returns {Promise<void>}
   */
  setItem: (key, value) => {
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem(PREFIX + key, value);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * 항목 가져오기
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  getItem: (key) => {
    return new Promise((resolve) => {
      resolve(localStorage.getItem(PREFIX + key));
    });
  },

  /**
   * 항목 삭제
   * @param {string} key 
   * @returns {Promise<void>}
   */
  removeItem: (key) => {
    return new Promise((resolve) => {
      localStorage.removeItem(PREFIX + key);
      resolve();
    });
  },

  /**
   * 모든 키 가져오기
   * @returns {Promise<string[]>}
   */
  getAllKeys: () => {
    return new Promise((resolve) => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(PREFIX)) {
          keys.push(key.substring(PREFIX.length));
        }
      }
      resolve(keys);
    });
  },

  /**
   * 여러 항목 일괄 저장
   * @param {Array<Array<string>>} keyValuePairs 
   * @returns {Promise<void>}
   */
  multiSet: (keyValuePairs) => {
    return new Promise((resolve, reject) => {
      try {
        keyValuePairs.forEach(([key, value]) => {
          localStorage.setItem(PREFIX + key, value);
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * 여러 항목 일괄 조회
   * @param {string[]} keys 
   * @returns {Promise<Array<Array<string>>>}
   */
  multiGet: (keys) => {
    return new Promise((resolve) => {
      const values = keys.map(key => {
        return [key, localStorage.getItem(PREFIX + key)];
      });
      resolve(values);
    });
  },

  /**
   * 여러 항목 일괄 삭제
   * @param {string[]} keys 
   * @returns {Promise<void>}
   */
  multiRemove: (keys) => {
    return new Promise((resolve) => {
      keys.forEach(key => {
        localStorage.removeItem(PREFIX + key);
      });
      resolve();
    });
  },

  /**
   * 모든 항목 삭제
   * @returns {Promise<void>}
   */
  clear: () => {
    return new Promise((resolve) => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith(PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      resolve();
    });
  },

  /**
   * 스토리지 드라이버 플러시
   * (웹에서는 아무것도 하지 않음)
   * @returns {Promise<void>}
   */
  flushGetRequests: () => {
    return Promise.resolve();
  }
};

export default AsyncStorage;