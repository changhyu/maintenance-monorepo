import React from 'react';
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
import NoticesScreen from '../screens/notices/NoticesScreen';
import CarNewsScreen from '../screens/news/CarNewsScreen';
import NavigationScreen from '../screens/navigation/NavigationScreen';
import NavigationRouteScreen from '../screens/navigation/NavigationRouteScreen';
import SearchLocationScreen from '../screens/navigation/SearchLocationScreen';
import CachePerformanceView from '../components/CachePerformanceView';

// 스택 네비게이터 타입 정의
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  VehicleList: undefined;
  VehicleDetail: { id: string };
  MaintenanceList: { vehicleId?: string };
  MaintenanceDetail: { id: string };
  Profile: undefined;
  Settings: undefined;
  Notices: undefined;
  CarNews: undefined;
  Navigation: undefined;
  NavigationRoute: { 
    origin?: { latitude: number; longitude: number; name: string };
    destination?: { latitude: number; longitude: number; name: string }; 
  };
  SearchLocation: { purpose: 'origin' | 'destination' };
  CachePerformance: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// 인증되지 않은 사용자를 위한 스택
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// 인증된 사용자를 위한 스택
const MainStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: '대시보드' }} />
      <Stack.Screen name="VehicleList" component={VehicleListScreen} options={{ title: '차량 목록' }} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: '차량 상세' }} />
      <Stack.Screen name="MaintenanceList" component={MaintenanceListScreen} options={{ title: '정비 기록' }} />
      <Stack.Screen name="MaintenanceDetail" component={MaintenanceDetailScreen} options={{ title: '정비 상세' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '프로필' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
      <Stack.Screen name="Notices" component={NoticesScreen} options={{ title: '공지사항' }} />
      <Stack.Screen name="CarNews" component={CarNewsScreen} options={{ title: '자동차 뉴스' }} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: '네비게이션' }} />
      <Stack.Screen name="NavigationRoute" component={NavigationRouteScreen} options={{ title: '경로 안내' }} />
      <Stack.Screen name="SearchLocation" component={SearchLocationScreen} options={{ title: '위치 검색' }} />
      <Stack.Screen name="CachePerformance" component={CachePerformanceView} options={{ title: '캐시 성능 분석' }} />
    </Stack.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // 로딩 중일 경우 빈 화면 표시
  if (isLoading) {
    return null;
  }

  return isAuthenticated ? <MainStack /> : <AuthStack />;
};