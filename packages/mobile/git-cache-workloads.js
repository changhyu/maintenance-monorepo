/**
 * Git 캐시 벤치마크를 위한 워크로드 생성 모듈
 * 다양한 Git 작업을 시뮬레이션하는 복잡한 워크로드 생성
 */

/**
 * Git 저장소 데이터 구조 생성
 */
function createRepositoryStructure(options = {}) {
  const {
    repoCount = 5,
    branchesPerRepo = 4,
    commitsPerBranch = 20,
    filesPerRepo = 100,
    maxFileSize = 10000,
    gitFilesRatio = 0.2,  // Git 관련 파일 비율
    largeFilesRatio = 0.1 // 대용량 파일 비율
  } = options;
  
  const repos = [];
  const branches = [];
  const commits = [];
  const files = [];
  const diffs = [];
  
  // 저장소 생성
  for (let i = 0; i < repoCount; i++) {
    const repoId = `repo-${i}`;
    repos.push({
      id: repoId,
      name: `Test Repository ${i}`,
      description: `Repository ${i} for Git cache benchmarking`,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      defaultBranch: 'main'
    });
    
    // 브랜치 생성
    const repoBranches = [];
    for (let j = 0; j < branchesPerRepo; j++) {
      const branchName = j === 0 ? 'main' : j === 1 ? 'develop' : `feature-${j}`;
      const branch = {
        repoId,
        name: branchName,
        isDefault: j === 0,
        protected: j <= 1,
        lastCommitHash: `${repoId}-${branchName}-latest`
      };
      
      branches.push(branch);
      repoBranches.push(branch);
      
      // 커밋 생성
      for (let k = 0; k < commitsPerBranch; k++) {
        const commitHash = `${repoId}-${branchName}-commit-${k}`;
        const commit = {
          hash: commitHash,
          repoId,
          branch: branchName,
          author: `user-${k % 5}`,
          message: `Commit ${k} on ${branchName}`,
          timestamp: new Date(Date.now() - (i * 86400000) - (k * 3600000)).toISOString(),
          parentHash: k > 0 ? `${repoId}-${branchName}-commit-${k-1}` : null
        };
        
        commits.push(commit);
        
        // diff 생성 (일부 커밋에만)
        if (k % 3 === 0) {
          const diffSize = 1000 + Math.floor(Math.random() * 9000);
          diffs.push({
            commitHash,
            diff: `diff --git a/file-${k} b/file-${k}\n${'x'.repeat(diffSize)}`,
            filesChanged: 1 + Math.floor(Math.random() * 5),
            size: diffSize
          });
        }
      }
      
      // 마지막 커밋 해시 업데이트
      branch.lastCommitHash = `${repoId}-${branchName}-commit-${commitsPerBranch-1}`;
    }
    
    // 파일 생성
    const repoFileCount = filesPerRepo;
    const gitFileCount = Math.floor(repoFileCount * gitFilesRatio);
    const largeFileCount = Math.floor(repoFileCount * largeFilesRatio);
    const normalFileCount = repoFileCount - gitFileCount - largeFileCount;
    
    // Git 관련 파일 생성
    for (let j = 0; j < gitFileCount; j++) {
      const path = createGitFilePath(j);
      const size = 500 + Math.floor(Math.random() * 4500);
      
      files.push({
        repoId,
        path,
        size,
        content: generateFileContent(size),
        lastModified: new Date(Date.now() - (i * 86400000) - (j * 10000)).toISOString()
      });
    }
    
    // 대용량 일반 파일 생성
    for (let j = 0; j < largeFileCount; j++) {
      const path = `src/large-files/file-${j}.dat`;
      const size = 30000 + Math.floor(Math.random() * maxFileSize);
      
      files.push({
        repoId,
        path,
        size,
        content: generateFileContent(size),
        lastModified: new Date(Date.now() - (i * 86400000) - (j * 10000)).toISOString()
      });
    }
    
    // 일반 파일 생성
    for (let j = 0; j < normalFileCount; j++) {
      const path = createNormalFilePath(j);
      const size = 100 + Math.floor(Math.random() * 4900);
      
      files.push({
        repoId,
        path,
        size,
        content: generateFileContent(size),
        lastModified: new Date(Date.now() - (i * 86400000) - (j * 10000)).toISOString()
      });
    }
  }
  
  return { repos, branches, commits, files, diffs };
}

