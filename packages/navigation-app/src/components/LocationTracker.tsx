import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useNavigationStore } from '../stores/navigationStore';

interface LocationTrackerProps {
  showControls?: boolean;
}

/**
 * 사용자 위치를 트래킹하고 시각화하는 컴포넌트
 */
export const LocationTracker: React.FC<LocationTrackerProps> = ({
  showControls = true,
}) => {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  
  const {
    currentLocation,
    locationHistory,
    isTracking,
    permissionGranted,
    activity,
    startTracking,
    stopTracking,
    updateOptions,
    getOptions,
    getAverageSpeed,
  } = useLocationTracking();
  
  const { setUserLocation } = useNavigationStore();
  
  // 트래킹 시작/중지
  const toggleTracking = async () => {
    if (isTracking) {
      stopTracking();
    } else {
      const success = await startTracking();
      if (!success && permissionGranted === false) {
        alert('위치 권한이 필요합니다. 앱 설정에서 권한을 허용해주세요.');
      }
    }
  };
  
  // 네비게이션 스토어에 위치 업데이트
  React.useEffect(() => {
    if (currentLocation) {
      setUserLocation(currentLocation.position);
    }
  }, [currentLocation, setUserLocation]);
  
  // 설정 변경 핸들러
  const handleSmoothingChange = (value: number) => {
    updateOptions({ smoothingFactor: value });
  };
  
  const handleUpdateIntervalChange = (value: number) => {
    updateOptions({ updateInterval: value * 1000 }); // 초 -> 밀리초
  };
  
  const toggleSmoothing = () => {
    const options = getOptions();
    if (options) {
      updateOptions({ smoothing: !options.smoothing });
    }
  };
  
  const togglePredictive = () => {
    const options = getOptions();
    if (options) {
      updateOptions({ predictiveTracking: !options.predictiveTracking });
    }
  };
  
  // 현재 옵션 가져오기
  const options = getOptions() || {
    smoothing: true,
    smoothingFactor: 0.3,
    predictiveTracking: true,
    updateInterval: 1000,
  };
  
  // 속도 포맷
  const formatSpeed = (speedInMps: number | null): string => {
    if (speedInMps === null) return '-- m/s';
    
    const kmh = speedInMps * 3.6; // m/s -> km/h
    return `${kmh.toFixed(1)} km/h`;
  };
  
  // 타임스탬프 포맷
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // 활동 상태 아이콘
  const getActivityIcon = () => {
    switch (activity) {
      case 'stationary':
        return <MaterialIcons name="accessibility" size={24} color="#666" />;
      case 'walking':
        return <MaterialIcons name="directions-walk" size={24} color="#4CAF50" />;
      case 'running':
        return <MaterialIcons name="directions-run" size={24} color="#FF9800" />;
      case 'cycling':
        return <MaterialIcons name="directions-bike" size={24} color="#9C27B0" />;
      case 'driving':
        return <MaterialIcons name="directions-car" size={24} color="#2196F3" />;
      default:
        return <MaterialIcons name="help" size={24} color="#999" />;
    }
  };
  
  if (!showControls) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {/* 현재 위치 정보 요약 */}
      <View style={styles.statusContainer}>
        {currentLocation ? (
          <>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#3498db" />
              <Text style={styles.locationText}>
                {currentLocation.position.latitude.toFixed(6)}, {currentLocation.position.longitude.toFixed(6)}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="speedometer-outline" size={16} color="#333" />
                <Text style={styles.infoText}>{formatSpeed(getAverageSpeed())}</Text>
              </View>
              
              <View style={styles.infoItem}>
                {currentLocation.heading !== null && (
                  <>
                    <Ionicons name="compass-outline" size={16} color="#333" style={{ transform: [{ rotate: `${currentLocation.heading}deg` }] }} />
                    <Text style={styles.infoText}>{Math.round(currentLocation.heading)}°</Text>
                  </>
                )}
              </View>
              
              <View style={styles.infoItem}>
                {getActivityIcon()}
                <Text style={styles.infoText}>{activity}</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noLocationText}>위치 정보 없음</Text>
        )}
      </View>

      {/* 트래킹 버튼들 */}
      <View style={styles.buttonContainer}>
        {/* 트래킹 시작/중지 버튼 */}
        <TouchableOpacity style={styles.trackButton} onPress={toggleTracking}>
          <Ionicons
            name={isTracking ? "pause" : "play"}
            size={22}
            color={isTracking ? "#e74c3c" : "#2ecc71"}
          />
        </TouchableOpacity>
        
        {/* 설정 버튼 */}
        <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
          <Ionicons name="settings-outline" size={20} color="#555" />
        </TouchableOpacity>
        
        {/* 히스토리 버튼 */}
        <TouchableOpacity style={styles.historyButton} onPress={() => setHistoryVisible(true)}>
          <Ionicons name="time-outline" size={20} color="#555" />
          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>{locationHistory.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 설정 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>위치 트래킹 설정</Text>
            
            {/* 위치 스무딩 설정 */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>위치 데이터 스무딩</Text>
              <TouchableOpacity onPress={toggleSmoothing}>
                <View style={[styles.switch, options.smoothing ? styles.switchOn : styles.switchOff]}>
                  <View style={[styles.switchThumb, options.smoothing ? styles.switchThumbOn : styles.switchThumbOff]} />
                </View>
              </TouchableOpacity>
            </View>
            
            {options.smoothing && (
              <View style={styles.sliderContainer}>
                <Text style={styles.settingSubLabel}>스무딩 강도</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.1}
                  maximumValue={0.9}
                  step={0.1}
                  value={options.smoothingFactor}
                  onValueChange={handleSmoothingChange}
                  minimumTrackTintColor="#3498db"
                  maximumTrackTintColor="#bdc3c7"
                  thumbTintColor="#3498db"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>적음</Text>
                  <Text style={styles.sliderValue}>{options.smoothingFactor.toFixed(1)}</Text>
                  <Text style={styles.sliderLabel}>많음</Text>
                </View>
              </View>
            )}
            
            {/* 예측 트래킹 설정 */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>예측 위치 계산</Text>
              <TouchableOpacity onPress={togglePredictive}>
                <View style={[styles.switch, options.predictiveTracking ? styles.switchOn : styles.switchOff]}>
                  <View style={[styles.switchThumb, options.predictiveTracking ? styles.switchThumbOn : styles.switchThumbOff]} />
                </View>
              </TouchableOpacity>
            </View>
            
            {/* 업데이트 간격 설정 */}
            <View style={styles.sliderContainer}>
              <Text style={styles.settingLabel}>업데이트 간격</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.2}
                maximumValue={5}
                step={0.2}
                value={options.updateInterval / 1000}
                onValueChange={handleUpdateIntervalChange}
                minimumTrackTintColor="#3498db"
                maximumTrackTintColor="#bdc3c7"
                thumbTintColor="#3498db"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>빠르게</Text>
                <Text style={styles.sliderValue}>{(options.updateInterval / 1000).toFixed(1)}초</Text>
                <Text style={styles.sliderLabel}>느리게</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsVisible(false)}>
              <Text style={styles.closeButtonText}>설정 저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 위치 히스토리 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyVisible}
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.historyModalContent]}>
            <Text style={styles.modalTitle}>위치 히스토리</Text>
            
            <ScrollView style={styles.historyList}>
              {locationHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>위치 기록 없음</Text>
              ) : (
                locationHistory.map((loc, index) => (
                  <View key={index} style={styles.historyItem}>
                    <Text style={styles.historyTime}>{formatTime(loc.timestamp)}</Text>
                    <Text style={styles.historyLocation}>
                      {loc.position.latitude.toFixed(6)}, {loc.position.longitude.toFixed(6)}
                    </Text>
                    <View style={styles.historyDetails}>
                      {loc.speed !== null && (
                        <Text style={styles.historyDetail}>
                          <Ionicons name="speedometer-outline" size={12} color="#666" />
                          {' '}{(loc.speed * 3.6).toFixed(1)} km/h
                        </Text>
                      )}
                      {loc.heading !== null && (
                        <Text style={styles.historyDetail}>
                          <Ionicons name="compass-outline" size={12} color="#666" />
                          {' '}{Math.round(loc.heading)}°
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setHistoryVisible(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 6,
    color: '#333',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  noLocationText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  historyModalContent: {
    height: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingSubLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  switchOn: {
    backgroundColor: '#3498db',
  },
  switchOff: {
    backgroundColor: '#bdc3c7',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  switchThumbOff: {
    transform: [{ translateX: 0 }],
  },
  sliderContainer: {
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
  },
  sliderValue: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyList: {
    maxHeight: 400,
  },
  emptyHistoryText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#999',
    fontStyle: 'italic',
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  historyLocation: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  historyDetails: {
    flexDirection: 'row',
    marginTop: 4,
  },
  historyDetail: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
});