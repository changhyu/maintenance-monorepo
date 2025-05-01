import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import offlineMapService, { OfflineRegion, OfflineMapStatus } from '../services/OfflineMapService';
import { useTheme } from '../themes/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const OfflineMapScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  // 지역 정보 로드
  useEffect(() => {
    loadRegions();
    
    // 다운로드 진행 상태 리스너 등록
    const progressListener = (regionId: string, progress: number) => {
      setDownloadProgress(prev => ({
        ...prev,
        [regionId]: progress
      }));
    };
    
    offlineMapService.addProgressListener(progressListener);
    
    return () => {
      offlineMapService.removeProgressListener(progressListener);
    };
  }, []);

  // 지역 정보 및 총 크기 로드
  const loadRegions = async () => {
    setLoading(true);
    try {
      const allRegions = offlineMapService.getAllRegions();
      setRegions(allRegions);
      setTotalSize(offlineMapService.getTotalCacheSize());
      
      // 업데이트 확인
      checkForUpdates();
    } catch (error) {
      console.error('오프라인 지역 로드 중 오류 발생:', error);
      Alert.alert('오류', '오프라인 지도 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 업데이트 확인
  const checkForUpdates = async () => {
    try {
      const outdatedRegions = await offlineMapService.checkForUpdates();
      if (outdatedRegions.length > 0) {
        Alert.alert(
          '지도 업데이트',
          `${outdatedRegions.length}개의 지도에 업데이트가 있습니다. 지금 업데이트하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            { text: '업데이트', onPress: () => updateRegions(outdatedRegions) }
          ]
        );
      }
    } catch (error) {
      console.error('업데이트 확인 중 오류 발생:', error);
    }
  };

  // 지역 업데이트
  const updateRegions = async (regionIds: string[]) => {
    for (const regionId of regionIds) {
      const region = offlineMapService.getRegion(regionId);
      if (region) {
        try {
          await offlineMapService.deleteRegion(regionId);
          await offlineMapService.downloadRegion({
            id: region.id,
            name: region.name,
            bounds: region.bounds,
            sizeInMB: region.sizeInMB
          });
        } catch (error) {
          console.error(`지역 ${region.name} 업데이트 중 오류:`, error);
        }
      }
    }
    loadRegions();
  };

  // 지도 영역 선택 화면으로 이동
  const navigateToMapSelection = () => {
    navigation.navigate('MapSelection');
  };

  // 자동 업데이트 설정 화면으로 이동
  const navigateToAutoUpdateSettings = () => {
    navigation.navigate('AutoUpdateSettings');
  };

  // 지역 상세 화면으로 이동
  const navigateToRegionDetail = (regionId: string) => {
    navigation.navigate('OfflineMapDetail', { regionId });
  };

  // 지역 삭제
  const deleteRegion = (regionId: string, regionName: string) => {
    Alert.alert(
      '지역 삭제',
      `정말로 ${regionName} 지역을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineMapService.deleteRegion(regionId);
              loadRegions();
            } catch (error) {
              console.error('지역 삭제 중 오류:', error);
              Alert.alert('오류', '지역을 삭제하는 중 문제가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  // 지역 상태에 따른 아이콘 및 색상
  const getStatusInfo = (status: OfflineMapStatus, progress?: number) => {
    switch (status) {
      case 'available':
        return { icon: '✓', color: '#27ae60', text: '사용 가능' };
      case 'downloading':
        return { icon: '↓', color: '#3498db', text: `다운로드 중 ${progress?.toFixed(0)}%` };
      case 'outdated':
        return { icon: '⟳', color: '#f39c12', text: '업데이트 필요' };
      case 'error':
        return { icon: '✗', color: '#e74c3c', text: '오류' };
      default:
        return { icon: '?', color: '#95a5a6', text: '알 수 없음' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>오프라인 지도 관리</Text>
      
      <View style={[styles.storageInfo, { backgroundColor: isDark ? '#2c3e50' : '#f1f2f6' }]}>
        <Text style={[styles.storageText, { color: colors.text }]}>
          총 사용 공간: {totalSize}MB / {offlineMapService.getTotalCacheSize()}MB
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: colors.primary }]}
        onPress={navigateToAutoUpdateSettings}
      >
        <Ionicons name="settings-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.settingsButtonText}>자동 업데이트 설정</Text>
      </TouchableOpacity>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={regions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const progress = downloadProgress[item.id] !== undefined 
              ? downloadProgress[item.id] 
              : item.downloadProgress || 0;
              
            const statusInfo = getStatusInfo(item.status, progress);

            return (
              <TouchableOpacity
                onPress={() => item.status !== 'downloading' && navigateToRegionDetail(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.regionItem, { 
                  backgroundColor: isDark ? '#1e1e1e' : '#f8f9fa',
                  shadowColor: isDark ? '#000000' : '#000'
                }]}>
                  <View style={styles.regionInfo}>
                    <Text style={[styles.regionName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.regionSize, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>{item.sizeInMB}MB</Text>
                    
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                      <Text style={styles.statusText}>
                        {statusInfo.icon} {statusInfo.text}
                      </Text>
                    </View>
                    
                    {item.status === 'downloading' && (
                      <View style={[styles.progressContainer, { backgroundColor: isDark ? '#2c3e50' : '#ecf0f1' }]}>
                        <View 
                          style={[styles.progressBar, { width: `${progress}%` }]} 
                        />
                      </View>
                    )}
                  </View>
                  
                  {item.status !== 'downloading' && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteRegion(item.id, item.name);
                      }}
                    >
                      <Text style={styles.deleteButtonText}>삭제</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadRegions();
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                다운로드된 오프라인 지도가 없습니다.
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? '#8395a7' : '#95a5a6' }]}>
                아래 버튼을 눌러 지역 지도를 다운로드하세요.
              </Text>
            </View>
          }
          contentContainerStyle={regions.length === 0 ? { flex: 1 } : {}}
        />
      )}
      
      <TouchableOpacity
        style={[styles.downloadButton, { backgroundColor: colors.primary }]}
        onPress={navigateToMapSelection}
      >
        <Ionicons name="download-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.downloadButtonText}>새 지역 다운로드</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  storageInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  storageText: {
    fontSize: 14,
  },
  settingsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  regionItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  regionSize: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});