/**
 * Git 관련 파일 경로 생성
 */
function createGitFilePath(index) {
  const category = index % 5;
  
  switch (category) {
    case 0:
      return `git/index/index-${index}.idx`;
    case 1:
      return `git/refs/heads/branch-${index}.ref`;
    case 2:
      return `git/objects/${index % 10}/${index}.obj`;
    case 3:
      return `git/logs/HEAD-${index}.log`;
    case 4:
      return `git/hooks/hook-${index}.sh`;
    default:
      return `git/misc/file-${index}.dat`;
  }
}

/**
 * 일반 파일 경로 생성
 */
function createNormalFilePath(index) {
  const category = index % 10;
  
  switch (category) {
    case 0:
    case 1:
      return `src/components/Component${index}.js`;
    case 2:
      return `src/utils/Utility${index}.js`;
    case 3:
      return `src/models/Model${index}.js`;
    case 4:
      return `tests/unit/Test${index}.test.js`;
    case 5:
      return `docs/api/api-${index}.md`;
    case 6:
      return `public/assets/asset-${index}.json`;
    case 7:
      return `config/config-${index}.json`;
    case 8:
      return `scripts/script-${index}.sh`;
    case 9:
      return `src/services/Service${index}.js`;
    default:
      return `misc/file-${index}.txt`;
  }
}

/**
 * 파일 내용 생성
 */
function generateFileContent(size) {
  return `${'x'.repeat(size)}`;
}

/**
 * 워크로드 유형
 */
const WorkloadType = {
  REPO_BROWSING: 'repo_browsing',       // 저장소 브라우징 (파일 탐색)
  BRANCH_SWITCHING: 'branch_switching', // 브랜치 전환
  COMMIT_HISTORY: 'commit_history',     // 커밋 이력 탐색
  FILE_EDITING: 'file_editing',         // 파일 편집
  LARGE_FILES: 'large_files',           // 대용량 파일 처리
  INTENSIVE_GIT: 'intensive_git'        // Git 작업 집중 (rebase, merge 등)
};

/**
 * 복잡한 워크로드 생성
 */
function generateWorkload(data, options = {}) {
  const {
    type = WorkloadType.REPO_BROWSING,
    duration = 60, // 워크로드 지속 시간 (초)
    intensity = 'medium' // 'low', 'medium', 'high'
  } = options;
  
  // 워크로드 구성 파라미터 계산
  const operationsPerSecond = getOperationRate(intensity);
  const totalOperations = duration * operationsPerSecond;
  
  // 워크로드 작업 목록
  const operations = [];
  
  switch (type) {
    case WorkloadType.REPO_BROWSING:
      generateRepoBrowsingWorkload(operations, data, totalOperations);
      break;
    case WorkloadType.BRANCH_SWITCHING:
      generateBranchSwitchingWorkload(operations, data, totalOperations);
      break;
    case WorkloadType.COMMIT_HISTORY:
      generateCommitHistoryWorkload(operations, data, totalOperations);
      break;
    case WorkloadType.FILE_EDITING:
      generateFileEditingWorkload(operations, data, totalOperations);
      break;
    case WorkloadType.LARGE_FILES:
      generateLargeFilesWorkload(operations, data, totalOperations);
      break;
    case WorkloadType.INTENSIVE_GIT:
      generateIntensiveGitWorkload(operations, data, totalOperations);
      break;
    default:
      generateMixedWorkload(operations, data, totalOperations);
  }
  
  return {
    type,
    intensity,
    duration,
    operationsCount: operations.length,
    operations
  };
}

