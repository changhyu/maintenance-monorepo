/**
 * JavaScript/Node.js용 Vault 헬퍼 모듈
 * 
 * 이 모듈은 애플리케이션에서 Vault에 저장된 시크릿에 쉽게 접근할 수 있도록 도와줍니다.
 * 
 * 사용 방법:
 * 1. node-vault 패키지 설치: npm install node-vault
 * 2. 환경 변수 설정: VAULT_ADDR, VAULT_TOKEN
 * 3. 이 모듈을 프로젝트에 포함시키고 시크릿에 접근
 */

const vault = require('node-vault')({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN
});

/**
 * Vault에서 시크릿을 조회합니다.
 * 
 * @param {string} path - 시크릿 경로 (예: 'api/keys')
 * @param {string} mountPoint - 마운트 포인트 (기본값: 'kv')
 * @param {string} field - 특정 필드만 조회할 경우 (기본값: 'value')
 * @returns {Promise<any>} - 시크릿 값 또는 전체 데이터 객체
 */
async function getSecret(path, mountPoint = 'kv', field = 'value') {
  try {
    const result = await vault.read(`${mountPoint}/data/${path}`);
    
    // 특정 필드만 요청한 경우
    if (field && result.data.data[field] !== undefined) {
      return result.data.data[field];
    }
    
    // 전체 데이터 반환
    return result.data.data;
  } catch (error) {
    console.error(`Error fetching secret from ${mountPoint}/data/${path}:`, error.message);
    throw new Error(`Failed to fetch secret: ${error.message}`);
  }
}

/**
 * Vault에 시크릿을 저장합니다.
 * 
 * @param {string} path - 시크릿 경로 (예: 'api/keys')
 * @param {object} data - 저장할 데이터 객체
 * @param {string} mountPoint - 마운트 포인트 (기본값: 'kv')
 * @returns {Promise<any>} - 저장 결과
 */
async function setSecret(path, data, mountPoint = 'kv') {
  try {
    return await vault.write(`${mountPoint}/data/${path}`, { data });
  } catch (error) {
    console.error(`Error storing secret at ${mountPoint}/data/${path}:`, error.message);
    throw new Error(`Failed to store secret: ${error.message}`);
  }
}

/**
 * Vault에서 시크릿을 삭제합니다.
 * 
 * @param {string} path - 시크릿 경로 (예: 'api/keys')
 * @param {string} mountPoint - 마운트 포인트 (기본값: 'kv')
 * @returns {Promise<any>} - 삭제 결과
 */
async function deleteSecret(path, mountPoint = 'kv') {
  try {
    return await vault.delete(`${mountPoint}/data/${path}`);
  } catch (error) {
    console.error(`Error deleting secret from ${mountPoint}/data/${path}:`, error.message);
    throw new Error(`Failed to delete secret: ${error.message}`);
  }
}

/**
 * 특정 경로의 모든 시크릿 키를 나열합니다.
 * 
 * @param {string} path - 시크릿 경로 (예: 'api')
 * @param {string} mountPoint - 마운트 포인트 (기본값: 'kv')
 * @returns {Promise<string[]>} - 시크릿 키 목록
 */
async function listSecrets(path, mountPoint = 'kv') {
  try {
    const result = await vault.list(`${mountPoint}/metadata/${path}`);
    return result.data.keys || [];
  } catch (error) {
    console.error(`Error listing secrets at ${mountPoint}/metadata/${path}:`, error.message);
    throw new Error(`Failed to list secrets: ${error.message}`);
  }
}

// 캐싱 기능이 있는 시크릿 접근자
const secretCache = new Map();
const DEFAULT_TTL = 300000; // 5분 (밀리초)

/**
 * 시크릿을 캐싱과 함께 조회합니다.
 * 
 * @param {string} path - 시크릿 경로
 * @param {string} field - 특정 필드 (기본값: 'value')
 * @param {number} ttl - 캐시 유효 시간(밀리초) (기본값: 5분)
 * @returns {Promise<any>} - 시크릿 값
 */
async function getCachedSecret(path, field = 'value', ttl = DEFAULT_TTL) {
  const cacheKey = `${path}:${field}`;
  
  // 캐시에 있고 만료되지 않은 경우
  if (secretCache.has(cacheKey)) {
    const cached = secretCache.get(cacheKey);
    if (cached.expiry > Date.now()) {
      return cached.value;
    }
    // 만료된 경우 캐시에서 제거
    secretCache.delete(cacheKey);
  }
  
  // 새로운 값 조회
  const value = await getSecret(path, 'kv', field);
  
  // 캐시에 저장
  secretCache.set(cacheKey, {
    value,
    expiry: Date.now() + ttl
  });
  
  return value;
}

// 모듈 내보내기
module.exports = {
  getSecret,
  setSecret,
  deleteSecret,
  listSecrets,
  getCachedSecret,
  vaultClient: vault
};
