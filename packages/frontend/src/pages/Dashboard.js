import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, CardHeader, Typography, Button, Divider, LinearProgress, List, ListItem, ListItemText, ListItemIcon, Avatar, } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Schedule as ScheduleIcon, } from '@mui/icons-material';

// 차트 컴포넌트
import DashboardChart from '../components/dashboard/DashboardChart.jsx';

// 새로 추가한 컴포넌트들
import QuickActionCard from '../components/dashboard/QuickActionCard.jsx';
import NotificationsCard from '../components/dashboard/NotificationsCard.jsx';
import VehicleStatusCard from '../components/dashboard/VehicleStatusCard.jsx';
import MaintenanceGuideCard from '../components/dashboard/MaintenanceGuideCard.jsx';

// API 클라이언트
import apiClient from '../api-client';
import logger from '../utils/logger';

const Dashboard = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [error, setError] = useState(null);

    // API에서 데이터를 가져오는 효과
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 대시보드 데이터 API 호출
                const response = await apiClient.get('/dashboard');
                setDashboardData(response.data);
            }
            catch (error) {
                logger.error('대시보드 데이터 로딩 실패:', error);
                setError('대시보드 데이터를 불러오는데 실패했습니다.');
                // API 실패 시 기본 대시보드 데이터로 초기화 (실제 배포 시 제거)
                setDashboardData({
                    vehicles: {
                        total: 0,
                        active: 0,
                        maintenance: 0,
                        inactive: 0,
                    },
                    maintenance: {
                        completed: 0,
                        scheduled: 0,
                        inProgress: 0,
                        overdue: 0,
                    },
                    upcomingMaintenance: [],
                    recentMaintenance: []
                });
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getStatusColor = (priority) => {
        switch (priority.toLowerCase()) {
            case 'high':
                return 'error.main';
            case 'medium':
                return 'warning.main';
            default:
                return 'info.main';
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('ko-KR', options);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            currencyDisplay: 'symbol',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // 데이터가 없는 경우 표시할 컴포넌트
    if (!isLoading && !dashboardData) {
        return (_jsxs(Box, { sx: { textAlign: 'center', py: 5 }, children: [_jsx(Typography, { variant: "h5", color: "text.secondary", gutterBottom: true, children: error || '대시보드 데이터를 불러올 수 없습니다.' }), _jsx(Button, { variant: "contained", color: "primary", onClick: () => window.location.reload(), sx: { mt: 2 }, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }));
    }

    return (_jsxs(Box, { children: [
        // 헤더 부분
        _jsxs(Box, { sx: { mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "\uB300\uC2DC\uBCF4\uB4DC" }), _jsx(Button, { variant: "contained", color: "primary", onClick: () => navigate('/maintenance/new'), children: "+ \uC0C8 \uC815\uBE44 \uB4F1\uB85D" })] }),
        
        // 로딩 프로그레스 바
        isLoading ? (_jsx(LinearProgress, { sx: { mb: 4 } })) : dashboardData && (
            _jsxs(Box, { children: [
                // 빠른 액션 카드
                _jsx(QuickActionCard, { sx: { mb: 3 } }),
                
                // 메인 통계 카드들
                _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [
                    _jsx(Grid, { item: true, xs: 12, md: 6, lg: 3, children: _jsxs(Card, { children: [
                        _jsxs(CardContent, { children: [
                            _jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\uCD1D \uCC28\uB7C9" }),
                            _jsx(Typography, { variant: "h4", children: dashboardData.vehicles.total }),
                            _jsxs(Box, { sx: { display: 'flex', mt: 2, gap: 1 }, children: [
                                _jsxs(Box, { children: [
                                    _jsx(Typography, { variant: "caption", color: "textSecondary", children: "\uD65C\uC131" }),
                                    _jsx(Typography, { variant: "body2", color: "success.main", sx: { fontWeight: 'medium' }, children: dashboardData.vehicles.active })
                                ] }),
                                _jsxs(Box, { sx: { mx: 1 }, children: [
                                    _jsx(Typography, { variant: "caption", color: "textSecondary", children: "\uC815\uBE44 \uC911" }),
                                    _jsx(Typography, { variant: "body2", color: "warning.main", sx: { fontWeight: 'medium' }, children: dashboardData.vehicles.maintenance })
                                ] }),
                                _jsxs(Box, { children: [
                                    _jsx(Typography, { variant: "caption", color: "textSecondary", children: "\uBE44\uD65C\uC131" }),
                                    _jsx(Typography, { variant: "body2", color: "error.main", sx: { fontWeight: 'medium' }, children: dashboardData.vehicles.inactive })
                                ] })
                            ] })
                        ] }),
                        _jsx(Divider, {}),
                        _jsx(Box, { sx: { p: 1 }, children: _jsx(Button, { size: "small", onClick: () => navigate('/vehicles'), children: "\uCC28\uB7C9 \uBAA9\uB85D \uBCF4\uAE30" }) })
                    ] }) }),
                    
                    _jsx(Grid, { item: true, xs: 12, md: 6, lg: 3, children: _jsxs(Card, { children: [
                        _jsxs(CardContent, { children: [
                            _jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\uC815\uBE44 \uD604\uD669" }),
                            _jsx(Typography, { variant: "h4", children: dashboardData.maintenance.completed }),
                            _jsx(Typography, { variant: "body2", color: "textSecondary", sx: { mb: 1 }, children: "\uC644\uB8CC\uB41C \uC815\uBE44" }),
                            _jsxs(Box, { sx: { display: 'flex', mt: 2, gap: 1 }, children: [
                                _jsxs(Box, { children: [
                                    _jsx(Typography, { variant: "caption", color: "textSecondary", children: "\uC608\uC815\uB428" }),
                                    _jsx(Typography, { variant: "body2", color: "info.main", sx: { fontWeight: 'medium' }, children: dashboardData.maintenance.scheduled })
                                ] }),
                                _jsxs(Box, { sx: { mx: 1 }, children: [
                                    _jsx(Typography, { variant: "caption", color: "textSecondary", children: "\uC9C4\uD589 \uC911" }),
                                    _jsx(Typography, { variant: "body2", color: "warning.main", sx: { fontWeight: 'medium' }, children: dashboardData.maintenance.inProgress })
                                ] }),
                                _jsxs(Box, { children: [
                                    _jsx(Typography, { variant: "caption", color: "textSecondary", children: "\uC9C0\uC5F0\uB428" }),
                                    _jsx(Typography, { variant: "body2", color: "error.main", sx: { fontWeight: 'medium' }, children: dashboardData.maintenance.overdue })
                                ] })
                            ] })
                        ] }),
                        _jsx(Divider, {}),
                        _jsx(Box, { sx: { p: 1 }, children: _jsx(Button, { size: "small", onClick: () => navigate('/maintenance'), children: "\uC815\uBE44 \uC774\uB825 \uBCF4\uAE30" }) })
                    ] }) }),
                    
                    _jsx(Grid, { item: true, xs: 12, md: 6, lg: 3, children: _jsxs(Card, { children: [
                        _jsxs(CardContent, { children: [
                            _jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\uC774\uBC88 \uB2EC \uC815\uBE44 \uBE44\uC6A9" }),
                            _jsx(Typography, { variant: "h4", children: formatCurrency(1250000) }),
                            _jsx(Typography, { variant: "body2", color: "success.main", sx: { mt: 1 }, children: "\u2193 \uC9C0\uB09C\uB2EC \uB300\uBE44 12% \uAC10\uC18C" })
                        ] }),
                        _jsx(Divider, {}),
                        _jsx(Box, { sx: { p: 1 }, children: _jsx(Button, { size: "small", onClick: () => navigate('/reports'), children: "\uBE44\uC6A9 \uBCF4\uACE0\uC11C \uBCF4\uAE30" }) })
                    ] }) }),
                    
                    _jsx(Grid, { item: true, xs: 12, md: 6, lg: 3, children: _jsxs(Card, { children: [
                        _jsxs(CardContent, { children: [
                            _jsx(Typography, { color: "textSecondary", gutterBottom: true, children: "\uCC28\uB7C9 \uC885\uB958" }),
                            _jsxs(Box, { sx: { mt: 1 }, children: [
                                _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 0.5 }, children: [
                                    _jsx(Typography, { variant: "body2", children: "\uC2B9\uC6A9\uCC28" }),
                                    _jsx(Typography, { variant: "body2", children: "7\uB300" })
                                ] }),
                                _jsx(LinearProgress, { variant: "determinate", value: 58, sx: { mb: 1 } }),
                                _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 0.5 }, children: [
                                    _jsx(Typography, { variant: "body2", children: "SUV" }),
                                    _jsx(Typography, { variant: "body2", children: "3\uB300" })
                                ] }),
                                _jsx(LinearProgress, { variant: "determinate", value: 25, color: "secondary", sx: { mb: 1 } }),
                                _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 0.5 }, children: [
                                    _jsx(Typography, { variant: "body2", children: "\uD2B8\uB7ED" }),
                                    _jsx(Typography, { variant: "body2", children: "2\uB300" })
                                ] }),
                                _jsx(LinearProgress, { variant: "determinate", value: 17, color: "success", sx: { mb: 1 } })
                            ] })
                        ] }),
                        _jsx(Divider, {}),
                        _jsx(Box, { sx: { p: 1 }, children: _jsx(Button, { size: "small", onClick: () => navigate('/vehicles'), children: "\uCC28\uB7C9 \uBAA9\uB85D \uBCF4\uAE30" }) })
                    ] }) })
                ] }),
                
                // 차량 상태 대시보드
                _jsx(VehicleStatusCard, { sx: { mb: 3 } }),
                
                // 알림 및 리마인더와 차트
                _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [
                    _jsx(Grid, { item: true, xs: 12, lg: 8, children: _jsxs(Card, { children: [
                        _jsx(CardHeader, { title: "\uC815\uBE44 \uBE44\uC6A9 \uCD94\uC774" }),
                        _jsx(CardContent, { children: _jsx(DashboardChart, {}) })
                    ] }) }),
                    _jsx(Grid, { item: true, xs: 12, lg: 4, children: _jsx(NotificationsCard, {}) })
                ] }),
                
                // 예정된 정비 및 최근 완료된 정비
                _jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [
                    _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsxs(Card, { sx: { height: '100%' }, children: [
                        _jsx(CardHeader, { title: "\uC608\uC815\uB41C \uC815\uBE44", action: _jsx(Button, { size: "small", onClick: () => navigate('/maintenance?filter=scheduled'), children: "\uBAA8\uB450 \uBCF4\uAE30" }) }),
                        _jsxs(List, { children: [
                            dashboardData.upcomingMaintenance.map((item) => (_jsxs(ListItem, { 
                                onClick: () => navigate(`/maintenance/${item.id}`), 
                                sx: { cursor: 'pointer' }, 
                                children: [
                                    _jsx(ListItemIcon, { children: _jsx(Avatar, { sx: { bgcolor: getStatusColor(item.priority) }, children: _jsx(ScheduleIcon, {}) }) }),
                                    _jsx(ListItemText, { primary: item.vehicleName, secondary: `${formatDate(item.date)} - ${item.type}` })
                                ] 
                            }, item.id))),
                            dashboardData.upcomingMaintenance.length === 0 && (_jsx(ListItem, { children: _jsx(ListItemText, { 
                                primary: "\uC608\uC815\uB41C \uC815\uBE44\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.", 
                                secondary: "\uC0C8 \uC815\uBE44\uB97C \uC608\uC57D\uD558\uC138\uC694." 
                            }) }))
                        ] })
                    ] }) }),
                    
                    _jsx(Grid, { item: true, xs: 12, lg: 6, children: _jsxs(Card, { children: [
                        _jsx(CardHeader, { title: "\uCD5C\uADFC \uC644\uB8CC\uB41C \uC815\uBE44" }),
                        _jsx(List, { sx: { pt: 0 }, children: 
                            dashboardData.recentMaintenance.map((item) => (_jsxs(React.Fragment, { children: [
                                _jsxs(ListItem, { 
                                    onClick: () => navigate(`/maintenance/${item.id}`), 
                                    sx: { cursor: 'pointer' }, 
                                    children: [
                                        _jsx(ListItemIcon, { children: _jsx(Avatar, { sx: { bgcolor: 'success.main' }, children: _jsx(CheckCircleIcon, {}) }) }),
                                        _jsx(ListItemText, { primary: item.vehicleName, secondary: `${formatDate(item.date)} - ${item.type}` }),
                                        _jsx(Typography, { variant: "body2", children: formatCurrency(item.cost) })
                                    ] 
                                }),
                                _jsx(Divider, { component: "li" })
                            ] }, item.id))) 
                        })
                    ] }) })
                ] }),
                
                // 정비 가이드 및 팁 섹션 추가
                _jsx(MaintenanceGuideCard, { sx: { mb: 3 } })
            ] })
        ),
        
        error && (_jsx(Typography, { color: "error", sx: { mt: 2 }, children: error }))
    ] }));
};

export default Dashboard;