/**
 * 강도에 따른 초당 작업 비율 계산
 */
function getOperationRate(intensity) {
  switch (intensity) {
    case 'low': return 2;    // 2 작업/초
    case 'medium': return 5; // 5 작업/초
    case 'high': return 10;  // 10 작업/초
    case 'extreme': return 20; // 20 작업/초
    default: return 5;
  }
}

/**
 * 저장소 브라우징 워크로드 생성
 * 주로 파일 탐색과 디렉토리 트래버싱
 */
function generateRepoBrowsingWorkload(operations, data, totalOperations) {
  const { repos, files } = data;
  
  // 선택된 저장소
  const repo = repos[Math.floor(Math.random() * repos.length)];
  
  // 저장소 파일
  const repoFiles = files.filter(f => f.repoId === repo.id);
  
  // 디렉토리 목록 추출
  const directories = [...new Set(repoFiles.map(f => {
    const pathParts = f.path.split('/');
    return pathParts.slice(0, -1).join('/');
  }))];
  
  // 작업 생성
  for (let i = 0; i < totalOperations; i++) {
    const opType = Math.random();
    
    if (opType < 0.6) {
      // 파일 조회 (60%)
      const file = repoFiles[Math.floor(Math.random() * repoFiles.length)];
      operations.push({
        type: 'get_file',
        repoId: repo.id,
        path: file.path
      });
    } else if (opType < 0.9) {
      // 디렉토리 조회 (30%)
      const dir = directories[Math.floor(Math.random() * directories.length)];
      const dirFiles = repoFiles.filter(f => f.path.startsWith(dir + '/'));
      
      operations.push({
        type: 'list_directory',
        repoId: repo.id,
        path: dir,
        filesCount: dirFiles.length
      });
      
      // 디렉토리 내 파일 일부 조회 (파일 캐싱 패턴 시뮬레이션)
      const filesToRead = Math.min(3, dirFiles.length);
      for (let j = 0; j < filesToRead; j++) {
        const file = dirFiles[Math.floor(Math.random() * dirFiles.length)];
        operations.push({
          type: 'get_file',
          repoId: repo.id,
          path: file.path
        });
      }
      
      // 작업 카운트 업데이트
      i += filesToRead;
    } else {
      // 저장소 메타데이터 조회 (10%)
      operations.push({
        type: 'get_repo_info',
        repoId: repo.id
      });
    }
  }
}

/**
 * 브랜치 전환 워크로드 생성
 * 브랜치 전환 및 관련 파일 접근
 */
function generateBranchSwitchingWorkload(operations, data, totalOperations) {
  const { repos, branches, commits, files } = data;
  
  // 선택된 저장소
  const repo = repos[Math.floor(Math.random() * repos.length)];
  
  // 저장소 브랜치
  const repoBranches = branches.filter(b => b.repoId === repo.id);
  
  // 저장소 파일
  const repoFiles = files.filter(f => f.repoId === repo.id);
  
  // Git 관련 파일
  const gitFiles = repoFiles.filter(f => f.path.includes('git/'));
  
  let currentBranch = repoBranches[0];
  let operationsCount = 0;
  
  while (operationsCount < totalOperations) {
    // 브랜치 전환 (20% 확률)
    if (operationsCount === 0 || Math.random() < 0.2) {
      const newBranch = repoBranches[Math.floor(Math.random() * repoBranches.length)];
      currentBranch = newBranch;
      
      // 브랜치 정보 가져오기
      operations.push({
        type: 'get_branch',
        repoId: repo.id,
        branch: newBranch.name
      });
      
      // Git 관련 파일 업데이트 (브랜치 전환 시 필요)
      const filesToUpdate = Math.min(5, gitFiles.length);
      for (let i = 0; i < filesToUpdate; i++) {
        const file = gitFiles[Math.floor(Math.random() * gitFiles.length)];
        operations.push({
          type: 'get_file',
          repoId: repo.id,
          path: file.path
        });
      }
      
      operationsCount += filesToUpdate + 1;
    } else {
      // 현재 브랜치의 커밋 조회
      const branchCommits = commits.filter(c => c.repoId === repo.id && c.branch === currentBranch.name);
      const commit = branchCommits[Math.floor(Math.random() * branchCommits.length)];
      
      operations.push({
        type: 'get_commit',
        repoId: repo.id,
        hash: commit.hash
      });
      
      // 커밋 관련 파일 조회
      const filesToRead = Math.min(3, repoFiles.length);
      for (let i = 0; i < filesToRead; i++) {
        const file = repoFiles[Math.floor(Math.random() * repoFiles.length)];
        operations.push({
          type: 'get_file',
          repoId: repo.id,
          path: file.path
        });
      }
      
      operationsCount += filesToRead + 1;
    }
  }
}

