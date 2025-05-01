import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { GeoPoint } from '../types';
import offlineMapService, { OfflineRegion } from '../services/OfflineMapService';
import OfflineMapViewer from '../components/OfflineMapViewer';

// 상세 화면 라우트 파라미터 타입
type OfflineMapDetailRouteParams = {
  regionId: string;
};

export const OfflineMapDetailScreen = () => {
  const route = useRoute<RouteProp<Record<string, OfflineMapDetailRouteParams>, string>>();
  const navigation = useNavigation<any>();
  const { regionId } = route.params;
  
  const [region, setRegion] = useState<OfflineRegion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 지역 정보 로드
  useEffect(() => {
    const loadRegionInfo = () => {
      try {
        const regionData = offlineMapService.getRegion(regionId);
        if (!regionData) {
          setError('지역 정보를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        setRegion(regionData);
        
        // 마지막 업데이트 날짜 포맷
        if (regionData.lastUpdated) {
          const date = new Date(regionData.lastUpdated);
          setLastUpdated(date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }));
        } else {
          setLastUpdated('알 수 없음');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('지역 정보 로드 실패:', err);
        setError('지역 정보를 로드하는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    loadRegionInfo();
  }, [regionId]);

  // 지역 업데이트
  const handleUpdateRegion = () => {
    if (!region) return;
    
    Alert.alert(
      '지역 업데이트',
      `"${region.name}" 지역을 업데이트하시겠습니까? 기존 데이터가 삭제되고 다시 다운로드됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '업데이트', 
          onPress: async () => {
            try {
              // 기존 지역 삭제 후 다시 다운로드
              await offlineMapService.deleteRegion(regionId);
              
              await offlineMapService.downloadRegion({
                id: region.id,
                name: region.name,
                bounds: region.bounds,
                sizeInMB: region.sizeInMB
              });
              
              Alert.alert('알림', '지역 업데이트가 시작되었습니다.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('오류', `업데이트 중 문제가 발생했습니다: ${error}`);
            }
          }
        }
      ]
    );
  };

  // 지역 삭제
  const handleDeleteRegion = () => {
    if (!region) return;
    
    Alert.alert(
      '지역 삭제',
      `"${region.name}" 지역을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineMapService.deleteRegion(regionId);
              Alert.alert('성공', '지역이 삭제되었습니다.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('오류', `삭제 중 문제가 발생했습니다: ${error}`);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>지역 정보를 로드하는 중...</Text>
      </SafeAreaView>
    );
  }

  if (error || !region) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error || '지역 정보를 찾을 수 없습니다.'}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{region.name} 지도</Text>
        
        {/* 오프라인 지도 뷰어 */}
        <View style={styles.mapContainer}>
          <OfflineMapViewer 
            regionId={regionId}
            height={300}
            showMarkers
          />
        </View>
        
        {/* 지역 정보 */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>지역 정보</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>상태:</Text>
              <Text style={[
                styles.infoValue,
                { color: getStatusColor(region.status) }
              ]}>
                {getStatusText(region.status)}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>크기:</Text>
              <Text style={styles.infoValue}>{region.sizeInMB}MB</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>좌표 범위:</Text>
            </View>
            
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>북동:</Text>
              <Text style={styles.coordValue}>
                {region.bounds.northeast.latitude.toFixed(6)}, {region.bounds.northeast.longitude.toFixed(6)}
              </Text>
            </View>
            
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>남서:</Text>
              <Text style={styles.coordValue}>
                {region.bounds.southwest.latitude.toFixed(6)}, {region.bounds.southwest.longitude.toFixed(6)}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>마지막 업데이트:</Text>
              <Text style={styles.infoValue}>{lastUpdated}</Text>
            </View>
          </View>
        </View>
        
        {/* 통계 정보 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>사용 통계</Text>
          
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>총 방문 횟수:</Text>
              <Text style={styles.statsValue}>3회</Text>
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>경로 탐색 횟수:</Text>
              <Text style={styles.statsValue}>1회</Text>
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>마지막 접근 시간:</Text>
              <Text style={styles.statsValue}>2시간 전</Text>
            </View>
          </View>
        </View>
        
        {/* 관리 버튼 */}
        <View style={styles.actionsSection}>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.updateButton]} 
              onPress={handleUpdateRegion}
            >
              <Text style={styles.buttonText}>업데이트</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.deleteButton]} 
              onPress={handleDeleteRegion}
            >
              <Text style={styles.buttonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 상태 텍스트 변환
const getStatusText = (status: string): string => {
  switch (status) {
    case 'available': return '사용 가능';
    case 'downloading': return '다운로드 중';
    case 'outdated': return '업데이트 필요';
    case 'error': return '오류';
    default: return '알 수 없음';
  }
};

// 상태에 따른 색상
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'available': return '#27ae60';
    case 'downloading': return '#3498db';
    case 'outdated': return '#f39c12';
    case 'error': return '#e74c3c';
    default: return '#95a5a6';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3498db',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
    padding: 20,
    marginBottom: 20,
  },
  mapContainer: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#34495e',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
  },
  coordRow: {
    flexDirection: 'row',
    paddingLeft: 16,
    marginBottom: 8,
  },
  coordLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    width: 50,
  },
  coordValue: {
    fontSize: 14,
    color: '#3498db',
  },
  statsSection: {
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsLabel: {
    fontSize: 15,
    color: '#7f8c8d',
  },
  statsValue: {
    fontSize: 15,
    color: '#3498db',
    fontWeight: '600',
  },
  actionsSection: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  updateButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OfflineMapDetailScreen;