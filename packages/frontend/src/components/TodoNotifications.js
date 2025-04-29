import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { BellOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import { Badge, Dropdown, Button, List, Space, Typography, Tag, Tabs, Empty } from 'antd';
import todoNotificationService, { NotificationType } from '../services/todoNotificationService';
import { formatRelativeTime } from '../utils/dateUtils';
/**
 * 알림 타입에 따른 태그 색상 매핑
 */
const typeColorMap = {
    [NotificationType.UPCOMING_DUE]: 'blue',
    [NotificationType.OVERDUE]: 'red',
    [NotificationType.STATUS_CHANGE]: 'green',
    [NotificationType.PRIORITY_HIGH]: 'orange',
    [NotificationType.GENERAL]: 'default'
};
/**
 * 알림 타입 한글 이름 매핑
 */
const typeNameMap = {
    [NotificationType.UPCOMING_DUE]: '마감 임박',
    [NotificationType.OVERDUE]: '기한 초과',
    [NotificationType.STATUS_CHANGE]: '상태 변경',
    [NotificationType.PRIORITY_HIGH]: '높은 우선순위',
    [NotificationType.GENERAL]: '일반'
};
// NotificationItem 컴포넌트를 외부로 이동
const NotificationItem = ({ notification, onDelete, onClick }) => (_jsx(List.Item, { onClick: () => onClick(notification), actions: [
        _jsx(Button, { type: "text", size: "small", icon: _jsx(DeleteOutlined, {}), onClick: (e) => onDelete(notification, e) }, "delete")
    ], children: _jsx(List.Item.Meta, { title: notification.title, description: _jsxs(Space, { direction: "vertical", size: 2, children: [_jsx(Typography.Text, { type: "secondary", children: formatRelativeTime(notification.createdAt) }), _jsx(Tag, { color: typeColorMap[notification.type], children: typeNameMap[notification.type] })] }) }) }, notification.id));
const NotificationDropdownContent = ({ notifications, activeTabKey, sortByPriority, onTabChange, onSort, onClearAll, onClearByType, onDelete, onNotificationClick }) => {
    // 현재 탭에 맞는 알림 필터링
    const getFilteredNotifications = () => {
        if (activeTabKey === 'all') {
            return notifications;
        }
        return notifications.filter(notification => notification.type === activeTabKey);
    };
    // 알림 목록 렌더링
    const renderNotifications = () => {
        const filteredNotifications = getFilteredNotifications();
        if (filteredNotifications.length === 0) {
            return [];
        }
        return filteredNotifications.map(notification => (_jsx(NotificationItem, { notification: notification, onDelete: onDelete, onClick: onNotificationClick }, notification.id)));
    };
    // 탭 아이템 생성
    const tabItems = [
        {
            key: 'all',
            label: (_jsxs("span", { children: ["\uC804\uCCB4", _jsx(Badge, { count: notifications.length, size: "small", style: { marginLeft: 5 }, overflowCount: 99 })] }))
        },
        ...Object.values(NotificationType).map(type => {
            const count = todoNotificationService.getUnreadCountByType(type);
            return {
                key: type,
                label: (_jsxs("span", { children: [typeNameMap[type], _jsx(Badge, { count: count, size: "small", style: { marginLeft: 5 }, overflowCount: 99 })] }))
            };
        })
    ];
    return (_jsxs("div", { className: "notification-dropdown", style: { width: 350, maxHeight: 400, overflow: 'auto' }, children: [_jsxs("div", { className: "notification-header", style: {
                    padding: '10px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between'
                }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "\uC54C\uB9BC" }), _jsxs(Space, { children: [_jsx(Button, { type: "text", size: "small", icon: _jsx(FilterOutlined, {}), onClick: onSort, title: sortByPriority ? '시간순 정렬' : '우선순위순 정렬' }), _jsx(Button, { type: "text", size: "small", icon: _jsx(DeleteOutlined, {}), onClick: onClearAll, title: "\uBAA8\uB4E0 \uC54C\uB9BC \uC0AD\uC81C" })] })] }), _jsx(Tabs, { activeKey: activeTabKey, onChange: onTabChange, tabBarStyle: { padding: '0 10px' }, tabBarExtraContent: _jsx(Button, { type: "text", size: "small", onClick: () => onClearByType(activeTabKey), title: "\uD604\uC7AC \uD0ED\uC758 \uC54C\uB9BC \uC0AD\uC81C", children: "\uC9C0\uC6B0\uAE30" }), items: tabItems }), _jsx(List, { dataSource: renderNotifications(), renderItem: (item) => item, locale: {
                    emptyText: (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "\uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4", style: { margin: '20px 0' } }))
                } })] }));
};
/**
 * Todo 알림 컴포넌트
 */
const TodoNotifications = ({ className = '', onTodoClick }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [visible, setVisible] = useState(false);
    const [activeTabKey, setActiveTabKey] = useState('all');
    const [sortByPriority, setSortByPriority] = useState(true);
    // 알림 구독
    useEffect(() => {
        const unsubscribe = todoNotificationService.subscribeToNotifications(newNotifications => {
            if (sortByPriority) {
                setNotifications(todoNotificationService.getSortedNotifications());
            }
            else {
                setNotifications(newNotifications);
            }
            setUnreadCount(todoNotificationService.getUnreadCount());
        });
        return () => unsubscribe();
    }, [sortByPriority]);
    // 알림 권한 요청
    useEffect(() => {
        const requestPermission = async () => {
            await todoNotificationService.requestNotificationPermission();
        };
        requestPermission();
    }, []);
    // 알림 드롭다운 토글
    const toggleNotifications = () => {
        setVisible(!visible);
        if (!visible) {
            // 드롭다운 열 때 자동으로 읽음 처리
            todoNotificationService.markAllAsRead();
            setUnreadCount(0);
        }
    };
    // 알림 삭제
    const handleDelete = (notification, e) => {
        e.stopPropagation();
        todoNotificationService.deleteNotification(notification.id);
    };
    // 모든 알림 삭제
    const handleClearAll = () => {
        todoNotificationService.clearAllNotifications();
    };
    // 특정 타입의 알림만 삭제
    const handleClearByType = (type) => {
        if (type === 'all') {
            todoNotificationService.clearAllNotifications();
        }
        else {
            todoNotificationService.clearNotificationsByType(type);
        }
    };
    // 알림 클릭 처리
    const handleNotificationClick = (notification) => {
        if (onTodoClick && notification.todoId) {
            onTodoClick(notification.todoId);
        }
        setVisible(false);
    };
    // 정렬 토글
    const toggleSort = () => {
        setSortByPriority(!sortByPriority);
    };
    // 탭 변경 처리
    const handleTabChange = (key) => {
        setActiveTabKey(key);
    };
    return (_jsx("div", { className: `todo-notifications ${className}`, children: _jsx(Dropdown, { open: visible, onOpenChange: toggleNotifications, trigger: ['click'], dropdownRender: () => (_jsx(NotificationDropdownContent, { notifications: notifications, activeTabKey: activeTabKey, sortByPriority: sortByPriority, onTabChange: handleTabChange, onSort: toggleSort, onClearAll: handleClearAll, onClearByType: handleClearByType, onDelete: handleDelete, onNotificationClick: handleNotificationClick })), children: _jsx(Badge, { count: unreadCount, size: "small", children: _jsx(Button, { type: "text", icon: _jsx(BellOutlined, {}), className: "notification-button" }) }) }) }));
};
export default TodoNotifications;
