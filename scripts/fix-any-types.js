/**
 * any 타입을 unknown으로 대체하는 스크립트
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ESLint 실행하여 any 타입 경고 찾기
function findAnyTypes(directory) {
  try {
    // ESLint 명령 실행
    const output = execSync(`npx eslint ${directory} --ext .ts,.tsx --format json`).toString();
    const results = JSON.parse(output);
    
    // any 타입 경고만 필터링
    const anyTypeIssues = [];
    
    results.forEach(result => {
      const filePath = result.filePath;
      
      result.messages.forEach(message => {
        if (message.ruleId === '@typescript-eslint/no-explicit-any') {
          anyTypeIssues.push({
            filePath,
            line: message.line,
            column: message.column,
            message: message.message
          });
        }
      });
    });
    
    return anyTypeIssues;
  } catch (error) {
    console.error('ESLint 실행 중 오류 발생:', error.message);
    return [];
  }
}

// 파일에서 any 타입을 unknown으로 대체
function replaceAnyWithUnknown(issues) {
  const processedFiles = new Set();
  
  issues.forEach(issue => {
    const filePath = issue.filePath;
    if (!processedFiles.has(filePath)) {
      processedFiles.add(filePath);
      
      try {
        // 파일 내용 읽기
        let content = fs.readFileSync(filePath, 'utf8');
        
        // any를 unknown으로 대체
        // 단, Record<string, any>는 Record<string, unknown>으로 변경
        content = content.replace(/Record<string, any>/g, 'Record<string, unknown>');
        
        // 일반 any 타입을 unknown으로 변경
        content = content.replace(/: any(\s*[,)])/g, ': unknown$1');
        content = content.replace(/<any>/g, '<unknown>');
        content = content.replace(/<any,/g, '<unknown,');
        content = content.replace(/,\s*any>/g, ', unknown>');
        content = content.replace(/\(\s*\)\s*=>\s*any/g, '() => unknown');
        content = content.replace(/:\s*any\[\]/g, ': unknown[]');
        
        // Function 타입에서의 any를 unknown으로 변경
        content = content.replace(/\((.*?): any\)/g, '($1: unknown)');
        
        // 변경된 내용을 파일에 저장
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`파일 업데이트됨: ${filePath}`);
      } catch (error) {
        console.error(`파일 처리 중 오류 발생: ${filePath}`, error.message);
      }
    }
  });
}

// 메인 실행 함수
function main() {
  const targetDirectory = process.argv[2] || 'packages/shared/src';
  console.log(`대상 디렉토리: ${targetDirectory}`);
  
  // any 타입 찾기
  const anyTypeIssues = findAnyTypes(targetDirectory);
  console.log(`발견된 any 타입 이슈: ${anyTypeIssues.length}개`);
  
  // any 타입을 unknown으로 대체
  if (anyTypeIssues.length > 0) {
    replaceAnyWithUnknown(anyTypeIssues);
    console.log('any 타입을 unknown으로 대체 완료');
  }
}

// 스크립트 실행
main();