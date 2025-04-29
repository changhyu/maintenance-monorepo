import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { notificationService } from '../../services/notificationService';
/**
 * 읽지 않은 알림 개수를 표시하는 배지 컴포넌트
 */
const NotificationBadge = ({ userId, onClick, className = '', limit = 99 }) => {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchNotificationCount = async () => {
            try {
                setLoading(true);
                const result = await notificationService.getNotificationCount();
                setCount(result.unread);
            }
            catch (error) {
                console.error('알림 수 조회 실패:', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchNotificationCount();
        // 실시간 알림 업데이트
        const handleNotificationUpdate = (_) => {
            fetchNotificationCount();
        };
        if (userId) {
            notificationService.subscribeToNotifications(userId, handleNotificationUpdate);
        }
        return () => {
            if (userId) {
                notificationService.unsubscribeFromNotifications();
            }
        };
    }, [userId]);
    // 개수가 0이면 표시하지 않음
    if (count === 0) {
        return null;
    }
    // limit을 초과할 경우 숫자 + '+' 표시
    const badgeText = count > limit ? `${limit}+` : count.toString();
    return (_jsx("span", { className: `inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full ${className} ${loading ? 'opacity-50' : ''}`, onClick: onClick, children: loading ? '...' : badgeText }));
};
export default NotificationBadge;
