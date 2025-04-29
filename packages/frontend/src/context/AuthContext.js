import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
// 사용자 역할 정의
export var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ENTERPRISE_ADMIN"] = "ENTERPRISE_ADMIN";
    UserRole["SHOP_OWNER"] = "SHOP_OWNER";
    UserRole["TECHNICIAN"] = "TECHNICIAN";
    UserRole["VEHICLE_OWNER"] = "VEHICLE_OWNER";
})(UserRole || (UserRole = {}));
// 인증 컨텍스트 생성
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // 초기 인증 상태 확인
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('authToken');
                if (!token) {
                    setIsAuthenticated(false);
                    setUser(null);
                    setLoading(false);
                    return;
                }
                // TODO: 실제 API 구현 시 토큰 검증 로직 추가
                // const response = await api.get('/auth/me');
                // setUser(response.data);
                // 임시 사용자 데이터 (개발용)
                const tempUser = {
                    id: '1',
                    email: 'user@example.com',
                    name: '사용자',
                    role: UserRole.SHOP_OWNER,
                    profileImage: 'https://via.placeholder.com/150',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                setUser(tempUser);
                setIsAuthenticated(true);
            }
            catch (err) {
                console.error('인증 상태 확인 중 오류 발생:', err);
                localStorage.removeItem('authToken');
                setIsAuthenticated(false);
                setUser(null);
                setError('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
            }
            finally {
                setLoading(false);
            }
        };
        checkAuthStatus();
    }, []);
    // 로그인 함수
    const login = async (email, password) => {
        try {
            setLoading(true);
            setError(null);
            // TODO: 실제 API 구현 시 로그인 로직 추가
            // const response = await api.post('/auth/login', { email, password });
            // localStorage.setItem('authToken', response.data.token);
            // 임시 로그인 로직 (개발용)
            await new Promise(resolve => setTimeout(resolve, 1000));
            localStorage.setItem('authToken', 'temp-auth-token');
            const tempUser = {
                id: '1',
                email,
                name: '사용자',
                role: UserRole.SHOP_OWNER,
                profileImage: 'https://via.placeholder.com/150',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setUser(tempUser);
            setIsAuthenticated(true);
        }
        catch (err) {
            console.error('로그인 중 오류 발생:', err);
            setError(err.message || '로그인 중 오류가 발생했습니다.');
            throw err;
        }
        finally {
            setLoading(false);
        }
    };
    // 로그아웃 함수
    const logout = async () => {
        try {
            setLoading(true);
            // TODO: 실제 API 구현 시 로그아웃 로직 추가
            // await api.post('/auth/logout');
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
        }
        catch (err) {
            console.error('로그아웃 중 오류 발생:', err);
        }
        finally {
            setLoading(false);
        }
    };
    // 회원가입 함수
    const register = async (userData) => {
        try {
            setLoading(true);
            setError(null);
            // TODO: 실제 API 구현 시 회원가입 로직 추가
            // await api.post('/auth/register', userData);
            // 임시 회원가입 로직 (개발용)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (err) {
            console.error('회원가입 중 오류 발생:', err);
            setError(err.message || '회원가입 중 오류가 발생했습니다.');
            throw err;
        }
        finally {
            setLoading(false);
        }
    };
    // 비밀번호 재설정 요청 함수
    const forgotPassword = async (email) => {
        try {
            setLoading(true);
            setError(null);
            // TODO: 실제 API 구현 시 비밀번호 재설정 요청 로직 추가
            // await api.post('/auth/forgot-password', { email });
            // 임시 로직 (개발용)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (err) {
            console.error('비밀번호 재설정 요청 중 오류 발생:', err);
            setError(err.message || '비밀번호 재설정 요청 중 오류가 발생했습니다.');
            throw err;
        }
        finally {
            setLoading(false);
        }
    };
    // 비밀번호 재설정 함수
    const resetPassword = async (token, newPassword) => {
        try {
            setLoading(true);
            setError(null);
            // TODO: 실제 API 구현 시 비밀번호 재설정 로직 추가
            // await api.post('/auth/reset-password', { token, newPassword });
            // 임시 로직 (개발용)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (err) {
            console.error('비밀번호 재설정 중 오류 발생:', err);
            setError(err.message || '비밀번호 재설정 중 오류가 발생했습니다.');
            throw err;
        }
        finally {
            setLoading(false);
        }
    };
    // 프로필 업데이트 함수
    const updateProfile = async (userData) => {
        try {
            setLoading(true);
            setError(null);
            // TODO: 실제 API 구현 시 프로필 업데이트 로직 추가
            // const response = await api.put('/auth/profile', userData);
            // setUser(response.data);
            // 임시 로직 (개발용)
            await new Promise(resolve => setTimeout(resolve, 1000));
            setUser(prev => (prev ? { ...prev, ...userData } : null));
        }
        catch (err) {
            console.error('프로필 업데이트 중 오류 발생:', err);
            setError(err.message || '프로필 업데이트 중 오류가 발생했습니다.');
            throw err;
        }
        finally {
            setLoading(false);
        }
    };
    // 권한 확인 함수
    const hasRole = (roles) => {
        if (!user)
            return false;
        if (Array.isArray(roles)) {
            return roles.includes(user.role);
        }
        return user.role === roles;
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            loading,
            error,
            login,
            logout,
            register,
            forgotPassword,
            resetPassword,
            updateProfile,
            isAuthenticated,
            hasRole
        }, children: children }));
};
// 인증 컨텍스트를 사용하기 위한 커스텀 훅
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export default AuthContext;
