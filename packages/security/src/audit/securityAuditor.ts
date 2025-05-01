/**
 * 지속적인 보안 감사 프레임워크
 * 
 * 이 모듈은 모든 종속성의 보안 상태를 지속적으로 모니터링하고,
 * 취약점이 발견되면 자동으로 알림을 생성합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as semver from 'semver';

// 취약점 데이터베이스 인터페이스
interface Vulnerability {
  id: string;
  packageName: string;
  affectedVersions: string;
  patchedVersions: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  references: string[];
  createdAt: Date;
}

// 감사 결과 인터페이스
interface AuditResult {
  vulnerabilities: {
    [packageName: string]: Vulnerability[];
  };
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  patchable: string[];
  unpatchable: string[];
}

/**
 * 특정 패키지의 취약점을 확인
 */
function checkPackageVulnerabilities(packageName: string, version: string): Vulnerability[] {
  // 실제 구현에서는 취약점 데이터베이스 API를 호출하거나 로컬 데이터베이스를 참조
  // 간단한 예시로 하드코딩된 몇 가지 취약점을 반환
  
  const knownVulnerabilities: Vulnerability[] = [
    {
      id: 'CVE-2023-42282',
      packageName: 'ip',
      affectedVersions: '<2.0.0',
      patchedVersions: '>=2.0.0',
      description: 'ip 패키지의 isPrivate 함수가 일부 프라이빗 IP를 퍼블릭으로 잘못 식별',
      severity: 'high',
      references: ['https://github.com/advisories/GHSA-2p57-rm9w-gvfp'],
      createdAt: new Date('2023-09-20')
    },
    {
      id: 'CVE-2023-42283',
      packageName: 'ip',
      affectedVersions: '<2.0.0',
      patchedVersions: '>=2.0.0',
      description: 'ip 패키지의 isPublic 함수 SSRF 취약점',
      severity: 'high',
      references: ['https://github.com/advisories/GHSA-78xj-cgh5-2h22'],
      createdAt: new Date('2023-09-20')
    }
    // 더 많은 취약점 정보...
  ];
  
  // 특정 패키지에 관련된 취약점만 필터링
  return knownVulnerabilities.filter(vuln => {
    if (vuln.packageName !== packageName) return false;
    
    // 현재 버전이 취약한 버전 범위에 속하는지 확인
    try {
      return semver.satisfies(version, vuln.affectedVersions);
    } catch (err) {
      console.error(`버전 비교 중 오류: ${err}`);
      return false;
    }
  });
}

/**
 * 종속성 트리 스캔
 */
function scanDependencyTree(baseDir: string): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const dependencies = new Map<string, string>();
    
    // npm ls --all --json 명령을 실행하여 모든 종속성 정보 가져오기
    exec('npm ls --all --json', {
      cwd: baseDir,
      maxBuffer: 1024 * 1024 * 10 // 10MB 버퍼 (큰 프로젝트용)
    }, (error, stdout) => {
      if (error && !stdout) {
        // 오류가 있지만 출력이 없는 경우만 실패로 처리
        return reject(error);
      }
      
      try {
        const parsedResult = JSON.parse(stdout);
        
        // 재귀적으로 종속성 추출 - 함수를 블록 외부로 이동
        const extractDependencies = (deps: any) => {
          if (!deps) return;
          
          for (const [name, info] of Object.entries(deps)) {
            if (typeof info === 'object' && info !== null && 'version' in info) {
              dependencies.set(name, info.version as string);
              
              // 타입 안전하게 dependencies 속성 확인
              const infoObj = info as object & Record<string, unknown>;
              if ('dependencies' in infoObj && typeof infoObj['dependencies'] === 'object' && infoObj['dependencies'] !== null) {
                extractDependencies(infoObj['dependencies']);
              }
            }
          }
        };
        
        if (parsedResult && parsedResult.dependencies) {
          extractDependencies(parsedResult.dependencies);
        }
        
        resolve(dependencies);
      } catch (err) {
        reject(new Error(`종속성 트리 파싱 중 오류: ${err}`));
      }
    });
  });
}

