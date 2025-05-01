#!/usr/bin/env node
/**
 * 보안 취약점 스캐닝 CLI 도구
 *
 * 사용법:
 * npm run scan -- --target=[packages|docker|code] --output=[json|console] --severity=[high|medium|low]
 */
import { program } from 'commander';
import { DependencyScanner } from '../scanners/dependency-scanner';
import { DockerScanner } from '../scanners/docker-scanner';
import { CodeScanner } from '../scanners/code-scanner';
import { formatScanResults, saveScanResults } from '../utils/result-formatter';
import { logger } from '../utils/logger';
import { getAppRoot } from '../utils/path-utils';
// CLI 옵션 설정
program
    .version('0.1.0')
    .description('차량 정비 관리 시스템 보안 취약점 스캐닝 도구')
    .option('-t, --target <type>', '스캔 대상 (packages, docker, code, all)', 'all')
    .option('-o, --output <format>', '결과 출력 형식 (json, console, html)', 'console')
    .option('-s, --severity <level>', '최소 심각도 수준 (high, medium, low)', 'medium')
    .option('-p, --path <path>', '스캔 대상 경로', getAppRoot())
    .option('--report-file <file>', '결과 보고서 파일 경로', './security-report.json')
    .option('--skip-npm', 'npm audit 스킵', false)
    .option('--skip-docker', 'Docker 스캔 스킵', false)
    .option('--skip-code', '코드 스캔 스킵', false)
    .option('--ignore <patterns>', '무시할 파일/경로 패턴 (콤마로 구분)')
    .option('--notify', '심각한 취약점 발견 시 알림 전송', false)
    .parse(process.argv);
const options = program.opts();
// 메인 함수
async function main() {
    try {
        logger.info('보안 취약점 스캐닝 시작...');
        logger.info(`스캔 대상: ${options.target}`);
        logger.info(`스캔 경로: ${options.path}`);
        const startTime = Date.now();
        const scanResults = {
            timestamp: new Date().toISOString(),
            target: options.target,
            path: options.path,
            results: {},
            summary: {
                total: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0
            }
        };
        // 스캔할 무시 패턴 처리
        const ignorePatterns = options.ignore ? options.ignore.split(',') : [];
        // 의존성 스캔
        if (['all', 'packages'].includes(options.target) && !options.skipNpm) {
            logger.info('의존성 취약점 스캔 중...');
            const dependencyScanner = new DependencyScanner(options.path, {
                ignorePatterns,
                minSeverity: options.severity
            });
            scanResults.results.dependencies = await dependencyScanner.scan();
            // 요약 업데이트
            updateSummary(scanResults, scanResults.results.dependencies);
            logger.info('의존성 스캔 완료');
        }
        // Docker 스캔
        if (['all', 'docker'].includes(options.target) && !options.skipDocker) {
            logger.info('Docker 이미지 취약점 스캔 중...');
            const dockerScanner = new DockerScanner(options.path, {
                ignorePatterns,
                minSeverity: options.severity
            });
            scanResults.results.docker = await dockerScanner.scan();
            // 요약 업데이트
            updateSummary(scanResults, scanResults.results.docker);
            logger.info('Docker 스캔 완료');
        }
        // 코드 스캔
        if (['all', 'code'].includes(options.target) && !options.skipCode) {
            logger.info('소스 코드 취약점 스캔 중...');
            const codeScanner = new CodeScanner(options.path, {
                ignorePatterns,
                minSeverity: options.severity
            });
            scanResults.results.code = await codeScanner.scan();
            // 요약 업데이트
            updateSummary(scanResults, scanResults.results.code);
            logger.info('코드 스캔 완료');
        }
        // 결과 처리
        const scanDuration = (Date.now() - startTime) / 1000;
        scanResults.duration = scanDuration;
        // 결과 출력 및 저장
        await formatScanResults(scanResults, options.output);
        if (options.output !== 'console') {
            await saveScanResults(scanResults, options.reportFile);
            logger.info(`보고서가 다음 위치에 저장되었습니다: ${options.reportFile}`);
        }
        // 심각한 취약점이 있고 알림 옵션이 활성화되었을 때 알림 전송
        if (options.notify && (scanResults.summary.critical > 0 || scanResults.summary.high > 0)) {
            await sendNotification(scanResults);
        }
        // 요약 표시
        logger.info('스캔 완료');
        logger.info(`걸린 시간: ${scanDuration.toFixed(2)}초`);
        logger.info(`총 발견된 취약점: ${scanResults.summary.total}`);
        logger.info(`  - 심각: ${scanResults.summary.critical}`);
        logger.info(`  - 높음: ${scanResults.summary.high}`);
        logger.info(`  - 중간: ${scanResults.summary.medium}`);
        logger.info(`  - 낮음: ${scanResults.summary.low}`);
        logger.info(`  - 정보: ${scanResults.summary.info}`);
        // 심각한 취약점이 있으면 종료 코드 1로 종료
        if (scanResults.summary.critical > 0 || scanResults.summary.high > 0) {
            logger.warn('심각한 취약점이 발견되었습니다!');
            process.exit(1);
        }
    }
    catch (error) {
        logger.error(`스캔 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
// 요약 정보 업데이트
function updateSummary(scanResults, results) {
    if (!results || !results.vulnerabilities)
        return;
    results.vulnerabilities.forEach((vuln) => {
        scanResults.summary.total++;
        switch (vuln.severity.toLowerCase()) {
            case 'critical':
                scanResults.summary.critical++;
                break;
            case 'high':
                scanResults.summary.high++;
                break;
            case 'medium':
                scanResults.summary.medium++;
                break;
            case 'low':
                scanResults.summary.low++;
                break;
            case 'info':
                scanResults.summary.info++;
                break;
        }
    });
}
// 알림 전송
async function sendNotification(scanResults) {
    try {
        const { NotificationService } = require('../services/notification-service');
        const notificationService = new NotificationService();
        await notificationService.send({
            subject: `[보안 경고] 심각한 취약점 발견`,
            message: `보안 스캔에서 ${scanResults.summary.critical} 개의 심각한 취약점과 ${scanResults.summary.high} 개의 높은 수준 취약점이 발견되었습니다. 보고서를 확인하세요.`,
            priority: 'high',
            data: {
                summary: scanResults.summary,
                reportPath: options.reportFile
            }
        });
        logger.info('보안 알림이 전송되었습니다.');
    }
    catch (error) {
        logger.error(`알림 전송 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// 스크립트 실행
main();