/**
 * 커밋 이력 탐색 워크로드 생성
 * 커밋 기록 조회 및 변경 사항 확인
 */
function generateCommitHistoryWorkload(operations, data, totalOperations) {
  const { repos, branches, commits, diffs, files } = data;
  
  // 선택된 저장소
  const repo = repos[Math.floor(Math.random() * repos.length)];
  
  // 저장소 브랜치
  const repoBranches = branches.filter(b => b.repoId === repo.id);
  
  // 저장소 커밋
  const repoCommits = commits.filter(c => c.repoId === repo.id);
  
  // 저장소 파일
  const repoFiles = files.filter(f => f.repoId === repo.id);
  
  // Git 관련 파일
  const gitFiles = repoFiles.filter(f => f.path.includes('git/'));
  
  // 작업 카운트
  let operationsCount = 0;
  
  // 선택된 브랜치
  const branch = repoBranches[Math.floor(Math.random() * repoBranches.length)];
  
  // 브랜치 커밋 (시간순 정렬)
  const branchCommits = repoCommits
    .filter(c => c.branch === branch.name)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // 브랜치 정보 조회
  operations.push({
    type: 'get_branch',
    repoId: repo.id,
    branch: branch.name
  });
  
  operationsCount++;
  
  // 커밋 이력 탐색
  while (operationsCount < totalOperations) {
    // 커밋 탐색 패턴: 최신 -> 과거
    for (let i = 0; i < branchCommits.length && operationsCount < totalOperations; i++) {
      const commit = branchCommits[i];
      
      // 커밋 정보 조회
      operations.push({
        type: 'get_commit',
        repoId: repo.id,
        hash: commit.hash
      });
      
      operationsCount++;
      
      // diff 조회 (있는 경우)
      const commitDiff = diffs.find(d => d.commitHash === commit.hash);
      if (commitDiff && operationsCount < totalOperations) {
        operations.push({
          type: 'get_diff',
          commitHash: commit.hash
        });
        
        operationsCount++;
      }
      
      // 변경된 파일 조회 (시뮬레이션)
      const changedFilesCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < changedFilesCount && operationsCount < totalOperations; j++) {
        const file = repoFiles[Math.floor(Math.random() * repoFiles.length)];
        operations.push({
          type: 'get_file',
          repoId: repo.id,
          path: file.path
        });
        
        operationsCount++;
      }
      
      // Git 관련 파일 접근 (커밋 탐색 시 발생)
      if (Math.random() < 0.3 && operationsCount < totalOperations) {
        const gitFile = gitFiles[Math.floor(Math.random() * gitFiles.length)];
        operations.push({
          type: 'get_file',
          repoId: repo.id,
          path: gitFile.path
        });
        
        operationsCount++;
      }
    }
  }
}

/**
 * 파일 편집 워크로드 생성
 * 파일 편집과 저장 작업 시뮬레이션
 */
