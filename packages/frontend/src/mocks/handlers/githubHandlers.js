/**
 * Git API 모킹 핸들러
 * Git 저장소 관련 API 요청을 모의 응답으로 처리합니다.
 */

import { rest } from 'msw';

// 모의 Git 저장소 데이터
const mockRepositories = [
  {
    id: 1,
    name: 'maintenance-frontend',
    url: 'https://github.com/company/maintenance-frontend',
    branch: 'main',
    lastCommit: {
      hash: 'a1b2c3d4e5f6',
      message: 'Fix: UI 버그 수정',
      author: '홍길동',
      date: '2025-04-28T10:15:30Z'
    },
    status: {
      ahead: 0,
      behind: 0,
      modified: 2,
      added: 1,
      deleted: 0
    }
  },
  {
    id: 2,
    name: 'maintenance-backend',
    url: 'https://github.com/company/maintenance-backend',
    branch: 'develop',
    lastCommit: {
      hash: 'f5e4d3c2b1a0',
      message: 'Feat: 사용자 API 확장',
      author: '김철수',
      date: '2025-04-27T15:45:20Z'
    },
    status: {
      ahead: 3,
      behind: 1,
      modified: 5,
      added: 2,
      deleted: 1
    }
  },
  {
    id: 3,
    name: 'maintenance-docs',
    url: 'https://github.com/company/maintenance-docs',
    branch: 'main',
    lastCommit: {
      hash: '1a2b3c4d5e6f',
      message: 'Docs: API 문서 업데이트',
      author: '박영희',
      date: '2025-04-26T09:30:15Z'
    },
    status: {
      ahead: 0,
      behind: 0,
      modified: 0,
      added: 0,
      deleted: 0
    }
  }
];

// 모의 Git 커밋 이력
const mockCommits = {
  1: [ // maintenance-frontend
    {
      hash: 'a1b2c3d4e5f6',
      message: 'Fix: UI 버그 수정',
      author: '홍길동',
      date: '2025-04-28T10:15:30Z'
    },
    {
      hash: 'b2c3d4e5f6a1',
      message: 'Feat: 데이터 시각화 컴포넌트 추가',
      author: '홍길동',
      date: '2025-04-27T16:20:10Z'
    },
    {
      hash: 'c3d4e5f6a1b2',
      message: 'Chore: 의존성 업데이트',
      author: '김철수',
      date: '2025-04-26T14:10:45Z'
    }
  ],
  2: [ // maintenance-backend
    {
      hash: 'f5e4d3c2b1a0',
      message: 'Feat: 사용자 API 확장',
      author: '김철수',
      date: '2025-04-27T15:45:20Z'
    },
    {
      hash: 'e4d3c2b1a0f5',
      message: 'Fix: 인증 버그 수정',
      author: '김철수',
      date: '2025-04-26T13:30:50Z'
    },
    {
      hash: 'd3c2b1a0f5e4',
      message: 'Refactor: 코드 구조 개선',
      author: '박영희',
      date: '2025-04-25T11:25:40Z'
    }
  ],
  3: [ // maintenance-docs
    {
      hash: '1a2b3c4d5e6f',
      message: 'Docs: API 문서 업데이트',
      author: '박영희',
      date: '2025-04-26T09:30:15Z'
    },
    {
      hash: '2b3c4d5e6f1a',
      message: 'Docs: 배포 가이드 추가',
      author: '홍길동',
      date: '2025-04-24T10:20:35Z'
    },
    {
      hash: '3c4d5e6f1a2b',
      message: 'Docs: README 개선',
      author: '김철수',
      date: '2025-04-22T14:15:25Z'
    }
  ]
};

// 분기별 커밋 통계
const mockCommitStats = {
  1: { // maintenance-frontend
    '2025-Q1': { totalCommits: 45, authors: { '홍길동': 20, '김철수': 15, '박영희': 10 } },
    '2025-Q2': { totalCommits: 12, authors: { '홍길동': 7, '김철수': 3, '박영희': 2 } }
  },
  2: { // maintenance-backend
    '2025-Q1': { totalCommits: 60, authors: { '홍길동': 10, '김철수': 35, '박영희': 15 } },
    '2025-Q2': { totalCommits: 15, authors: { '홍길동': 2, '김철수': 10, '박영희': 3 } }
  },
  3: { // maintenance-docs
    '2025-Q1': { totalCommits: 25, authors: { '홍길동': 8, '김철수': 7, '박영희': 10 } },
    '2025-Q2': { totalCommits: 8, authors: { '홍길동': 3, '김철수': 2, '박영희': 3 } }
  }
};

export const githubHandlers = [
  // GET /api/v1/git/repositories - 저장소 목록 조회
  rest.get('/api/v1/git/repositories', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockRepositories)
    );
  }),
  
  // GET /api/v1/git/repositories/:id - 특정 저장소 조회
  rest.get('/api/v1/git/repositories/:id', (req, res, ctx) => {
    const { id } = req.params;
    const repository = mockRepositories.find(repo => repo.id === parseInt(id));
    
    if (!repository) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 저장소를 찾을 수 없습니다.` })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json(repository)
    );
  }),
  
  // GET /api/v1/git/repositories/:id/commits - 특정 저장소의 커밋 이력 조회
  rest.get('/api/v1/git/repositories/:id/commits', (req, res, ctx) => {
    const { id } = req.params;
    const repository = mockRepositories.find(repo => repo.id === parseInt(id));
    
    if (!repository) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 저장소를 찾을 수 없습니다.` })
      );
    }
    
    const commits = mockCommits[parseInt(id)] || [];
    
    return res(
      ctx.status(200),
      ctx.json(commits)
    );
  }),
  
  // GET /api/v1/git/repositories/:id/stats - 특정 저장소의 통계 조회
  rest.get('/api/v1/git/repositories/:id/stats', (req, res, ctx) => {
    const { id } = req.params;
    const repository = mockRepositories.find(repo => repo.id === parseInt(id));
    
    if (!repository) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 저장소를 찾을 수 없습니다.` })
      );
    }
    
    const stats = mockCommitStats[parseInt(id)] || {};
    
    return res(
      ctx.status(200),
      ctx.json(stats)
    );
  }),
  
  // POST /api/v1/git/repositories/:id/pull - 특정 저장소 Pull
  rest.post('/api/v1/git/repositories/:id/pull', (req, res, ctx) => {
    const { id } = req.params;
    const repository = mockRepositories.find(repo => repo.id === parseInt(id));
    
    if (!repository) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 저장소를 찾을 수 없습니다.` })
      );
    }
    
    // 모의 Pull 결과
    const pullResult = {
      success: true,
      changedFiles: 2,
      insertions: 15,
      deletions: 8,
      message: '성공적으로 Pull 되었습니다.'
    };
    
    return res(
      ctx.status(200),
      ctx.json(pullResult)
    );
  }),
  
  // POST /api/v1/git/repositories/:id/push - 특정 저장소 Push
  rest.post('/api/v1/git/repositories/:id/push', (req, res, ctx) => {
    const { id } = req.params;
    const repository = mockRepositories.find(repo => repo.id === parseInt(id));
    
    if (!repository) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 저장소를 찾을 수 없습니다.` })
      );
    }
    
    // 모의 Push 결과
    const pushResult = {
      success: true,
      pushedCommits: 3,
      message: '성공적으로 Push 되었습니다.'
    };
    
    return res(
      ctx.status(200),
      ctx.json(pushResult)
    );
  })
];