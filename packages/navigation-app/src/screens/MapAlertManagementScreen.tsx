import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import LocationAlertService, { LocationAlert } from '../services/LocationAlertService';
import { useTheme } from '../themes/ThemeContext';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export const MapAlertManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [alerts, setAlerts] = useState<LocationAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<LocationAlert | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.5665, // 서울 기본 위치
    longitude: 126.9780,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });

  // 알림 목록 로드
  const loadAlerts = useCallback(() => {
    const allAlerts = LocationAlertService.getAllAlerts();
    setAlerts(allAlerts);

    // 알림이 있으면 첫번째 알림 위치로 맵 이동
    if (allAlerts.length > 0) {
      setMapRegion(prev => ({
        ...prev,
        latitude: allAlerts[0].location.latitude,
        longitude: allAlerts[0].location.longitude
      }));
    }
  }, []);

  // 화면이 포커스 될 때마다 알림 목록 로드
  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  // 알림 활성화/비활성화 토글
  const toggleAlertActive = async (id: string, active: boolean) => {
    await LocationAlertService.setAlertActive(id, active);
    loadAlerts();
  };

  // 알림 삭제
  const deleteAlert = async (alert: LocationAlert) => {
    Alert.alert(
      '위치 알림 삭제',
      `"${alert.name}" 알림을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            await LocationAlertService.deleteAlert(alert.id);
            setShowInfoModal(false);
            setSelectedAlert(null);
            loadAlerts();
          }
        }
      ]
    );
  };

  // 알림 편집 화면으로 이동
  const goToEditAlert = (alert: LocationAlert) => {
    setShowInfoModal(false);
    setSelectedAlert(null);
    navigation.navigate('LocationAlert');
    // 여기에 알림 ID를 파라미터로 전달하여 편집 모드로 열릴 수 있도록 구현할 수 있음
  };

  // 마커 색상 결정
  const getMarkerColor = (alert: LocationAlert) => {
    if (!alert.active) return '#777777'; // 비활성화
    if (alert.notified) return '#ff9500'; // 알림됨
    
    switch (alert.type) {
      case 'proximity': return '#5856d6'; // 근접 알림
      case 'geofence': return '#ff2d55';  // 영역 알림
      case 'destination': return '#30d158'; // 목적지 알림
      default: return '#007aff';
    }
  };

  // 마커 아이콘 결정
  const getMarkerIcon = (alert: LocationAlert) => {
    switch (alert.type) {
      case 'proximity': return 'navigate-circle';
      case 'geofence': return 'map';
      case 'destination': return 'flag';
      default: return 'location';
    }
  };

  // 알림 타입 텍스트 반환
  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'proximity': return '근접 알림';
      case 'geofence': return '영역 알림';
      case 'destination': return '목적지 알림';
      default: return '위치 알림';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={true}
          showsCompass={true}
          showsScale={true}
        >
          {alerts.map(alert => (
            <React.Fragment key={alert.id}>
              <Marker
                coordinate={alert.location}
                onPress={() => {
                  setSelectedAlert(alert);
                  setShowInfoModal(true);
                }}
                pinColor={getMarkerColor(alert)}
              >
                <Callout tooltip>
                  <View style={[styles.callout, { backgroundColor: isDark ? '#333' : 'white' }]}>
                    <Text style={[styles.calloutTitle, { color: colors.text }]}>{alert.name}</Text>
                    <Text style={[styles.calloutSubtitle, { color: isDark ? '#ccc' : '#666' }]}>
                      {getAlertTypeText(alert.type)}
                    </Text>
                  </View>
                </Callout>
              </Marker>
              <Circle
                center={alert.location}
                radius={alert.radius}
                fillColor={`${getMarkerColor(alert)}40`} // 40% 투명도
                strokeColor={getMarkerColor(alert)}
                strokeWidth={alert.active ? 2 : 1}
              />
            </React.Fragment>
          ))}
        </MapView>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#5856d6' }]} />
            <Text style={styles.legendText}>근접 알림</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ff2d55' }]} />
            <Text style={styles.legendText}>영역 알림</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#30d158' }]} />
            <Text style={styles.legendText}>목적지 알림</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#777777' }]} />
            <Text style={styles.legendText}>비활성화</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('LocationAlert')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* 알림 정보 모달 */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInfoModal(false)}
      >
        {selectedAlert && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons 
                    name={getMarkerIcon(selectedAlert)} 
                    size={24}
                    color={getMarkerColor(selectedAlert)}
                    style={styles.modalIcon}
                  />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedAlert.name}
                  </Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => setShowInfoModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                {selectedAlert.description ? (
                  <Text style={[styles.description, { color: isDark ? '#ccc' : '#666' }]}>
                    {selectedAlert.description}
                  </Text>
                ) : null}
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>알림 유형:</Text>
                  <Text style={[styles.detailValue, { color: isDark ? '#ccc' : '#666' }]}>
                    {getAlertTypeText(selectedAlert.type)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>위치:</Text>
                  <Text style={[styles.detailValue, { color: isDark ? '#ccc' : '#666' }]}>
                    {selectedAlert.location.latitude.toFixed(5)}, {selectedAlert.location.longitude.toFixed(5)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>반경:</Text>
                  <Text style={[styles.detailValue, { color: isDark ? '#ccc' : '#666' }]}>
                    {selectedAlert.radius}미터
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>일회성:</Text>
                  <Text style={[styles.detailValue, { color: isDark ? '#ccc' : '#666' }]}>
                    {selectedAlert.oneTime ? '예' : '아니오'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>상태:</Text>
                  <View style={styles.statusContainer}>
                    {selectedAlert.active ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#30d158' }]}>
                        <Text style={styles.statusText}>활성화</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: '#777777' }]}>
                        <Text style={styles.statusText}>비활성화</Text>
                      </View>
                    )}
                    
                    {selectedAlert.notified && (
                      <View style={[styles.statusBadge, { backgroundColor: '#ff9500', marginLeft: 8 }]}>
                        <Text style={styles.statusText}>알림됨</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.toggleContainer}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>활성화 상태:</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton, 
                      { backgroundColor: selectedAlert.active ? '#30d158' : '#777777' }
                    ]}
                    onPress={() => toggleAlertActive(selectedAlert.id, !selectedAlert.active)}
                  >
                    <View style={[
                      styles.toggleIndicator,
                      { 
                        backgroundColor: 'white',
                        left: selectedAlert.active ? '50%' : 0
                      }
                    ]} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={() => goToEditAlert(selectedAlert)}
                  >
                    <Ionicons name="create-outline" size={18} color="white" style={styles.actionIcon} />
                    <Text style={styles.actionText}>편집</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#ff3b30' }]}
                    onPress={() => deleteAlert(selectedAlert)}
                  >
                    <Ionicons name="trash-outline" size={18} color="white" style={styles.actionIcon} />
                    <Text style={styles.actionText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legend: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  callout: {
    width: 160,
    padding: 10,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutSubtitle: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIcon: {
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  toggleLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    width: 60,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    padding: 3,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default MapAlertManagementScreen;