function generateFileEditingWorkload(operations, data, totalOperations) {
  const { repos, files } = data;
  
  // 선택된 저장소
  const repo = repos[Math.floor(Math.random() * repos.length)];
  
  // 저장소 파일 (편집 가능한 파일만)
  const editableFiles = files.filter(f => 
    f.repoId === repo.id && 
    !f.path.includes('git/') && 
    (f.path.endsWith('.js') || f.path.endsWith('.json') || f.path.endsWith('.md'))
  );
  
  // Git 관련 파일
  const gitFiles = files.filter(f => f.repoId === repo.id && f.path.includes('git/'));
  
  // 작업 카운트
  let operationsCount = 0;
  
  // 파일 편집 세션
  while (operationsCount < totalOperations) {
    // 편집할 파일 선택
    const file = editableFiles[Math.floor(Math.random() * editableFiles.length)];
    
    // 파일 조회 (읽기)
    operations.push({
      type: 'get_file',
      repoId: repo.id,
      path: file.path
    });
    
    operationsCount++;
    
    // 편집 세션 시뮬레이션 (여러 번 읽고 쓰기)
    const editSessionLength = Math.floor(Math.random() * 5) + 2; // 2~6회
    for (let i = 0; i < editSessionLength && operationsCount < totalOperations; i++) {
      // 파일 수정
      operations.push({
        type: 'set_file',
        repoId: repo.id,
        path: file.path,
        content: `Modified content of ${file.path} - ${Date.now()}`,
        originalSize: file.size
      });
      
      operationsCount++;
      
      // 관련 파일 확인 (같은 디렉토리 내 파일 등)
      if (Math.random() < 0.3 && operationsCount < totalOperations) {
        const pathParts = file.path.split('/');
        const directory = pathParts.slice(0, -1).join('/');
        
        const relatedFiles = editableFiles.filter(f => 
          f.path !== file.path && f.path.startsWith(directory)
        );
        
        if (relatedFiles.length > 0) {
          const relatedFile = relatedFiles[Math.floor(Math.random() * relatedFiles.length)];
          operations.push({
            type: 'get_file',
            repoId: repo.id,
            path: relatedFile.path
          });
          
          operationsCount++;
        }
      }
    }
    
    // 저장 후 Git 작업 시뮬레이션
    if (operationsCount < totalOperations) {
      // Git 인덱스 업데이트
      const gitIndexFiles = gitFiles.filter(f => f.path.includes('git/index'));
      if (gitIndexFiles.length > 0) {
        const indexFile = gitIndexFiles[Math.floor(Math.random() * gitIndexFiles.length)];
        operations.push({
          type: 'set_file',
          repoId: repo.id,
          path: indexFile.path,
          content: `Updated index for ${file.path} - ${Date.now()}`,
          originalSize: indexFile.size
        });
        
        operationsCount++;
      }
    }
  }
}

/**
 * 대용량 파일 처리 워크로드 생성
 * 큰 파일 읽기/쓰기 작업
 */
