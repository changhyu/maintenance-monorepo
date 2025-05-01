/**
 * 미사용 변수에 언더스코어(_) 접두사를 추가하는 스크립트
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ESLint 실행하여 미사용 변수 경고 찾기
function findUnusedVariables(directory) {
  try {
    // ESLint 명령 실행
    const output = execSync(`npx eslint ${directory} --ext .ts,.tsx --format json`).toString();
    const results = JSON.parse(output);
    
    // 미사용 변수 경고만 필터링
    const unusedVarIssues = [];
    
    results.forEach(result => {
      const filePath = result.filePath;
      
      result.messages.forEach(message => {
        if (message.ruleId === '@typescript-eslint/no-unused-vars') {
          unusedVarIssues.push({
            filePath,
            line: message.line,
            column: message.column,
            message: message.message
          });
        }
      });
    });
    
    return unusedVarIssues;
  } catch (error) {
    console.error('ESLint 실행 중 오류 발생:', error.message);
    return [];
  }
}

// 파일에서 미사용 변수에 언더스코어 추가
function addUnderscoreToUnusedVariables(issues) {
  const processedFiles = new Set();
  
  issues.forEach(issue => {
    const filePath = issue.filePath;
    if (!processedFiles.has(filePath)) {
      processedFiles.add(filePath);
      
      try {
        // 파일 내용 읽기
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // ESLint 다시 실행하여 해당 파일의 모든 미사용 변수 찾기
        const fileIssues = issues.filter(i => i.filePath === filePath);
        
        // 변수 수정을 위해 파일 내용 복사
        let updatedContent = content;
        
        // 한 줄에 여러 변수가 선언된 경우 처리를 위해 먼저 정규 표현식으로 변수 이름을 추출
        fileIssues.forEach(issue => {
          const lineContent = lines[issue.line - 1];
          const match = lineContent.match(/\b(\w+)\b/g);
          
          if (match) {
            // 메시지에서 변수 이름 추출
            const varNameMatch = issue.message.match(/'([^']+)'/);
            if (varNameMatch && varNameMatch[1]) {
              const varName = varNameMatch[1];
              // 언더스코어가 이미 접두사로 있지 않은 경우에만 추가
              if (!varName.startsWith('_')) {
                const regex = new RegExp(`\\b${varName}\\b`, 'g');
                updatedContent = updatedContent.replace(regex, `_${varName}`);
              }
            }
          }
        });
        
        // 변경된 내용이 있으면 파일 업데이트
        if (updatedContent !== content) {
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          console.log(`파일 업데이트됨: ${filePath}`);
        }
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
  
  // 미사용 변수 찾기
  const unusedVarIssues = findUnusedVariables(targetDirectory);
  console.log(`발견된 미사용 변수 이슈: ${unusedVarIssues.length}개`);
  
  // 미사용 변수에 언더스코어 추가
  if (unusedVarIssues.length > 0) {
    addUnderscoreToUnusedVariables(unusedVarIssues);
    console.log('미사용 변수에 언더스코어 접두사 추가 완료');
  }
}

// 스크립트 실행
main();