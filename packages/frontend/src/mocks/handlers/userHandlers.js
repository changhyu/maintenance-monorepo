/**
 * 사용자 API 모킹 핸들러
 * 사용자 관련 API 요청을 모의 응답으로 처리합니다.
 */

import { rest } from 'msw';
import { v4 as uuidv4 } from 'uuid';

// 모의 사용자 데이터 가져오기
const getMockUsers = () => {
  const users = localStorage.getItem('mock_users');
  return users ? JSON.parse(users) : [];
};

// 모의 사용자 데이터 저장
const saveMockUsers = (users) => {
  localStorage.setItem('mock_users', JSON.stringify(users));
};

// 페이지네이션 처리 함수
const paginateData = (data, page = 1, pageSize = 10) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    items: paginatedData,
    total: data.length,
    page: page,
    pageSize: pageSize,
    totalPages: Math.ceil(data.length / pageSize)
  };
};

export const userHandlers = [
  // GET /api/v1/users - 사용자 목록 조회
  rest.get('/api/v1/users', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const pageSize = parseInt(req.url.searchParams.get('pageSize') || '10');
    const search = req.url.searchParams.get('search') || '';
    
    let users = getMockUsers();
    
    // 검색어가 있는 경우 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower)
      );
    }
    
    // 페이지네이션 적용
    const result = paginateData(users, page, pageSize);
    
    return res(
      ctx.status(200),
      ctx.json(result)
    );
  }),
  
  // GET /api/v1/users/:id - 특정 사용자 조회
  rest.get('/api/v1/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    const users = getMockUsers();
    const user = users.find(u => u.id === parseInt(id));
    
    if (!user) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 사용자를 찾을 수 없습니다.` })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json(user)
    );
  }),
  
  // POST /api/v1/users - 새 사용자 생성
  rest.post('/api/v1/users', async (req, res, ctx) => {
    const newUser = await req.json();
    const users = getMockUsers();
    
    // 필수 필드 확인
    if (!newUser.username || !newUser.email) {
      return res(
        ctx.status(400),
        ctx.json({ 
          detail: "유효하지 않은 사용자 데이터",
          errors: {
            username: !newUser.username ? "사용자명은 필수 항목입니다." : null,
            email: !newUser.email ? "이메일은 필수 항목입니다." : null
          }
        })
      );
    }
    
    // 이메일 중복 확인
    if (users.some(u => u.email === newUser.email)) {
      return res(
        ctx.status(409),
        ctx.json({ detail: "이미 사용 중인 이메일입니다." })
      );
    }
    
    // 사용자명 중복 확인
    if (users.some(u => u.username === newUser.username)) {
      return res(
        ctx.status(409),
        ctx.json({ detail: "이미 사용 중인 사용자명입니다." })
      );
    }
    
    // 새 사용자 생성
    const user = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      ...newUser,
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    saveMockUsers(users);
    
    return res(
      ctx.status(201),
      ctx.json(user)
    );
  }),
  
  // PUT /api/v1/users/:id - 사용자 정보 업데이트
  rest.put('/api/v1/users/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updateData = await req.json();
    const users = getMockUsers();
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    
    if (userIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 사용자를 찾을 수 없습니다.` })
      );
    }
    
    // 이메일 중복 확인 (다른 사용자와)
    if (updateData.email && 
        users.some(u => u.email === updateData.email && u.id !== parseInt(id))) {
      return res(
        ctx.status(409),
        ctx.json({ detail: "이미 사용 중인 이메일입니다." })
      );
    }
    
    // 사용자 정보 업데이트
    const updatedUser = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    users[userIndex] = updatedUser;
    saveMockUsers(users);
    
    return res(
      ctx.status(200),
      ctx.json(updatedUser)
    );
  }),
  
  // DELETE /api/v1/users/:id - 사용자 삭제
  rest.delete('/api/v1/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    const users = getMockUsers();
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    
    if (userIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 사용자를 찾을 수 없습니다.` })
      );
    }
    
    // 사용자 삭제
    users.splice(userIndex, 1);
    saveMockUsers(users);
    
    return res(
      ctx.status(204)
    );
  }),
  
  // POST /api/v1/auth/login - 로그인
  rest.post('/api/v1/auth/login', async (req, res, ctx) => {
    const { username, password } = await req.json();
    const users = getMockUsers();
    
    // 간단한 모의 로그인 처리
    if (username === 'admin' && password === 'admin') {
      return res(
        ctx.status(200),
        ctx.json({
          token: `mock-jwt-token-${uuidv4()}`,
          refreshToken: `mock-refresh-token-${uuidv4()}`,
          user: users.find(u => u.username === 'admin') || {
            id: 1,
            username: 'admin',
            name: '관리자',
            email: 'admin@example.com',
            role: 'admin'
          }
        })
      );
    }
    
    // 로그인 실패
    return res(
      ctx.status(401),
      ctx.json({ detail: "잘못된 사용자명 또는 비밀번호입니다." })
    );
  }),
  
  // POST /api/v1/auth/refresh - 토큰 갱신
  rest.post('/api/v1/auth/refresh', async (req, res, ctx) => {
    const { refreshToken } = await req.json();
    
    // 간단한 모의 토큰 갱신
    if (refreshToken && refreshToken.startsWith('mock-refresh-token-')) {
      return res(
        ctx.status(200),
        ctx.json({
          token: `mock-jwt-token-${uuidv4()}`,
          refreshToken: `mock-refresh-token-${uuidv4()}`
        })
      );
    }
    
    // 갱신 실패
    return res(
      ctx.status(401),
      ctx.json({ detail: "유효하지 않거나 만료된 리프레시 토큰입니다." })
    );
  })
];