import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { DxfMapScreen } from './screens/DxfMapScreen';
import { ShpMapScreen } from './screens/ShpMapScreen';
import { OfflineMapScreen } from './screens/OfflineMapScreen';
import { MapSelectionScreen } from './screens/MapSelectionScreen'; 
import { OfflineMapDetailScreen } from './screens/OfflineMapDetailScreen';
import { VoiceSettingsScreen } from './screens/VoiceSettingsScreen';
import { AutoUpdateSettingsScreen } from './screens/AutoUpdateSettingsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LocationAlertScreen } from './screens/LocationAlertScreen';
import { MapAlertManagementScreen } from './screens/MapAlertManagementScreen';
import { AlertHistoryScreen } from './screens/AlertHistoryScreen';
import UnifiedSearchScreen from './screens/UnifiedSearchScreen';
import SearchResultDetailScreen from './screens/SearchResultDetailScreen';
import MultiRouteScreen from './screens/MultiRouteScreen';
import { TransportMode } from './types';
import { ThemeProvider, useTheme } from './themes/ThemeContext';

// 스택 네비게이터 타입 정의 업데이트
type RootStackParamList = {
  Navigation: undefined;
  Explore: undefined;
  OfflineMaps: undefined;
  Alerts: undefined;
  Settings: undefined;
  Details: { itemId: number };
  RouteDetails: { routeId: string };
  SearchPlace: undefined;
  OfflineMapDetails: { regionId: string };
  OfflineMapDetail: { regionId: string };
  MapSelection: undefined;
  VoiceSettings: undefined;
  AutoUpdateSettings: undefined;
  LocationAlert: undefined;
  MapAlertManagement: undefined;
  AlertHistory: undefined;
  Search: undefined;
  SearchResultDetail: { item: object };
  MultiRoute: undefined;
  Main: undefined;
};

// 탭 네비게이터 타입 정의 업데이트
type MainTabParamList = {
  Navigation: undefined;
  Explore: undefined;
  OfflineMaps: undefined;
  Alerts: undefined;
  Settings: undefined;
};

// 내비게이션 스택 타입 정의 추가
type NavigationStackParamList = {
  DxfMap: undefined;
  ShpMap: undefined;
  RouteOptions: { 
    origin?: { latitude: number; longitude: number; name: string };
    destination?: { latitude: number; longitude: number; name: string };
    transportMode?: TransportMode;
  };
};

// 알림 스택 타입 정의 추가
type AlertsStackParamList = {
  LocationAlert: undefined;
  MapAlertManagement: undefined;
  AlertHistory: undefined;
};

// 확장된 테마 타입 정의
type ExtendedThemeColors = {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  tabBarBackground: string;
  statusBar: string;
};

// Get icon name based on route name and focus state
const getIconName = (routeName: string, focused: boolean): string => {
  switch (routeName) {
    case 'Navigation':
      return focused ? 'navigate' : 'navigate-outline';
    case 'Explore':
      return focused ? 'map' : 'map-outline';
    case 'OfflineMaps':
      return focused ? 'download' : 'download-outline';
    case 'Alerts':
      return focused ? 'notifications' : 'notifications-outline';
    case 'Settings':
      return focused ? 'settings' : 'settings-outline';
    default:
      return 'help-outline';
  }
};

// Standalone component for tab bar icon
const TabBarIconComponent: React.FC<{
  focused: boolean;
  color: string;
  size: number;
  routeName: string;
}> = ({ focused, color, size, routeName }) => {
  const iconName = getIconName(routeName, focused);
  return <Ionicons name={iconName as React.ComponentProps<typeof Ionicons>['name']} size={size} color={color} />;
};

// Factory function to create tab bar icon configuration (returns a function)
const createTabBarIcon = (routeName: string) => {
  // This returns a function that matches the expected tabBarIcon signature
  return function TabBarIconFunction({ focused, color, size }: { focused: boolean; color: string; size: number }) {
    return <TabBarIconComponent focused={focused} color={color} size={size} routeName={routeName} />;
  };
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const NavigationStack = createStackNavigator<NavigationStackParamList>();
const AlertsStack = createStackNavigator<AlertsStackParamList>();

// 내비게이션 스택 컴포넌트 추가
const NavigationStackScreen: React.FC = () => {
  return (
    <NavigationStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2c3e50',
        },
        headerTintColor: 'white',
      }}
    >
      <NavigationStack.Screen 
        name="DxfMap" 
        component={DxfMapScreen} 
        options={{ title: 'DXF 지도' }} 
      />
      <NavigationStack.Screen 
        name="ShpMap" 
        component={ShpMapScreen} 
        options={{ title: 'SHP 지도' }} 
      />
    </NavigationStack.Navigator>
  );
};