/**
 * npm audit 명령 실행 및 결과 파싱
 */
function runNpmAudit(baseDir: string): Promise<any> {
  return new Promise((resolve, reject) => {
    exec('npm audit --json', {
      cwd: baseDir
    }, (error, stdout) => {
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`npm audit 결과 파싱 중 오류: ${err}`));
      }
    });
  });
}

/**
 * 모든 프로젝트의 종속성 감사
 */
export async function auditAllDependencies(baseDir?: string): Promise<AuditResult> {
  console.log('🔍 모든 종속성에 대한 보안 감사 시작...');
  
  const result: AuditResult = {
    vulnerabilities: {},
    summary: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    patchable: [],
    unpatchable: []
  };
  
  try {
    // 기본 디렉토리 설정
    const workingDir = baseDir || process.cwd();
    
    // 두 가지 방법으로 취약점 분석
    // 1. 내부 취약점 데이터베이스 사용
    const dependencies = await scanDependencyTree(workingDir);
    console.log(`📦 총 ${dependencies.size}개의 종속성이 발견되었습니다.`);
    
    // 각 종속성에 대해 취약점 확인
    // Iterator 문제를 해결하기 위해 Array.from 사용
    for (const entry of Array.from(dependencies.entries())) {
      const packageName = entry[0];
      const version = entry[1];
      const vulnerabilities = checkPackageVulnerabilities(packageName, version);
      
      if (vulnerabilities.length > 0) {
        result.vulnerabilities[packageName] = vulnerabilities;
        
        // 요약 업데이트
        result.summary.total += vulnerabilities.length;
        
        vulnerabilities.forEach(vuln => {
          result.summary[vuln.severity]++;
          
          // 패치 가능한지 확인
          if (vuln.patchedVersions && !result.patchable.includes(packageName)) {
            result.patchable.push(packageName);
          } else if (!result.unpatchable.includes(packageName)) {
            result.unpatchable.push(packageName);
          }
        });
      }
    }
    
    // 2. npm audit 사용 (추가적인 취약점 탐지)
    try {
      const auditResult = await runNpmAudit(workingDir);
      
      if (auditResult && auditResult.vulnerabilities) {
        for (const [packageName, vulnInfo] of Object.entries(auditResult.vulnerabilities)) {
          // npm audit 결과 처리
          const info = vulnInfo as any;
          if (!result.vulnerabilities[packageName]) {
            result.vulnerabilities[packageName] = [];
          }
          
          // npm audit 결과를 내부 형식으로 변환
          if (info.via && Array.isArray(info.via)) {
            info.via.forEach((v: any) => {
              if (typeof v === 'object' && v.url) {
                const vuln: Vulnerability = {
                  id: v.source || v.name || 'UNKNOWN',
                  packageName: packageName,
                  affectedVersions: v.range || '<current',
                  patchedVersions: v.versions?.join(', ') || 'unknown',
                  description: v.title || v.url,
                  severity: v.severity || 'high',
                  references: [v.url],
                  createdAt: new Date()
                };
                
                result.vulnerabilities[packageName].push(vuln);
                result.summary.total++;
                result.summary[vuln.severity]++;
              }
            });
          }
        }
      }
    } catch (auditErr) {
      console.warn('npm audit 실행 중 경고:', auditErr);
      // npm audit 실패는 전체 프로세스를 실패시키지 않음
    }
    
    console.log('✅ 종속성 감사가 완료되었습니다.');
    return result;
    
  } catch (err) {
    console.error('종속성 감사 중 오류:', err);
    throw err;
  }
}

/**
 * 감사 결과를 HTML 보고서로 변환
 */
