/**
 * 보안 모듈 메인 진입점
 * 
 * 이 파일은 보안 패키지의 모든 주요 기능을 내보내어
 * 다른 애플리케이션에서 쉽게 임포트할 수 있도록 합니다.
 */

// 네트워크 보안 모듈
import safeIp from './network/safeIp';
import { 
  isLoopback, 
  isLinkLocal, 
  isReserved, 
  getLoopbackAddresses, 
  getLocalAddresses, 
  checkIpSafety 
} from './network/safeIp';

// 패치 관리 모듈
import { 
  applyAllPatches, 
  applyPatchForPackage as applyPatch 
} from './patches/patchManager';

// 보안 감사 모듈
import { 
  auditAllDependencies, 
  generateAuditReport, 
  scheduleRegularAudits,
  isPackageVulnerable
} from './audit/securityAuditor';

// 보안 입력 검증 모듈
import {
  isValidIpAddress,
  containsXssAttack,
  containsSqlInjection,
  containsCommandInjection,
  checkSsrfAttempt,
  escapeHtml,
  securityCheck,
  sanitizeInput
} from './validation/inputValidator';

// 초기화 및 설정 모듈
import { initSecurity, setupSecurityHeaders } from './init';

// 네트워크 보안 유틸리티 내보내기
export const network = {
  isPrivate: safeIp.isPrivate,
  isPublic: safeIp.isPublic,
  isLoopback,
  isLinkLocal,
  isReserved,
  getLoopbackAddresses,
  getLocalAddresses,
  checkIpSafety
};

// 패치 관리 내보내기
export const patches = {
  applyAllPatches,
  applyPatch
};

// 보안 감사 내보내기
export const audit = {
  auditAllDependencies,
  generateAuditReport,
  scheduleRegularAudits,
  isPackageVulnerable
};

// 입력 검증 내보내기
export const validation = {
  isValidIpAddress,
  containsXssAttack,
  containsSqlInjection,
  containsCommandInjection,
  checkSsrfAttempt,
  escapeHtml,
  securityCheck,
  sanitizeInput
};

// 메인 API 내보내기
export {
  initSecurity,
  setupSecurityHeaders
};

// 기본 내보내기
export default {
  network,
  patches,
  audit,
  validation,
  initSecurity,
  setupSecurityHeaders
};