function generateLargeFilesWorkload(operations, data, totalOperations) {
  const { repos, files } = data;
  
  // 선택된 저장소
  const repo = repos[Math.floor(Math.random() * repos.length)];
  
  // 대용량 파일 (10KB 이상)
  const largeFiles = files.filter(f => 
    f.repoId === repo.id && f.size >= 10000
  );
  
  // 작은 파일
  const smallFiles = files.filter(f => 
    f.repoId === repo.id && f.size < 10000
  );
  
  // 작업 카운트
  let operationsCount = 0;
  
  // 대용량 파일 작업 시뮬레이션
  while (operationsCount < totalOperations) {
    // 대용량 파일 작업 (70%)
    if (largeFiles.length > 0 && (operationsCount === 0 || Math.random() < 0.7)) {
      const file = largeFiles[Math.floor(Math.random() * largeFiles.length)];
      
      // 파일 읽기
      operations.push({
        type: 'get_file',
        repoId: repo.id,
        path: file.path,
        compress: true
      });
      
      operationsCount++;
      
      // 파일 쓰기 (30% 확률)
      if (Math.random() < 0.3 && operationsCount < totalOperations) {
        operations.push({
          type: 'set_file',
          repoId: repo.id,
          path: file.path,
          content: `Large file content - ${Date.now()}`,
          originalSize: file.size,
          compress: true
        });
        
        operationsCount++;
      }
    } 
    // 작은 파일 작업 (30%)
    else if (smallFiles.length > 0) {
      const filesCount = Math.min(5, smallFiles.length, totalOperations - operationsCount);
      
      for (let i = 0; i < filesCount; i++) {
        const file = smallFiles[Math.floor(Math.random() * smallFiles.length)];
        
        operations.push({
          type: 'get_file',
          repoId: repo.id,
          path: file.path
        });
      }
      
      operationsCount += filesCount;
    }
  }
}

/**
 * Git 작업 집중 워크로드 생성
 * rebase, merge 등 git 관련 작업 시뮬레이션
 */
function generateIntensiveGitWorkload(operations, data, totalOperations) {
  const { repos, branches, commits, files } = data;
  
  // 선택된 저장소
  const repo = repos[Math.floor(Math.random() * repos.length)];
  
  // Git 관련 파일
  const gitFiles = files.filter(f => 
    f.repoId === repo.id && f.path.includes('git/')
  );
  
  // 일반 파일
  const normalFiles = files.filter(f => 
    f.repoId === repo.id && !f.path.includes('git/')
  );
  
  // 저장소 브랜치
  const repoBranches = branches.filter(b => b.repoId === repo.id);
  
  // 작업 카운트
  let operationsCount = 0;
  
  // git 명령어 시뮬레이션
  const gitOperations = [
    'merge',
    'rebase',
    'cherry-pick',
    'stash',
    'reset',
    'checkout'
  ];
  
  // Git 작업 시뮬레이션
  while (operationsCount < totalOperations) {
    // Git 작업 선택
    const operation = gitOperations[Math.floor(Math.random() * gitOperations.length)];
    
    // 선택된 브랜치들
    const branch1 = repoBranches[Math.floor(Math.random() * repoBranches.length)];
    let branch2 = repoBranches[Math.floor(Math.random() * repoBranches.length)];
    while (branch2.name === branch1.name) {
      branch2 = repoBranches[Math.floor(Math.random() * repoBranches.length)];
    }
    
    // Git 작업 시작
    operations.push({
      type: 'git_operation_start',
      operation,
      repoId: repo.id,
      branch: branch1.name,
      targetBranch: operation === 'merge' || operation === 'rebase' ? branch2.name : undefined
    });
    
    operationsCount++;
    
    // Git 파일 집중 접근
    const gitFilesCount = Math.min(10, gitFiles.length, totalOperations - operationsCount);
    for (let i = 0; i < gitFilesCount; i++) {
      // 각 파일 분류에서 골고루 선택
      const fileGroups = [
        gitFiles.filter(f => f.path.includes('git/index')),
        gitFiles.filter(f => f.path.includes('git/refs')),
        gitFiles.filter(f => f.path.includes('git/objects')),
        gitFiles.filter(f => f.path.includes('git/logs'))
      ];
      
      const nonEmptyGroups = fileGroups.filter(group => group.length > 0);
      const selectedGroup = nonEmptyGroups[Math.floor(Math.random() * nonEmptyGroups.length)];
      
      if (selectedGroup && selectedGroup.length > 0) {
        const file = selectedGroup[Math.floor(Math.random() * selectedGroup.length)];
        
        // 파일 읽기/쓰기
        const isWrite = Math.random() < 0.4; // 40% 확률로 쓰기
        
        if (isWrite) {
          operations.push({
            type: 'set_file',
            repoId: repo.id,
            path: file.path,
            content: `Git operation ${operation} - ${Date.now()}`,
            originalSize: file.size
          });
        } else {
          operations.push({
            type: 'get_file',
            repoId: repo.id,
            path: file.path
          });
        }
        
        operationsCount++;
      }
    }
    
    // 일반 파일 접근 (적은 비율)
    const normalFilesCount = Math.min(3, normalFiles.length, totalOperations - operationsCount);
    for (let i = 0; i < normalFilesCount; i++) {
      const file = normalFiles[Math.floor(Math.random() * normalFiles.length)];
      
      operations.push({
        type: 'get_file',
        repoId: repo.id,
        path: file.path
      });
      
      operationsCount++;
    }
    
    // Git 작업 완료
    if (operationsCount < totalOperations) {
      operations.push({
        type: 'git_operation_end',
        operation,
        repoId: repo.id,
        branch: branch1.name,
        targetBranch: operation === 'merge' || operation === 'rebase' ? branch2.name : undefined,
        success: Math.random() < 0.9 // 90% 성공
      });
      
      operationsCount++;
    }
  }
}