export function generateAuditReport(result: AuditResult): string {
  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(process.cwd(), `security-audit-report-${reportDate}.html`);
  
  // HTML 보고서 생성
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>보안 감사 보고서 - ${reportDate}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; width: 150px; text-align: center; }
    .critical { background-color: #f8d7da; border-color: #f5c6cb; }
    .high { background-color: #fff3cd; border-color: #ffeeba; }
    .medium { background-color: #d1ecf1; border-color: #bee5eb; }
    .low { background-color: #d4edda; border-color: #c3e6cb; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .severity-tag { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; }
    .critical-tag { background-color: #dc3545; color: white; }
    .high-tag { background-color: #ffc107; }
    .medium-tag { background-color: #17a2b8; color: white; }
    .low-tag { background-color: #28a745; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>보안 감사 보고서</h1>
    <p>생성 날짜: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <div class="card">
      <h3>총 취약점</h3>
      <h2>${result.summary.total}</h2>
    </div>
    <div class="card critical">
      <h3>심각</h3>
      <h2>${result.summary.critical}</h2>
    </div>
    <div class="card high">
      <h3>높음</h3>
      <h2>${result.summary.high}</h2>
    </div>
    <div class="card medium">
      <h3>중간</h3>
      <h2>${result.summary.medium}</h2>
    </div>
    <div class="card low">
      <h3>낮음</h3>
      <h2>${result.summary.low}</h2>
    </div>
  </div>
  
  <h2>취약점 상세</h2>
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
      ${Object.entries(result.vulnerabilities)
        .flatMap(([packageName, vulns]) =>
          vulns.map(vuln => `
            <tr>
              <td>${packageName}</td>
              <td>
                ${vuln.references && vuln.references.length > 0 
                  ? `<a href="${vuln.references[0]}" target="_blank">${vuln.id}</a>`
                  : vuln.id}
              </td>
              <td>
                <span class="severity-tag ${vuln.severity}-tag">
                  ${vuln.severity}
                </span>
              </td>
              <td>${vuln.description}</td>
              <td>${vuln.patchedVersions}</td>
            </tr>
          `).join('')
        ).join('')}
    </tbody>
  </table>
  
  <h2>권장 조치</h2>
  <ul>
    ${result.patchable.length > 0 ? 
      `<li>다음 패키지를 최신 버전으로 업데이트하세요: ${result.patchable.join(', ')}</li>` : ''}
    ${result.unpatchable.length > 0 ? 
      `<li>다음 패키지는 패치가 없으니 대체 패키지를 찾거나 사용 제한을 고려하세요: ${result.unpatchable.join(', ')}</li>` : ''}
    <li>중앙 보안 모듈에서 제공하는 안전한 구현을 사용하세요.</li>
    <li>지속적인 보안 모니터링을 위해 정기적인 감사를 설정하세요.</li>
  </ul>
</body>
</html>
  `;
  
  // 보고서 파일 저장
  fs.writeFileSync(reportPath, html);
  
  console.log(`✅ 보안 감사 보고서가 ${reportPath}에 생성되었습니다.`);
  
  return reportPath;
}

/**
 * 특정 패키지가 취약한지 확인
 */
export function isPackageVulnerable(packageName: string, version: string): boolean {
  const vulnerabilities = checkPackageVulnerabilities(packageName, version);
  return vulnerabilities.length > 0;
}

/**
 * 지속적인 감사 일정 설정
 */
export function scheduleRegularAudits(intervalHours = 24, baseDir?: string): NodeJS.Timeout {
  console.log(`🔄 ${intervalHours}시간마다 정기적인 보안 감사를 설정합니다.`);
  
  // 최초 감사 실행
  auditAllDependencies(baseDir)
    .then(generateAuditReport)
    .catch(err => console.error('초기 감사 실행 중 오류:', err));
  
  // 정기적인 감사 설정
  return setInterval(() => {
    console.log('🔄 예약된 보안 감사 시작...');
    auditAllDependencies(baseDir)
      .then(generateAuditReport)
      .catch(err => console.error('예약된 감사 실행 중 오류:', err));
  }, intervalHours * 60 * 60 * 1000);
}

export default {
  auditAllDependencies,
  generateAuditReport,
  scheduleRegularAudits,
  isPackageVulnerable
};