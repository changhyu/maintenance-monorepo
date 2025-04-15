import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    return {
      user: user ? JSON.parse(user) : null,
      token: token,
      isAuthenticated: !!token,
      isLoading: false
    };
  });

  // 토큰 유효성 검사
  const validateToken = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/v1/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, []);

  // 토큰 유효성 주기적 체크
  useEffect(() => {
    if (authState.token) {
      const checkToken = async () => {
        const isValid = await validateToken(authState.token!);
        if (!isValid) {
          logout();
        }
      };

      checkToken();
      const interval = setInterval(checkToken, 5 * 60 * 1000); // 5분마다 체크

      return () => clearInterval(interval);
    }
  }, [authState.token, validateToken]);

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setAuthState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false
      }));
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });

    navigate('/login');
  }, [navigate]);

  const updateUser = (userData: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
    }
  };

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    logout,
    updateUser
  };
};

export default useAuth; 