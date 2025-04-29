import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { getAuthService, User } from '../services/auth/AuthService';
import { ProtectedRoute, ForbiddenPage } from '../components/auth/ProtectedRoute';
// _LoginForm 컴포넌트는 직접 구현하지 않고 대체 코드 사용
// import { LoginForm } from '../components/auth/LoginForm';
import { UserProfile } from '../components/auth/UserProfile';
import { ToastProvider, useToast } from '../contexts/ToastContext';

/**
 * 대시보드 컴포넌트
 */
function Dashboard() {
  const { user } = useAuthContext();
  
  return (
    <div className="dashboard">
      <h2>대시보드</h2>
      <p>반갑습니다, {user?.name || user?.username}님!</p>
      <p>이 페이지는 로그인한 사용자만 볼 수 있습니다.</p>
    </div>
  );
}

/**
 * 관리자 페이지 컴포넌트
 */
function AdminPage() {
  return (
    <div className="admin-page">
      <h2>관리자 페이지</h2>
      <p>이 페이지는 'admin' 역할을 가진 사용자만 볼 수 있습니다.</p>
    </div>
  );
}

/**
 * 편집자 페이지 컴포넌트
 */
function EditorPage() {
  return (
    <div className="editor-page">
      <h2>편집자 페이지</h2>
      <p>이 페이지는 'editor' 역할을 가진 사용자만 볼 수 있습니다.</p>
    </div>
  );
}

/**
 * 로그인 필요 없이 모두가 볼 수 있는 공개 페이지
 */
function PublicPage() {
  return (
    <div className="public-page">
      <h2>공개 페이지</h2>
      <p>이 페이지는 로그인 없이 누구나 볼 수 있습니다.</p>
    </div>
  );
}

/**
 * 인증 상태 컨텍스트 불러오기
 */
function useAuthContext() {
  // 임시 목업 사용자 생성
  const [user, setUser] = useState<User | null>({
    id: '1',
    username: 'user',
    email: 'user@example.com',
    name: '일반 사용자',
    roles: ['user'],
    permissions: ['read:content']
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);
  const [isLoading, setIsLoading] = useState(false);
  
  // 모의 로그인 함수
  const login = async ({ username }: { username: string }) => {
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 사용자 유형별 생성
      if (username === 'admin') {
        setUser({
          id: '2',
          username: 'admin',
          email: 'admin@example.com',
          name: '관리자',
          roles: ['admin', 'user'],
          permissions: ['read:content', 'write:content', 'delete:content', 'manage:users']
        });
      } else if (username === 'editor') {
        setUser({
          id: '3',
          username: 'editor',
          email: 'editor@example.com',
          name: '편집자',
          roles: ['editor', 'user'],
          permissions: ['read:content', 'write:content', 'edit:content']
        });
      } else {
        setUser({
          id: '1',
          username: 'user',
          email: 'user@example.com',
          name: '일반 사용자',
          roles: ['user'],
          permissions: ['read:content']
        });
      }
      
      setIsAuthenticated(true);
      return true;
    } finally {
      setIsLoading(false);
    }
  };
  
  // 모의 로그아웃 함수
  const logout = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(null);
      setIsAuthenticated(false);
      return true;
    } finally {
      setIsLoading(false);
    }
  };
  
  // 권한 확인 함수
  const hasRole = (role: string) => {
    return user?.roles?.includes(role) || false;
  };
  
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    hasPermission
  };
}

/**
 * 내비게이션 컴포넌트
 */
