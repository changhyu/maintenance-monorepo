import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
// Types
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LocationPoint } from '../../services/LocationService';
import { RouteStep, RouteInfo, calculateRoute } from '../../services/NavigationService';
import { RouteHistoryEntry } from '../../services/RouteHistoryService';
// Components
import CustomMapView from '../../components/map/MapView';
// UI 컴포넌트들을 index 파일에서 가져옵니다.
import {
  OfflineBar,
  RouteHeader,
  RouteSummary,
  NavigationControls,
  CurrentStepInfo,
  RouteStepsList,
  RouteHistoryPanel,
  ErrorView,
  LoadingView
} from './components';

type NavigationRouteProp = RouteProp<RootStackParamList, 'NavigationRoute'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NavigationRoute'>;

const NavigationRouteScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<NavigationRouteProp>();
  
  // State
  const [origin] = useState<LocationPoint | null>(route.params.origin ?? null);
  const [destination] = useState<LocationPoint | null>(route.params.destination ?? null);
  const [isOffline] = useState(false); // 상태는 유지하되 setter는 사용하지 않음
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [routeHistory] = useState<RouteHistoryEntry[]>([]);
  const [isSavingRoute] = useState(false);
  
  // 경로 계산 함수
  const calculateRouteInfo = async () => {
    if (!origin || !destination) {
      Alert.alert('경로 계산 오류', '출발지와 목적지를 모두 설정해주세요.');
      return;
    }
    
    setLoading(true);
    try {
      const result = await calculateRoute(origin, destination);
      setRouteInfo(result);
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      setInitError('경로를 계산하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 출발지와 목적지가 모두 설정되면 자동으로 경로 계산
  useEffect(() => {
    if (origin && destination) {
      calculateRouteInfo();
    }
  }, [origin, destination]);
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const startNavigation = () => {
    setNavigationStarted(true);
  };
  
  const stopNavigation = () => {
    setNavigationStarted(false);
  };
  
  const initializeServices = () => {
    setInitError(null);
    calculateRouteInfo();
  };
  
  const saveRoute = () => {
    alert('경로 저장 기능은 아직 구현되지 않았습니다.');
  };
  
  const getCurrentStepInfo = (): RouteStep | null => {
    if (!routeInfo || !navigationStarted || !routeInfo.steps || routeInfo.steps.length === 0) {
      return null;
    }
    return routeInfo.steps[currentStepIndex];
  };
  
  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const handleNextStep = () => {
    if (routeInfo && currentStepIndex < routeInfo.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  // Rendering logic
  if (initError) {
    return (
      <ErrorView 
        message={initError}
        onRetry={initializeServices}
      />
    );
  }
  
  if (loading) {
    return <LoadingView message="경로를 계산하는 중..." />;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {isOffline && (
        <OfflineBar 
          onPress={() => Alert.alert(
            '오프라인 모드',
            '인터넷 연결이 없습니다. 캐시된 데이터만 이용 가능합니다.'
          )}
        />
      )}
      <View style={styles.mapContainer}>
        <CustomMapView
          markers={[
            ...(origin ? [origin] : []),
            ...(destination ? [destination] : []),
          ]}
          route={routeInfo?.polyline ?? []}
          showsUserLocation={true}
          followsUserLocation={navigationStarted}
        />
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => setShowHistory(true)}
          >
            <MaterialIcons name="history" size={24} color="#0066FF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={toggleMute}
          >
            <MaterialIcons name={isMuted ? "volume-off" : "volume-up"} size={24} color="#0066FF" />
          </TouchableOpacity>
        </View>
      </View>
      {showHistory && routeHistory && (
        <RouteHistoryPanel
          routeHistory={routeHistory}
          onClose={() => setShowHistory(false)}
          onSelectRoute={() => alert('경로 선택 기능은 아직 구현되지 않았습니다.')}
        />
      )}
      <View style={styles.bottomSheet}>
        <RouteHeader
          origin={origin}
          destination={destination}
          onSelectOrigin={() => navigation.navigate('SearchLocation', { purpose: 'origin' })}
          onSelectDestination={() => navigation.navigate('SearchLocation', { purpose: 'destination' })}
        />
        {routeInfo ? (
          <>
            <RouteSummary
              totalDuration={routeInfo.totalDuration}
              totalDistance={routeInfo.totalDistance}
              onSaveRoute={saveRoute}
              isSaving={isSavingRoute}
            />
            {navigationStarted ? (
              <View style={styles.navigationContainer}>
                {getCurrentStepInfo() && (
                  <CurrentStepInfo step={getCurrentStepInfo()} />
                )}
                
                <NavigationControls
                  currentStepIndex={currentStepIndex}
                  totalSteps={routeInfo.steps.length}
                  onPrevious={handlePreviousStep}
                  onNext={handleNextStep}
                  onStop={stopNavigation}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.startButton}
                onPress={startNavigation}
              >
                <MaterialIcons name="navigation" size={24} color="white" />
                <Text style={styles.startButtonText}>안내 시작</Text>
              </TouchableOpacity>
            )}
            {!navigationStarted && routeInfo.steps && (
              <RouteStepsList steps={routeInfo.steps} />
            )}
          </>
        ) : (
          <View style={styles.noRouteContainer}>
            <Text style={styles.noRouteText}>
              출발지와 목적지를 설정하여 경로를 계산하세요
            </Text>
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculateRouteInfo}
              disabled={!origin || !destination}
            >
              <MaterialIcons name="directions" size={24} color="white" />
              <Text style={styles.calculateButtonText}>경로 계산</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// 스타일 정의
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  mapContainer: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '50%',
  },
  navigationContainer: {
    marginTop: 8,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#0066FF',
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noRouteContainer: {
    alignItems: 'center',
    padding: 16,
  },
  noRouteText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  calculateButton: {
    flexDirection: 'row',
    backgroundColor: '#0066FF',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
  },
  mapControlButton: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default NavigationRouteScreen;