import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { notificationService } from '../../services/notificationService';
import { NotificationStatus, NotificationType } from '../../types/notification';
import { formatNotificationDate, getNotificationIcon, getNotificationColor, getNotificationPriorityLabel, groupNotificationsByDate } from '../../utils/notificationUtils';
/**
 * 알림 관리 센터 컴포넌트
 */
const NotificationCenter = ({ userId, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [groupedNotifications, setGroupedNotifications] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [filter, setFilter] = useState({});
    // 알림 데이터 로드
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                const result = await notificationService.getNotifications({ userId });
                setNotifications(result);
            }
            catch (error) {
                console.error('알림 목록 조회 실패:', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchNotifications();
        // 실시간 알림 업데이트
        const handleNotificationUpdate = (_) => {
            fetchNotifications();
        };
        notificationService.subscribeToNotifications(userId, handleNotificationUpdate);
        return () => {
            notificationService.unsubscribeFromNotifications();
        };
    }, [userId]);
    // 필터링 적용
    useEffect(() => {
        let filtered = [...notifications];
        // 탭 필터 적용
        if (activeTab === 'unread') {
            filtered = filtered.filter(notification => notification.status === NotificationStatus.UNREAD);
        }
        else if (activeTab === 'archived') {
            filtered = filtered.filter(notification => notification.status === NotificationStatus.ARCHIVED);
        }
        // 타입 필터 적용
        if (filter.type) {
            filtered = filtered.filter(notification => notification.type === filter.type);
        }
        // 검색어 필터 적용
        if (filter.searchTerm) {
            const searchLower = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(notification => notification.title.toLowerCase().includes(searchLower) ||
                notification.message.toLowerCase().includes(searchLower));
        }
        setFilteredNotifications(filtered);
        // 날짜별 그룹화
        const grouped = groupNotificationsByDate(filtered);
        setGroupedNotifications(grouped);
    }, [notifications, activeTab, filter]);
    // 알림 읽음 표시
    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            // 상태 업데이트
            setNotifications(prev => prev.map(notification => notification.id === notificationId
                ? { ...notification, status: NotificationStatus.READ }
                : notification));
        }
        catch (error) {
            console.error('알림 읽음 표시 실패:', error);
        }
    };
    // 알림 보관 처리
    const handleArchive = async (notificationId) => {
        try {
            await notificationService.archiveNotification(notificationId);
            // 상태 업데이트
            setNotifications(prev => prev.map(notification => notification.id === notificationId
                ? { ...notification, status: NotificationStatus.ARCHIVED }
                : notification));
        }
        catch (error) {
            console.error('알림 보관 처리 실패:', error);
        }
    };
    // 모든 알림 읽음 표시
    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead(userId);
            // 상태 업데이트
            setNotifications(prev => prev.map(notification => notification.status === NotificationStatus.UNREAD
                ? { ...notification, status: NotificationStatus.READ }
                : notification));
        }
        catch (error) {
            console.error('모든 알림 읽음 표시 실패:', error);
        }
    };
    // 검색어 필터 업데이트
    const handleSearchChange = (e) => {
        setFilter(prev => ({ ...prev, searchTerm: e.target.value }));
    };
    // 타입 필터 업데이트
    const handleTypeChange = (e) => {
        const value = e.target.value;
        setFilter(prev => ({ ...prev, type: value || undefined }));
    };
    return (_jsxs("div", { className: "bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "p-4 border-b flex justify-between items-center bg-gray-50", children: [_jsx("h2", { className: "text-xl font-semibold", children: "\uC54C\uB9BC \uC13C\uD130" }), onClose && (_jsx("button", { onClick: onClose, className: "text-gray-500 hover:text-gray-700", children: _jsx("i", { className: "fas fa-times" }) }))] }), _jsx("div", { className: "p-4 border-b bg-gray-50", children: _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsx("div", { className: "flex-1 min-w-[200px]", children: _jsx("input", { type: "text", placeholder: "\uC54C\uB9BC \uAC80\uC0C9...", className: "w-full px-3 py-2 border rounded-md", value: filter.searchTerm || '', onChange: handleSearchChange }) }), _jsx("div", { className: "w-48", children: _jsxs("select", { className: "w-full px-3 py-2 border rounded-md", value: filter.type || '', onChange: handleTypeChange, children: [_jsx("option", { value: "", children: "\uBAA8\uB4E0 \uC720\uD615" }), Object.values(NotificationType).map(type => (_jsx("option", { value: type, children: type }, type)))] }) }), _jsx("button", { onClick: handleMarkAllAsRead, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700", disabled: loading, children: "\uBAA8\uB450 \uC77D\uC74C \uD45C\uC2DC" })] }) }), _jsxs("div", { className: "flex border-b", children: [_jsx("button", { className: `flex-1 py-3 font-medium text-center ${activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`, onClick: () => setActiveTab('all'), children: "\uC804\uCCB4" }), _jsx("button", { className: `flex-1 py-3 font-medium text-center ${activeTab === 'unread' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`, onClick: () => setActiveTab('unread'), children: "\uC77D\uC9C0 \uC54A\uC74C" }), _jsx("button", { className: `flex-1 py-3 font-medium text-center ${activeTab === 'archived' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`, onClick: () => setActiveTab('archived'), children: "\uBCF4\uAD00\uB428" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: loading ? (_jsx("div", { className: "flex justify-center items-center h-full", children: _jsx("p", { className: "text-gray-500", children: "\uB85C\uB529 \uC911..." }) })) : filteredNotifications.length === 0 ? (_jsx("div", { className: "flex justify-center items-center h-full", children: _jsx("p", { className: "text-gray-500", children: "\uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) : (_jsx("div", { className: "space-y-6", children: Object.entries(groupedNotifications).map(([date, notifications]) => (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 sticky top-0 bg-white py-2", children: new Date(date).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) }), _jsx("div", { className: "space-y-2", children: notifications.map(notification => (_jsx("div", { className: `border rounded-lg overflow-hidden transition-colors duration-200 ${notification.status === NotificationStatus.UNREAD
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white'}`, children: _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4", style: { backgroundColor: getNotificationColor(notification.type) }, children: _jsx("i", { className: `fas fa-${getNotificationIcon(notification.type)} text-white` }) }), _jsxs("div", { className: "flex-grow min-w-0", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx("h4", { className: "font-semibold text-gray-900", children: notification.title }), _jsx("span", { className: "text-xs text-gray-500 ml-2 whitespace-nowrap", children: formatNotificationDate(notification.createdAt) })] }), _jsx("p", { className: "text-gray-700 mt-1", children: notification.message }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-2", children: [_jsx("span", { className: "inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800", children: notification.type }), _jsx("span", { className: "inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800", children: getNotificationPriorityLabel(notification.priority) })] })] })] }), _jsxs("div", { className: "flex justify-end mt-3 space-x-2", children: [notification.status === NotificationStatus.UNREAD && (_jsx("button", { onClick: () => handleMarkAsRead(notification.id), className: "px-3 py-1 text-sm text-blue-600 hover:text-blue-800", children: "\uC77D\uC74C \uD45C\uC2DC" })), notification.status !== NotificationStatus.ARCHIVED && (_jsx("button", { onClick: () => handleArchive(notification.id), className: "px-3 py-1 text-sm text-gray-600 hover:text-gray-800", children: "\uBCF4\uAD00" })), notification.link && (_jsx("a", { href: notification.link, className: "px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700", target: "_blank", rel: "noreferrer", children: "\uC790\uC138\uD788 \uBCF4\uAE30" }))] })] }) }, notification.id))) })] }, date))) })) })] }));
};
export default NotificationCenter;