/**
 * 혼합 워크로드 생성
 * 여러 유형의 워크로드를 조합
 */
function generateMixedWorkload(operations, data, totalOperations) {
  // 워크로드 비율 결정
  const workloadDistribution = {
    [WorkloadType.REPO_BROWSING]: 0.2,
    [WorkloadType.BRANCH_SWITCHING]: 0.15,
    [WorkloadType.COMMIT_HISTORY]: 0.2,
    [WorkloadType.FILE_EDITING]: 0.15,
    [WorkloadType.LARGE_FILES]: 0.1,
    [WorkloadType.INTENSIVE_GIT]: 0.2
  };
  
  // 각 워크로드 유형별 작업 수 계산
  const workloadCounts = {};
  let remainingOperations = totalOperations;
  
  Object.entries(workloadDistribution).forEach(([type, ratio], index, array) => {
    if (index === array.length - 1) {
      // 마지막 항목은 남은 작업 수 모두 할당
      workloadCounts[type] = remainingOperations;
    } else {
      const count = Math.floor(totalOperations * ratio);
      workloadCounts[type] = count;
      remainingOperations -= count;
    }
  });
  
  // 각 워크로드 유형별 작업 생성
  Object.entries(workloadCounts).forEach(([type, count]) => {
    if (count <= 0) return;
    
    const tempOperations = [];
    
    switch (type) {
      case WorkloadType.REPO_BROWSING:
        generateRepoBrowsingWorkload(tempOperations, data, count);
        break;
      case WorkloadType.BRANCH_SWITCHING:
        generateBranchSwitchingWorkload(tempOperations, data, count);
        break;
      case WorkloadType.COMMIT_HISTORY:
        generateCommitHistoryWorkload(tempOperations, data, count);
        break;
      case WorkloadType.FILE_EDITING:
        generateFileEditingWorkload(tempOperations, data, count);
        break;
      case WorkloadType.LARGE_FILES:
        generateLargeFilesWorkload(tempOperations, data, count);
        break;
      case WorkloadType.INTENSIVE_GIT:
        generateIntensiveGitWorkload(tempOperations, data, count);
        break;
    }
    
    // 실제 생성된 작업 수 (목표보다 적을 수 있음)
    const actualCount = Math.min(count, tempOperations.length);
    
    // 최종 작업 목록에 추가
    operations.push(...tempOperations.slice(0, actualCount));
  });
  
  // 작업 순서 섞기 (실제 사용 패턴에 가깝게)
  shuffleArray(operations);
}

/**
 * 배열 요소 순서 무작위로 섞기
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 모듈 내보내기
module.exports = {
  createRepositoryStructure,
  generateWorkload,
  WorkloadType
};