function Navigation() {
  const { user, isAuthenticated, logout } = useAuthContext();
  const toast = useToast();
  
  const handleLogout = async () => {
    await logout();
    toast.showSuccess('로그아웃되었습니다');
  };
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">보호된 라우트 예제</div>
        
        <div className="flex space-x-4">
          <Link to="/" className="hover:text-gray-300">홈</Link>
          <Link to="/public" className="hover:text-gray-300">공개 페이지</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="hover:text-gray-300">대시보드</Link>
              {user?.roles?.includes('admin') && (
                <Link to="/admin" className="hover:text-gray-300">관리자</Link>
              )}
              {user?.roles?.includes('editor') && (
                <Link to="/editor" className="hover:text-gray-300">편집자</Link>
              )}
              <Link to="/profile" className="hover:text-gray-300">프로필</Link>
              <button 
                onClick={handleLogout}
                className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className="hover:text-gray-300">로그인</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

/**
 * 로그인 페이지 컴포넌트
 */
function LoginPage() {
  const { login } = useAuthContext();
  const toast = useToast();
  
  const handleSuccess = () => {
    toast.showSuccess('로그인 성공!');
  };
  
  const _handleError = (error: string) => {
    toast.showError(error);
  };
  
  return (
    <div className="login-page">
      <h2 className="text-xl font-bold mb-4">로그인</h2>
      <p className="mb-4">세 가지 사용자 유형으로 로그인해 보세요:</p>
      
      <ul className="list-disc list-inside mb-4">
        <li><strong>일반 사용자</strong>: 대시보드와 프로필 접근 가능</li>
        <li><strong>관리자</strong>: 추가로 관리자 페이지 접근 가능</li>
        <li><strong>편집자</strong>: 추가로 편집자 페이지 접근 가능</li>
      </ul>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => login({ username: 'user' }).then(handleSuccess)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          일반 사용자 로그인
        </button>
        <button
          onClick={() => login({ username: 'admin' }).then(handleSuccess)}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          관리자 로그인
        </button>
        <button
          onClick={() => login({ username: 'editor' }).then(handleSuccess)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          편집자 로그인
        </button>
      </div>
    </div>
  );
}

/**
 * 메인 내용 컴포넌트
 */
function MainContent() {
  return (
    <div className="container mx-auto p-4">
      <Routes>
        <Route path="/" element={<HomeContent />} />
        <Route path="/public" element={<PublicPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/editor" 
          element={
            <ProtectedRoute requiredRoles={['editor']}>
              <EditorPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfile readOnly />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

/**
 * 홈 페이지 내용 컴포넌트
 */
function HomeContent() {
  const { isAuthenticated, user } = useAuthContext();
  
  return (
    <div className="home-content">
      <h1 className="text-2xl font-bold mb-4">보호된 라우트 예제</h1>
      
      {isAuthenticated ? (
        <div className="bg-green-50 border border-green-300 p-4 rounded mb-6">
          <p className="mb-2">
            <span className="font-bold">{user?.name || user?.username}</span>님으로 로그인되었습니다.
          </p>
          <p>
            역할: <span className="font-mono">{user?.roles?.join(', ')}</span>
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-300 p-4 rounded mb-6">
          <p>로그인되지 않았습니다. 일부 페이지는 접근이 제한됩니다.</p>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">접근 가능한 페이지:</h2>
        <ul className="list-disc list-inside">
          <li>
            <Link to="/public" className="text-blue-600 hover:underline">공개 페이지</Link>
            <span className="text-gray-500"> - 모든 사용자 접근 가능</span>
          </li>
          <li>
            <Link to="/dashboard" className="text-blue-600 hover:underline">대시보드</Link>
            <span className="text-gray-500"> - 로그인한 사용자만 접근 가능</span>
          </li>
          <li>
            <Link to="/admin" className="text-blue-600 hover:underline">관리자 페이지</Link>
            <span className="text-gray-500"> - 'admin' 역할 필요</span>
          </li>
          <li>
            <Link to="/editor" className="text-blue-600 hover:underline">편집자 페이지</Link>
            <span className="text-gray-500"> - 'editor' 역할 필요</span>
          </li>
          <li>
            <Link to="/profile" className="text-blue-600 hover:underline">프로필</Link>
            <span className="text-gray-500"> - 로그인한 사용자만 접근 가능</span>
          </li>
        </ul>
      </div>
      
      <div className="bg-gray-50 border border-gray-300 p-4 rounded">
        <h2 className="text-lg font-bold mb-2">사용 방법</h2>
        <p className="mb-2">
          이 예제에서는 <code className="bg-gray-200 px-1 py-0.5 rounded">ProtectedRoute</code> 컴포넌트를 사용하여
          인증 및 권한 기반으로 라우트를 보호하는 방법을 보여줍니다.
        </p>
      </div>
    </div>
  );
}

/**
 * 보호된 라우트 예제 컴포넌트
 */
export function ProtectedRouteExample() {
  return (
    <ToastProvider position="bottom-right">
      <Router>
        <div className="protected-route-example min-h-screen bg-gray-100">
          <Navigation />
          <MainContent />
        </div>
      </Router>
    </ToastProvider>
  );
}