// 알림 스택 네비게이터 추가
const AlertsStackScreen: React.FC = () => {
  const { colors } = useTheme();
  // Cast colors to ExtendedThemeColors
  const extendedColors = colors as unknown as ExtendedThemeColors;
  
  return (
    <AlertsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: extendedColors.tabBarBackground || '#2c3e50', // Provide fallback
        },
        headerTintColor: colors.text,
      }}
    >
      <AlertsStack.Screen 
        name="LocationAlert" 
        component={LocationAlertScreen} 
        options={{ title: '위치 알림 관리' }} 
      />
      <AlertsStack.Screen 
        name="MapAlertManagement" 
        component={MapAlertManagementScreen} 
        options={{ title: '지도에서 알림 보기', headerShown: false }} 
      />
      <AlertsStack.Screen 
        name="AlertHistory" 
        component={AlertHistoryScreen} 
        options={{ title: '알림 히스토리' }} 
      />
    </AlertsStack.Navigator>
  );
};

// Common tab navigator screen options (static)
const tabScreenOptions = {
  tabBarActiveTintColor: '#3498db',
  tabBarInactiveTintColor: '#bdc3c7',
  tabBarStyle: {
    backgroundColor: '#2c3e50',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
  headerStyle: {
    backgroundColor: '#2c3e50',
  },
  headerTintColor: 'white',
};

// 탭 네비게이터 컴포넌트 업데이트
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={tabScreenOptions}
    >
      <Tab.Screen 
        name="Navigation" 
        component={NavigationStackScreen} 
        options={{ 
          title: '내비게이션',
          tabBarLabel: '내비게이션',
          headerShown: false,
          tabBarIcon: createTabBarIcon('Navigation')
        }} 
      />
      <Tab.Screen 
        name="Explore" 
        component={DxfMapScreen} 
        options={{ 
          title: '지도 탐색',
          tabBarLabel: '탐색',
          tabBarIcon: createTabBarIcon('Explore')
        }} 
      />
      <Tab.Screen 
        name="OfflineMaps" 
        component={OfflineMapScreen} 
        options={{ 
          title: '오프라인 지도',
          tabBarLabel: '오프라인',
          tabBarIcon: createTabBarIcon('OfflineMaps')
        }} 
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsStackScreen} 
        options={{ 
          title: '위치 알림',
          tabBarLabel: '알림',
          headerShown: false,
          tabBarIcon: createTabBarIcon('Alerts')
        }} 
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ 
          title: '설정',
          tabBarLabel: '설정',
          tabBarIcon: createTabBarIcon('Settings')
        }} 
      />
    </Tab.Navigator>
  );
};

// 앱 내부 컴포넌트
const AppContent: React.FC = () => {
  const { colors, isDark } = useTheme();
  // Cast colors to ExtendedThemeColors
  const extendedColors = colors as unknown as ExtendedThemeColors;
  
  // 네비게이션 테마
  const navigationTheme = {
    ...isDark ? DarkTheme : DefaultTheme,
    colors: {
      ...isDark ? DarkTheme.colors : DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.notification,
    },
  };
  
  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={extendedColors.statusBar || '#2c3e50'} // Provide fallback
      />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false
          }}
        >
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen 
            name="MapSelection" 
            component={MapSelectionScreen} 
            options={{
              headerShown: true,
              title: '지도 영역 선택',
              headerStyle: {
                backgroundColor: extendedColors.tabBarBackground || '#2c3e50',
              },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen 
            name="OfflineMapDetail" 
            component={OfflineMapDetailScreen}
            options={{
              headerShown: true,
              title: '오프라인 지도 상세',
              headerStyle: {
                backgroundColor: extendedColors.tabBarBackground || '#2c3e50',
              },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen 
            name="VoiceSettings" 
            component={VoiceSettingsScreen}
            options={{
              headerShown: false,
              title: '음성 안내 상세 설정',
            }}
          />
          <Stack.Screen 
            name="AutoUpdateSettings" 
            component={AutoUpdateSettingsScreen}
            options={{
              headerShown: false,
              title: '자동 업데이트 설정',
            }}
          />
          <Stack.Screen 
            name="Search" 
            component={UnifiedSearchScreen}
            options={{
              headerShown: false,
              title: '통합 검색',
            }}
          />
          <Stack.Screen 
            name="SearchResultDetail" 
            component={SearchResultDetailScreen}
            options={{
              headerShown: true,
              title: '검색 결과 상세',
              headerStyle: {
                backgroundColor: extendedColors.tabBarBackground || '#2c3e50',
              },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen 
            name="MultiRoute" 
            // Fix for the type compatibility issue
            component={MultiRouteScreen as React.ComponentType<any>}
            options={{
              headerShown: true,
              title: '다중 경로 계획',
              headerStyle: {
                backgroundColor: extendedColors.tabBarBackground || '#2c3e50',
              },
              headerTintColor: colors.text,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;