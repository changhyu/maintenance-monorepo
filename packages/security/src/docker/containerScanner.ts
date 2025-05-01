/**
 * Docker 컨테이너 보안 스캐너
 * 
 * 이 모듈은 Docker 컨테이너 이미지의 취약점을 스캔하고,
 * 도커 실행 환경의 보안 설정을 확인합니다.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// 도커 이미지 취약점 인터페이스
interface DockerVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  packageName: string;
  installedVersion: string;
  fixedVersion?: string;
  description: string;
  references: string[];
}

// 도커 이미지 스캔 결과 인터페이스
interface DockerScanResult {
  imageName: string;
  timestamp: Date;
  vulnerabilities: DockerVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  suggestedFixes: string[];
}

// 도커 보안 설정 체크 결과 인터페이스
interface DockerSecurityCheckResult {
  timestamp: Date;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn' | 'info';
    description: string;
    impact?: string;
    recommendation?: string;
  }[];
  summary: {
    pass: number;
    fail: number;
    warn: number;
    info: number;
  };
}

/**
 * Trivy 도구를 사용하여 도커 이미지 취약점 스캔
 * 참고: Trivy가 환경에 설치되어 있어야 합니다.
 */
export function scanDockerImage(imageName: string): DockerScanResult {
  console.log(`🔍 '${imageName}' 도커 이미지 스캔 중...`);
  
  // 결과 초기화
  const result: DockerScanResult = {
    imageName,
    timestamp: new Date(),
    vulnerabilities: [],
    summary: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    suggestedFixes: []
  };
  
  try {
    // Trivy를 사용하여 이미지 스캔 (JSON 형식으로 출력)
    const trivyCommand = `trivy image --format json ${imageName}`;
    
    try {
      const scanOutput = execSync(trivyCommand, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      const scanData = JSON.parse(scanOutput);
      
      // Trivy 결과 파싱
      if (scanData.Results) {
        // 이미지의 각 레이어별로 취약점 집계
        for (const layerResult of scanData.Results) {
          if (layerResult.Vulnerabilities) {
            for (const vuln of layerResult.Vulnerabilities) {
              // DockerVulnerability 형식으로 변환
              const vulnerability: DockerVulnerability = {
                id: vuln.VulnerabilityID,
                severity: vuln.Severity.toLowerCase() as any,
                packageName: vuln.PkgName,
                installedVersion: vuln.InstalledVersion,
                fixedVersion: vuln.FixedVersion,
                description: vuln.Description || vuln.Title || '설명 없음',
                references: vuln.References || []
              };
              
              // 결과에 추가
              result.vulnerabilities.push(vulnerability);
              
              // 요약 정보 갱신
              result.summary.total++;
              result.summary[vulnerability.severity]++;
              
              // 수정 가능한 취약점에 대한 조치 추가
              if (vulnerability.fixedVersion) {
                const fix = `${vulnerability.packageName}: ${vulnerability.installedVersion} → ${vulnerability.fixedVersion} 업그레이드`;
                if (!result.suggestedFixes.includes(fix)) {
                  result.suggestedFixes.push(fix);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Trivy 스캔 실패:', err);
      // Trivy가 설치되지 않은 경우 대체 메시지
      throw new Error('Trivy 도구가 설치되지 않았거나 실행 중 오류가 발생했습니다. npm install -g trivy 또는 brew install trivy로 설치하세요.');
    }
  } catch (err) {
    // 외부 도구 없이 자체 검사 수행 (제한된 기능)
    console.warn('외부 스캐너를 사용할 수 없어 기본 Docker 검사를 수행합니다.');
    performBasicDockerCheck(imageName, result);
  }
  
  console.log(`✅ '${imageName}' 이미지 스캔 완료`);
  console.log(`📊 발견된 취약점: 총 ${result.summary.total}개 (심각: ${result.summary.critical}, 높음: ${result.summary.high}, 중간: ${result.summary.medium}, 낮음: ${result.summary.low})`);
  
  return result;
}

/**
 * 외부 도구 없이 기본적인 Docker 이미지 검사 수행
 * (제한된 기능)
 */
function performBasicDockerCheck(imageName: string, result: DockerScanResult): void {
  try {
    // 이미지 정보 가져오기
    const imageInfoCommand = `docker inspect ${imageName}`;
    const imageInfoOutput = execSync(imageInfoCommand, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const imageInfo = JSON.parse(imageInfoOutput);
    
    if (imageInfo && imageInfo.length > 0) {
      // 기본 보안 모범 사례 확인
      
      // 1. ROOT 사용자 검사
      const config = imageInfo[0].Config;
      if (config && !config.User) {
        result.vulnerabilities.push({
          id: 'DOCKER-ROOT-USER',
          severity: 'medium',
          packageName: 'docker',
          installedVersion: 'N/A',
          description: '이미지가 ROOT 사용자로 실행되도록 설정되어 있습니다. 이는 컨테이너 탈출 시 호스트 시스템의 권한 상승 위험이 있습니다.',
          references: ['https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user']
        });
        
        result.summary.total++;
        result.summary.medium++;
        result.suggestedFixes.push('Dockerfile에 USER 비권한 사용자를 추가하세요.');
      }
      
      // 2. 환경 변수에 민감한 정보 검사
      if (config && config.Env) {
        const sensitivePatterns = [
          /pass(word)?=/i,
          /secret=/i,
          /key=/i,
          /token=/i,
          /api[-_]?key/i
        ];
        
        for (const env of config.Env) {
          for (const pattern of sensitivePatterns) {
            if (pattern.test(env)) {
              result.vulnerabilities.push({
                id: 'DOCKER-SECRET-ENV',
                severity: 'high',
                packageName: 'docker',
                installedVersion: 'N/A',
                description: '환경 변수에 민감한 정보(비밀번호, 키, 토큰 등)가 포함되어 있습니다.',
                references: ['https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#env']
              });
              
              result.summary.total++;
              result.summary.high++;
              result.suggestedFixes.push('Docker 시크릿, 볼륨 마운트 또는 환경 변수 주입을 통해 민감한 정보를 안전하게 관리하세요.');
              
              // 중복 알림 방지를 위해 하나만 추가 후 중단
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('기본 Docker 검사 실패:', err);
  }
}

/**
 * Dockerfiles 보안 검사
 * 주어진 Dockerfile의 보안 모범 사례 준수 여부 확인
 */
export function auditDockerfile(dockerfilePath: string): DockerSecurityCheckResult {
  console.log(`🔍 '${dockerfilePath}' Dockerfile 감사 중...`);
  
  const result: DockerSecurityCheckResult = {
    timestamp: new Date(),
    checks: [],
    summary: {
      pass: 0,
      fail: 0,
      warn: 0,
      info: 0
    }
  };
  
  try {
    // Dockerfile 읽기
    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
    const lines = dockerfileContent.split('\n');
    
    // 보안 검사 항목
    
    // 1. 베이스 이미지 및 특정 태그 확인
    const fromLine = lines.find(line => line.trimStart().startsWith('FROM'));
    if (fromLine) {
      const fromMatch = fromLine.match(/FROM\s+([^\s]+)/i);
      const baseImage = fromMatch ? fromMatch[1] : '';
      
      // latest 태그 사용 검사
      if (baseImage.endsWith(':latest') || !baseImage.includes(':')) {
        result.checks.push({
          name: '특정 이미지 태그 사용',
          status: 'fail',
          description: 'latest 태그 또는 태그 없는 베이스 이미지 사용',
          impact: '이미지의 예측 가능성과 재현성이 저하됩니다.',
          recommendation: '특정 버전 태그(예: node:16.14.2)를 사용하여 일관된 환경을 유지하세요.'
        });
        result.summary.fail++;
      } else {
        result.checks.push({
          name: '특정 이미지 태그 사용',
          status: 'pass',
          description: `특정 태그가 있는 베이스 이미지 사용: ${baseImage}`
        });
        result.summary.pass++;
      }
      
      // 공식 이미지 사용 여부 확인
      if (baseImage.includes('/') && !baseImage.startsWith('docker.io/library/')) {
        result.checks.push({
          name: '공식 이미지 사용',
          status: 'warn',
          description: '비공식 베이스 이미지 사용',
          impact: '잠재적으로 신뢰할 수 없는 소스에서 이미지를 사용할 수 있습니다.',
          recommendation: '가능하다면 공식 Docker Hub 이미지를 사용하세요.'
        });
        result.summary.warn++;
      } else {
        result.checks.push({
          name: '공식 이미지 사용',
          status: 'pass',
          description: '공식 Docker Hub 이미지 사용'
        });
        result.summary.pass++;
      }
    }
    
    // 2. 루트가 아닌 사용자로 실행 확인
    const hasUser = lines.some(line => line.trimStart().startsWith('USER') && 
                                       !line.includes('root') && 
                                       !line.includes('0:0'));
    if (hasUser) {
      result.checks.push({
        name: '비권한 사용자 실행',
        status: 'pass',
        description: '루트가 아닌 사용자로 실행 설정됨'
      });
      result.summary.pass++;
    } else {
      result.checks.push({
        name: '비권한 사용자 실행',
        status: 'fail',
        description: 'USER 지시문이 없거나 루트 사용자를 사용함',
        impact: '컨테이너 탈출 시 호스트 시스템에 대한 권한 상승 위험이 있습니다.',
        recommendation: '루트가 아닌 사용자를 생성하고 USER 지시문으로 지정하세요.'
      });
      result.summary.fail++;
    }
    
    // 3. 다단계 빌드 사용 여부 확인
    const hasMultiStage = dockerfileContent.includes('AS ') && 
                         (dockerfileContent.includes('COPY --from=') || 
                          dockerfileContent.includes('FROM ') && dockerfileContent.lastIndexOf('FROM ') > 0);
    
    if (hasMultiStage) {
      result.checks.push({
        name: '다단계 빌드 사용',
        status: 'pass',
        description: '다단계 빌드로 최종 이미지 크기 최소화'
      });
      result.summary.pass++;
    } else {
      result.checks.push({
        name: '다단계 빌드 사용',
        status: 'warn',
        description: '다단계 빌드가 사용되지 않음',
        impact: '더 큰 공격 표면과 불필요한 도구로 인해 보안 위험이 증가할 수 있습니다.',
        recommendation: '빌드 단계와 실행 단계를 분리하여 최종 이미지에는 필요한 아티팩트만 포함시키세요.'
      });
      result.summary.warn++;
    }
    
    // 4. 민감한 정보 하드코딩 확인
    const sensitivePatterns = [
      /pass(word)?=/i,
      /secret=/i,
      /token=/i,
      /api[-_]?key/i,
      /auth[-_]?key/i
    ];
    
    let hasSensitiveInfo = false;
    for (const line of lines) {
      // ENV, ARG 지시문에서 민감한 정보 검색
      if (line.trimStart().startsWith('ENV') || line.trimStart().startsWith('ARG')) {
        for (const pattern of sensitivePatterns) {
          if (pattern.test(line)) {
            hasSensitiveInfo = true;
            break;
          }
        }
      }
      
      if (hasSensitiveInfo) break;
    }
    
    if (hasSensitiveInfo) {
      result.checks.push({
        name: '민감한 정보 처리',
        status: 'fail',
        description: 'Dockerfile에 민감한 정보가 하드코딩되어 있음',
        impact: '소스 코드 저장소에 자격 증명이 노출될 위험이 있습니다.',
        recommendation: 'ARG 또는 빌드 시 --build-arg, 런타임에는 환경 변수 또는 Docker 시크릿을 사용하세요.'
      });
      result.summary.fail++;
    } else {
      result.checks.push({
        name: '민감한 정보 처리',
        status: 'pass',
        description: '민감한 정보 하드코딩이 감지되지 않음'
      });
      result.summary.pass++;
    }
    
    // 5. HEALTHCHECK 지시문 확인
    const hasHealthcheck = lines.some(line => line.trimStart().startsWith('HEALTHCHECK'));
    if (hasHealthcheck) {
      result.checks.push({
        name: 'HEALTHCHECK 구현',
        status: 'pass',
        description: 'HEALTHCHECK 지시문이 구현됨'
      });
      result.summary.pass++;
    } else {
      result.checks.push({
        name: 'HEALTHCHECK 구현',
        status: 'warn',
        description: 'HEALTHCHECK 지시문이 없음',
        impact: '컨테이너 상태 모니터링이 어려워 가용성과 복원력에 영향을 미칠 수 있습니다.',
        recommendation: '애플리케이션의 상태를 확인하는 HEALTHCHECK 지시문을 추가하세요.'
      });
      result.summary.warn++;
    }
    
    // 6. 최소 권한 설정 확인 (선택적 검사)
    if (dockerfileContent.includes('chmod') || dockerfileContent.includes('chown')) {
      result.checks.push({
        name: '파일 권한 설정',
        status: 'info',
        description: '파일 권한 설정이 발견됨, 최소 권한 원칙을 확인하세요.'
      });
      result.summary.info++;
    }
    
  } catch (err) {
    console.error(`Dockerfile 분석 오류 (${dockerfilePath}):`, err);
    
    result.checks.push({
      name: 'Dockerfile 분석',
      status: 'fail',
      description: `파일 분석 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`
    });
    result.summary.fail++;
  }
  
  console.log(`✅ '${dockerfilePath}' Dockerfile 감사 완료`);
  console.log(`📊 결과: 통과 ${result.summary.pass}, 실패 ${result.summary.fail}, 경고 ${result.summary.warn}, 정보 ${result.summary.info}`);
  
  return result;
}

/**
 * Docker-compose 파일 보안 검사
 */
export function auditDockerCompose(composeFilePath: string): DockerSecurityCheckResult {
  console.log(`🔍 '${composeFilePath}' Docker-compose 파일 감사 중...`);
  
  const result: DockerSecurityCheckResult = {
    timestamp: new Date(),
    checks: [],
    summary: {
      pass: 0,
      fail: 0,
      warn: 0,
      info: 0
    }
  };
  
  try {
    // docker-compose 파일 읽기
    const composeContent = fs.readFileSync(composeFilePath, 'utf8');
    
    // 보안 검사 항목
    
    // 1. 특권 모드 검사
    if (composeContent.includes('privileged: true')) {
      result.checks.push({
        name: '특권 모드 사용',
        status: 'fail',
        description: '컨테이너가 특권 모드로 실행됨',
        impact: '호스트 시스템에 대한 완전한 접근 권한으로 보안 위험이 크게 증가합니다.',
        recommendation: '특권 모드를 제거하고 필요한 기능만 --cap-add로 추가하세요.'
      });
      result.summary.fail++;
    } else {
      result.checks.push({
        name: '특권 모드 사용',
        status: 'pass',
        description: '특권 모드가 사용되지 않음'
      });
      result.summary.pass++;
    }
    
    // 2. 호스트 네트워크 모드 검사
    if (composeContent.includes('network_mode: "host"')) {
      result.checks.push({
        name: '호스트 네트워크 모드',
        status: 'warn',
        description: '호스트 네트워크 모드 사용',
        impact: '네트워크 격리가 제거되어 호스트 네트워크 스택에 직접 접근할 수 있습니다.',
        recommendation: '컨테이너 간 통신에는 사용자 정의 네트워크를 사용하세요.'
      });
      result.summary.warn++;
    } else {
      result.checks.push({
        name: '호스트 네트워크 모드',
        status: 'pass',
        description: '호스트 네트워크 모드가 사용되지 않음'
      });
      result.summary.pass++;
    }
    
    // 3. 민감한 정보 검사
    const sensitivePatterns = [
      /pass(word)?:/i,
      /secret:/i,
      /token:/i,
      /api[-_]?key:/i,
      /auth[-_]?key:/i
    ];
    
    let hasSensitiveInfo = false;
    for (const pattern of sensitivePatterns) {
      if (pattern.test(composeContent)) {
        hasSensitiveInfo = true;
        break;
      }
    }
    
    if (hasSensitiveInfo) {
      result.checks.push({
        name: '민감한 정보 처리',
        status: 'fail',
        description: 'Docker-compose 파일에 민감한 정보가 포함됨',
        impact: '소스 코드 저장소에 자격 증명이 노출될 위험이 있습니다.',
        recommendation: '.env 파일 또는 Docker 시크릿을 사용하여 민감한 정보를 관리하세요.'
      });
      result.summary.fail++;
    } else {
      result.checks.push({
        name: '민감한 정보 처리',
        status: 'pass',
        description: '민감한 정보가 감지되지 않음'
      });
      result.summary.pass++;
    }
    
    // 4. 볼륨 마운트 검사 (루트 디렉터리 마운트)
    if (composeContent.match(/\/:/)) {
      result.checks.push({
        name: '호스트 루트 볼륨 마운트',
        status: 'fail',
        description: '호스트의 루트 디렉터리가 마운트됨',
        impact: '컨테이너가 호스트의 전체 파일시스템에 접근할 수 있어 보안 위협이 됩니다.',
        recommendation: '필요한 특정 디렉터리만 마운트하세요.'
      });
      result.summary.fail++;
    } else {
      result.checks.push({
        name: '호스트 루트 볼륨 마운트',
        status: 'pass',
        description: '호스트 루트 디렉터리 마운트가 감지되지 않음'
      });
      result.summary.pass++;
    }
    
    // 5. 리소스 제한 검사
    const hasResourceLimits = composeContent.includes('limits:');
    if (hasResourceLimits) {
      result.checks.push({
        name: '리소스 제한 설정',
        status: 'pass',
        description: '컨테이너 리소스 제한이 설정됨'
      });
      result.summary.pass++;
    } else {
      result.checks.push({
        name: '리소스 제한 설정',
        status: 'warn',
        description: '컨테이너 리소스 제한이 없음',
        impact: '무제한 리소스 사용으로 인한 DoS 취약점 가능성',
        recommendation: '각 서비스에 CPU 및 메모리 제한을 설정하세요.'
      });
      result.summary.warn++;
    }
    
    // 6. 재시작 정책 검사
    if (composeContent.includes('restart: always') || composeContent.includes('restart: unless-stopped')) {
      result.checks.push({
        name: '재시작 정책',
        status: 'pass',
        description: '재시작 정책이 설정됨'
      });
      result.summary.pass++;
    } else {
      result.checks.push({
        name: '재시작 정책',
        status: 'info',
        description: '자동 재시작 정책이 명시적으로 설정되지 않음',
        recommendation: 'production 환경에서는 재시작 정책을 설정하는 것이 좋습니다.'
      });
      result.summary.info++;
    }
    
    // 7. 헬스체크 설정 확인
    if (composeContent.includes('healthcheck:')) {
      result.checks.push({
        name: '헬스체크 설정',
        status: 'pass',
        description: '헬스체크가 설정됨'
      });
      result.summary.pass++;
    } else {
      result.checks.push({
        name: '헬스체크 설정',
        status: 'warn',
        description: '헬스체크가 설정되지 않음',
        impact: '컨테이너 상태 모니터링이 어려워 가용성과 복원력에 영향을 미칠 수 있습니다.',
        recommendation: '중요 서비스에 대한 헬스체크를 설정하세요.'
      });
      result.summary.warn++;
    }
    
  } catch (err) {
    console.error(`Docker-compose 파일 분석 오류 (${composeFilePath}):`, err);
    
    result.checks.push({
      name: 'Docker-compose 파일 분석',
      status: 'fail',
      description: `파일 분석 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`
    });
    result.summary.fail++;
  }
  
  console.log(`✅ '${composeFilePath}' Docker-compose 파일 감사 완료`);
  console.log(`📊 결과: 통과 ${result.summary.pass}, 실패 ${result.summary.fail}, 경고 ${result.summary.warn}, 정보 ${result.summary.info}`);
  
  return result;
}

/**
 * 실행 중인 도커 컨테이너 보안 설정 감사
 */
export function auditRunningContainers(): DockerSecurityCheckResult {
  console.log('🔍 실행 중인 도커 컨테이너 감사 중...');
  
  const result: DockerSecurityCheckResult = {
    timestamp: new Date(),
    checks: [],
    summary: {
      pass: 0,
      fail: 0,
      warn: 0,
      info: 0
    }
  };
  
  try {
    // 실행 중인 모든 컨테이너 ID 가져오기
    const containerIds = execSync('docker ps -q', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    
    console.log(`📦 ${containerIds.length}개의 실행 중인 컨테이너가 발견되었습니다.`);
    
    if (containerIds.length === 0) {
      result.checks.push({
        name: '컨테이너 검사',
        status: 'info',
        description: '실행 중인 컨테이너가 없습니다.'
      });
      result.summary.info++;
      return result;
    }
    
    // 각 컨테이너 분석
    for (const containerId of containerIds) {
      if (!containerId) continue;
      
      // 컨테이너 정보 가져오기
      const containerInfoJson = execSync(`docker inspect ${containerId}`, { encoding: 'utf8' });
      const containerInfo = JSON.parse(containerInfoJson)[0];
      const containerName = containerInfo.Name.replace(/^\//, '');
      
      console.log(`📊 컨테이너 '${containerName}' (${containerId}) 검사 중...`);
      
      // 1. 특권 모드 검사
      const isPrivileged = containerInfo.HostConfig.Privileged === true;
      if (isPrivileged) {
        result.checks.push({
          name: `${containerName}: 특권 모드`,
          status: 'fail',
          description: '컨테이너가 특권 모드로 실행 중',
          impact: '호스트 시스템에 대한 완전한 접근으로 보안 위험이 매우 높습니다.',
          recommendation: '특권 모드 없이 재시작하고 필요한 기능만 --cap-add로 추가하세요.'
        });
        result.summary.fail++;
      } else {
        result.checks.push({
          name: `${containerName}: 특권 모드`,
          status: 'pass',
          description: '컨테이너가 특권 모드 없이 실행 중'
        });
        result.summary.pass++;
      }
      
      // 2. 민감한 디렉터리 마운트 검사
      const mounts = containerInfo.Mounts || [];
      const sensitiveMounts = mounts.filter((mount: { Source: string }) => {
        const source = mount.Source;
        return source === '/' || 
               source === '/etc' || 
               source === '/var' ||
               source.startsWith('/etc/') ||
               source.startsWith('/var/run/docker.sock');
      });
      
      if (sensitiveMounts.length > 0) {
        const mountPoints = sensitiveMounts.map((m: { Source: string }) => m.Source).join(', ');
        result.checks.push({
          name: `${containerName}: 민감한 볼륨 마운트`,
          status: 'fail',
          description: `민감한 호스트 경로가 마운트됨: ${mountPoints}`,
          impact: '컨테이너가 호스트의 중요 시스템 파일에 접근할 수 있습니다.',
          recommendation: '필요한 특정 파일이나 디렉터리만 마운트하세요.'
        });
        result.summary.fail++;
      } else {
        result.checks.push({
          name: `${containerName}: 민감한 볼륨 마운트`,
          status: 'pass',
          description: '민감한 볼륨 마운트가 감지되지 않음'
        });
        result.summary.pass++;
      }
      
      // 3. 네트워크 모드 확인
      const networkMode = containerInfo.HostConfig.NetworkMode;
      if (networkMode === 'host') {
        result.checks.push({
          name: `${containerName}: 네트워크 모드`,
          status: 'warn',
          description: '컨테이너가 호스트 네트워크 모드로 실행 중',
          impact: '네트워크 격리가 제거되어 호스트 네트워크 스택에 직접 접근할 수 있습니다.',
          recommendation: '컨테이너 간 통신에는 사용자 정의 네트워크를 사용하세요.'
        });
        result.summary.warn++;
      } else {
        result.checks.push({
          name: `${containerName}: 네트워크 모드`,
          status: 'pass',
          description: `네트워크 모드: ${networkMode}`
        });
        result.summary.pass++;
      }
      
      // 4. 사용자 확인
      const user = containerInfo.Config.User;
      if (!user || user === 'root' || user === '0' || user === '0:0') {
        result.checks.push({
          name: `${containerName}: 실행 사용자`,
          status: 'fail',
          description: '컨테이너가 루트 사용자로 실행 중',
          impact: '컨테이너 탈출 시 호스트 시스템에 대한 권한 상승 위험이 있습니다.',
          recommendation: 'Dockerfile에서 비권한 사용자를 설정하세요.'
        });
        result.summary.fail++;
      } else {
        result.checks.push({
          name: `${containerName}: 실행 사용자`,
          status: 'pass',
          description: `비권한 사용자(${user})로 실행 중`
        });
        result.summary.pass++;
      }
      
      // 5. 리소스 제한 확인
      const hasMemoryLimit = containerInfo.HostConfig.Memory && containerInfo.HostConfig.Memory > 0;
      const hasCpuLimit = containerInfo.HostConfig.CpuShares && containerInfo.HostConfig.CpuShares > 0;
      
      if (hasMemoryLimit && hasCpuLimit) {
        result.checks.push({
          name: `${containerName}: 리소스 제한`,
          status: 'pass',
          description: 'CPU 및 메모리 제한이 설정됨'
        });
        result.summary.pass++;
      } else {
        result.checks.push({
          name: `${containerName}: 리소스 제한`,
          status: 'warn',
          description: `리소스 제한 부분 누락: ${!hasMemoryLimit ? '메모리' : ''} ${!hasCpuLimit ? 'CPU' : ''}`,
          impact: '무제한 리소스 사용으로 인한 DoS 취약점 가능성',
          recommendation: '메모리 및 CPU 제한을 설정하세요.'
        });
        result.summary.warn++;
      }
    }
    
  } catch (err) {
    console.error('Docker 컨테이너 감사 오류:', err);
    
    result.checks.push({
      name: '컨테이너 분석',
      status: 'fail',
      description: `분석 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`
    });
    result.summary.fail++;
  }
  
  console.log('✅ Docker 컨테이너 감사 완료');
  console.log(`📊 결과: 통과 ${result.summary.pass}, 실패 ${result.summary.fail}, 경고 ${result.summary.warn}, 정보 ${result.summary.info}`);
  
  return result;
}

/**
 * 보안 감사 보고서 생성
 */
export function generateSecurityReport(
  scanResults?: DockerScanResult[],
  dockerfileResults?: DockerSecurityCheckResult[],
  composeResults?: DockerSecurityCheckResult[],
  containerResults?: DockerSecurityCheckResult
): string {
  const reportDate = new Date().toISOString().split('T')[0];
  const reportDir = path.resolve(__dirname, '../../../reports');
  
  // 보고서 디렉토리가 없으면 생성
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `docker-security-report-${reportDate}.html`);
  
  // 취약점 합계 계산
  const totalVulnerabilities = (scanResults || []).reduce((sum, result) => sum + result.summary.total, 0);
  const criticalVulnerabilities = (scanResults || []).reduce((sum, result) => sum + result.summary.critical, 0);
  const highVulnerabilities = (scanResults || []).reduce((sum, result) => sum + result.summary.high, 0);
  
  // 검사 결과 합계 계산
  const allChecks = [
    ...(dockerfileResults || []),
    ...(composeResults || []),
    containerResults
  ].filter(Boolean);
  
  const totalPass = allChecks.reduce((sum, result) => sum + (result?.summary.pass || 0), 0);
  const totalFail = allChecks.reduce((sum, result) => sum + (result?.summary.fail || 0), 0);
  const totalWarn = allChecks.reduce((sum, result) => sum + (result?.summary.warn || 0), 0);
  
  // HTML 보고서 생성
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Docker 보안 감사 보고서 - ${reportDate}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; width: 150px; text-align: center; }
    .critical { background-color: #f8d7da; border-color: #f5c6cb; }
    .high { background-color: #fff3cd; border-color: #ffeeba; }
    .warn { background-color: #fff3cd; border-color: #ffeeba; }
    .pass { background-color: #d4edda; border-color: #c3e6cb; }
    .fail { background-color: #f8d7da; border-color: #f5c6cb; }
    .section { margin-top: 40px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .severity-tag, .status-tag { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; }
    .critical-tag { background-color: #dc3545; color: white; }
    .high-tag { background-color: #ffc107; }
    .medium-tag { background-color: #17a2b8; color: white; }
    .low-tag { background-color: #28a745; color: white; }
    .pass-tag { background-color: #28a745; color: white; }
    .fail-tag { background-color: #dc3545; color: white; }
    .warn-tag { background-color: #ffc107; }
    .info-tag { background-color: #17a2b8; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Docker 보안 감사 보고서</h1>
    <p>생성 날짜: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <div class="card">
      <h3>총 취약점</h3>
      <h2>${totalVulnerabilities}</h2>
    </div>
    <div class="card critical">
      <h3>심각</h3>
      <h2>${criticalVulnerabilities}</h2>
    </div>
    <div class="card high">
      <h3>높음</h3>
      <h2>${highVulnerabilities}</h2>
    </div>
    <div class="card pass">
      <h3>통과</h3>
      <h2>${totalPass}</h2>
    </div>
    <div class="card fail">
      <h3>실패</h3>
      <h2>${totalFail}</h2>
    </div>
    <div class="card warn">
      <h3>경고</h3>
      <h2>${totalWarn}</h2>
    </div>
  </div>
  
  ${scanResults && scanResults.length > 0 ? `
  <div class="section">
    <h2>이미지 취약점 스캔 결과</h2>
    ${scanResults.map(result => `
      <h3>${result.imageName}</h3>
      <p>스캔 시간: ${result.timestamp.toLocaleString()}</p>
      ${result.summary.total === 0 ? '<p>발견된 취약점이 없습니다.</p>' : `
      <table>
        <thead>
          <tr>
            <th>패키지</th>
            <th>취약점 ID</th>
            <th>심각도</th>
            <th>설명</th>
            <th>패치된 버전</th>
          </tr>
        </thead>
        <tbody>
          ${result.vulnerabilities.map(vuln => `
            <tr>
              <td>${vuln.packageName} ${vuln.installedVersion}</td>
              <td><a href="${vuln.references[0] || '#'}" target="_blank">${vuln.id}</a></td>
              <td>
                <span class="severity-tag ${vuln.severity}-tag">
                  ${vuln.severity}
                </span>
              </td>
              <td>${vuln.description}</td>
              <td>${vuln.fixedVersion || '알 수 없음'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <h4>권장 조치</h4>
      <ul>
        ${result.suggestedFixes.map(fix => `<li>${fix}</li>`).join('')}
      </ul>
      `}
    `).join('')}
  </div>
  ` : ''}
  
  ${dockerfileResults && dockerfileResults.length > 0 ? `
  <div class="section">
    <h2>Dockerfile 보안 감사 결과</h2>
    ${dockerfileResults.map((result, index) => `
      <h3>Dockerfile #${index + 1}</h3>
      <p>검사 시간: ${result.timestamp.toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            <th>검사 항목</th>
            <th>상태</th>
            <th>설명</th>
            <th>권장 조치</th>
          </tr>
        </thead>
        <tbody>
          ${result.checks.map(check => `
            <tr>
              <td>${check.name}</td>
              <td>
                <span class="status-tag ${check.status}-tag">
                  ${check.status}
                </span>
              </td>
              <td>${check.description}</td>
              <td>${check.recommendation || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('')}
  </div>
  ` : ''}
  
  ${composeResults && composeResults.length > 0 ? `
  <div class="section">
    <h2>Docker-compose 파일 보안 감사 결과</h2>
    ${composeResults.map((result, index) => `
      <h3>Docker-compose #${index + 1}</h3>
      <p>검사 시간: ${result.timestamp.toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            <th>검사 항목</th>
            <th>상태</th>
            <th>설명</th>
            <th>권장 조치</th>
          </tr>
        </thead>
        <tbody>
          ${result.checks.map(check => `
            <tr>
              <td>${check.name}</td>
              <td>
                <span class="status-tag ${check.status}-tag">
                  ${check.status}
                </span>
              </td>
              <td>${check.description}</td>
              <td>${check.recommendation || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('')}
  </div>
  ` : ''}
  
  ${containerResults ? `
  <div class="section">
    <h2>실행 중인 컨테이너 보안 감사 결과</h2>
    <p>검사 시간: ${containerResults.timestamp.toLocaleString()}</p>
    <table>
      <thead>
        <tr>
          <th>검사 항목</th>
          <th>상태</th>
          <th>설명</th>
          <th>권장 조치</th>
        </tr>
      </thead>
      <tbody>
        ${containerResults.checks.map(check => `
          <tr>
            <td>${check.name}</td>
            <td>
              <span class="status-tag ${check.status}-tag">
                ${check.status}
              </span>
            </td>
            <td>${check.description}</td>
            <td>${check.recommendation || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  <div class="section">
    <h2>보안 강화 권장 사항</h2>
    <ul>
      <li>항상 공식 이미지를 사용하고 특정 태그를 지정하세요.</li>
      <li>다단계 빌드를 사용하여 최종 이미지 크기를 최소화하세요.</li>
      <li>민감한 정보는 Docker 시크릿이나 환경 변수를 통해 안전하게 주입하세요.</li>
      <li>특권 모드와 루트 사용자 사용을 피하세요.</li>
      <li>필요한 기능만 --cap-add로 추가하여 최소 권한 원칙을 따르세요.</li>
      <li>모든 서비스에 리소스 제한을 설정하세요.</li>
      <li>읽기 전용 파일시스템과 볼륨을 사용하여 불변성을 유지하세요.</li>
      <li>컨테이너 이미지를 정기적으로 스캔하고 취약점이 발견되면 즉시 패치하세요.</li>
    </ul>
  </div>
</body>
</html>`;

  fs.writeFileSync(reportPath, html);
  console.log(`✅ Docker 보안 감사 보고서가 생성되었습니다: ${reportPath}`);
  
  return reportPath;
}

/**
 * 주요 API 내보내기
 */
export default {
  scanDockerImage,
  auditDockerfile,
  auditDockerCompose,
  auditRunningContainers,
  generateSecurityReport
};