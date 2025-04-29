import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
/**
 * 프로필 페이지 컴포넌트
 */
const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: ''
    });
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState(null);
    // 프로필 데이터 로드
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                // 실제 API 호출은 향후 구현
                // 임시 데이터 사용
                await new Promise(resolve => setTimeout(resolve, 1000));
                const mockProfile = {
                    id: 'user-123',
                    name: '김정비',
                    email: 'kimtech@example.com',
                    role: 'technician',
                    company: '정비왕 오토',
                    phone: '010-1234-5678',
                    address: '서울시 강남구',
                    profileImage: 'https://placehold.co/300x300',
                    createdAt: '2023-01-15',
                    lastLogin: '2023-04-08T09:30:00'
                };
                setProfile(mockProfile);
                setFormData({
                    name: mockProfile.name,
                    phone: mockProfile.phone || '',
                    address: mockProfile.address || ''
                });
            }
            catch (err) {
                console.error('Failed to fetch profile:', err);
                setError('프로필 정보를 불러오는 데 실패했습니다.');
            }
            finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);
    /**
     * 입력 필드 변경 처리
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    /**
     * 편집 모드 토글
     */
    const toggleEditMode = () => {
        if (isEditing) {
            // 편집 취소 시 원래 데이터로 복원
            if (profile) {
                setFormData({
                    name: profile.name,
                    phone: profile.phone || '',
                    address: profile.address || ''
                });
            }
        }
        setIsEditing(!isEditing);
        setSaveError(null);
    };
    /**
     * 프로필 수정 제출 처리
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!profile)
            return;
        setSaveLoading(true);
        setSaveError(null);
        try {
            // 실제 API 호출은 향후 구현
            console.log('Updating profile with:', formData);
            // 수정 성공 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 프로필 데이터 업데이트
            setProfile(prev => {
                if (!prev)
                    return null;
                return {
                    ...prev,
                    name: formData.name,
                    phone: formData.phone,
                    address: formData.address
                };
            });
            // 편집 모드 종료
            setIsEditing(false);
        }
        catch (err) {
            console.error('Failed to update profile:', err);
            setSaveError('프로필 수정에 실패했습니다.');
        }
        finally {
            setSaveLoading(false);
        }
    };
    /**
     * 로그아웃 처리
     */
    const handleLogout = () => {
        // 실제 구현에서는 토큰 삭제, 상태 초기화 등 수행
        localStorage.removeItem('authToken');
        navigate('/login');
    };
    /**
     * 계정 삭제 처리
     */
    const handleDeleteAccount = () => {
        if (window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            // 실제 구현에서는 API 호출하여 계정 삭제
            console.log('Account deletion requested');
            alert('계정 삭제가 요청되었습니다. 관리자 승인 후 처리됩니다.');
        }
    };
    // 로딩 중 표시
    if (loading) {
        return (_jsx("div", { className: "flex justify-center items-center h-screen", children: _jsx("div", { className: "text-center", children: _jsx("p", { className: "text-gray-500", children: "\uD504\uB85C\uD544 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." }) }) }));
    }
    // 오류 표시
    if (error || !profile) {
        return (_jsx("div", { className: "flex justify-center items-center h-screen", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-red-500", children: error || '프로필 정보를 불러올 수 없습니다.' }), _jsx("button", { onClick: () => window.location.reload(), className: "mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600", children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }) }));
    }
    return (_jsx("div", { className: "container mx-auto px-4 py-8 max-w-4xl", children: _jsxs("div", { className: "bg-white shadow overflow-hidden sm:rounded-lg", children: [_jsxs("div", { className: "px-4 py-5 sm:px-6 flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg leading-6 font-medium text-gray-900", children: "\uC0AC\uC6A9\uC790 \uD504\uB85C\uD544" }), _jsx("p", { className: "mt-1 max-w-2xl text-sm text-gray-500", children: "\uAC1C\uC778 \uC815\uBCF4 \uBC0F \uACC4\uC815 \uC124\uC815" })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: toggleEditMode, className: `px-3 py-1 rounded text-sm font-medium ${isEditing
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`, children: isEditing ? '편집 취소' : '프로필 편집' }), _jsx("button", { onClick: handleLogout, className: "px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200", children: "\uB85C\uADF8\uC544\uC6C3" })] })] }), isEditing ? (_jsxs("form", { onSubmit: handleSubmit, className: "border-t border-gray-200", children: [saveError && (_jsx("div", { className: "m-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4", children: _jsx("p", { children: saveError }) })), _jsx("div", { className: "px-4 py-5 sm:p-6", children: _jsxs("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-gray-700", children: "\uC774\uB984" }), _jsx("input", { type: "text", name: "name", id: "name", value: formData.name, onChange: handleChange, required: true, className: "mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700", children: "\uC774\uBA54\uC77C" }), _jsx("input", { type: "email", name: "email", id: "email", value: profile.email, disabled: true, className: "mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50" }), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "\uC774\uBA54\uC77C \uC8FC\uC18C\uB294 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "phone", className: "block text-sm font-medium text-gray-700", children: "\uC804\uD654\uBC88\uD638" }), _jsx("input", { type: "text", name: "phone", id: "phone", value: formData.phone, onChange: handleChange, className: "mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "address", className: "block text-sm font-medium text-gray-700", children: "\uC8FC\uC18C" }), _jsx("input", { type: "text", name: "address", id: "address", value: formData.address, onChange: handleChange, className: "mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" })] }), _jsx("div", { className: "sm:col-span-2 mt-4", children: _jsx("button", { type: "submit", disabled: saveLoading, className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300", children: saveLoading ? '저장 중...' : '변경사항 저장' }) })] }) })] })) : (_jsx("div", { className: "border-t border-gray-200", children: _jsxs("dl", { children: [_jsxs("div", { className: "bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uC774\uB984" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: profile.name })] }), _jsxs("div", { className: "bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uC774\uBA54\uC77C" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: profile.email })] }), _jsxs("div", { className: "bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uC5ED\uD560" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: profile.role === 'technician'
                                            ? '정비사'
                                            : profile.role === 'enterprise'
                                                ? '기업 사용자'
                                                : '개인 사용자' })] }), profile.company && (_jsxs("div", { className: "bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uD68C\uC0AC" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: profile.company })] })), _jsxs("div", { className: "bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uC804\uD654\uBC88\uD638" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: profile.phone || '(등록된 전화번호가 없습니다)' })] }), _jsxs("div", { className: "bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uC8FC\uC18C" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: profile.address || '(등록된 주소가 없습니다)' })] }), _jsxs("div", { className: "bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uAC00\uC785\uC77C" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: new Date(profile.createdAt).toLocaleDateString() })] }), _jsxs("div", { className: "bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: "\uB9C8\uC9C0\uB9C9 \uB85C\uADF8\uC778" }), _jsx("dd", { className: "mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2", children: new Date(profile.lastLogin).toLocaleString() })] })] }) })), _jsxs("div", { className: "border-t border-gray-200 px-4 py-5 sm:px-6", children: [_jsx("h4", { className: "text-md font-medium text-gray-500 mb-4", children: "\uACC4\uC815 \uAD00\uB9AC" }), _jsxs("div", { className: "space-y-4", children: [_jsx("button", { onClick: () => navigate('/change-password'), className: "text-sm font-medium text-blue-600 hover:text-blue-500", children: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD" }), _jsxs("div", { children: [_jsx("button", { onClick: handleDeleteAccount, className: "text-sm font-medium text-red-600 hover:text-red-500", children: "\uACC4\uC815 \uC0AD\uC81C \uC694\uCCAD" }), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "\uACC4\uC815\uC744 \uC0AD\uC81C\uD558\uBA74 \uBAA8\uB4E0 \uB370\uC774\uD130\uAC00 \uC601\uAD6C\uC801\uC73C\uB85C \uC81C\uAC70\uB429\uB2C8\uB2E4." })] })] })] })] }) }));
};
export default ProfilePage;
