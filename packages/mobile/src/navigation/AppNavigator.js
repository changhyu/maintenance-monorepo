import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
// 화면 임포트 (나중에 구현될 예정)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import VehicleListScreen from '../screens/vehicles/VehicleListScreen';
import VehicleDetailScreen from '../screens/vehicles/VehicleDetailScreen';
import MaintenanceListScreen from '../screens/maintenance/MaintenanceListScreen';
import MaintenanceDetailScreen from '../screens/maintenance/MaintenanceDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
const Stack = createNativeStackNavigator();
// 인증되지 않은 사용자를 위한 스택
const AuthStack = () => {
    return (_jsxs(Stack.Navigator, { screenOptions: { headerShown: false }, children: [_jsx(Stack.Screen, { name: "Login", component: LoginScreen }), _jsx(Stack.Screen, { name: "Register", component: RegisterScreen })] }));
};
// 인증된 사용자를 위한 스택
const MainStack = () => {
    return (_jsxs(Stack.Navigator, { children: [_jsx(Stack.Screen, { name: "Dashboard", component: DashboardScreen, options: { title: '대시보드' } }), _jsx(Stack.Screen, { name: "VehicleList", component: VehicleListScreen, options: { title: '차량 목록' } }), _jsx(Stack.Screen, { name: "VehicleDetail", component: VehicleDetailScreen, options: { title: '차량 상세' } }), _jsx(Stack.Screen, { name: "MaintenanceList", component: MaintenanceListScreen, options: { title: '정비 기록' } }), _jsx(Stack.Screen, { name: "MaintenanceDetail", component: MaintenanceDetailScreen, options: { title: '정비 상세' } }), _jsx(Stack.Screen, { name: "Profile", component: ProfileScreen, options: { title: '프로필' } }), _jsx(Stack.Screen, { name: "Settings", component: SettingsScreen, options: { title: '설정' } })] }));
};
export const AppNavigator = () => {
    const { isAuthenticated, isLoading } = useAuth();
    // 로딩 중일 경우 빈 화면 표시
    if (isLoading) {
        return null;
    }
    return isAuthenticated ? _jsx(MainStack, {}) : _jsx(AuthStack, {});
};
