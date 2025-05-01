import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  Alert,
  SectionList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import AlertHistoryService, { AlertHistoryItem } from '../services/AlertHistoryService';
import MapView, { Marker, Polyline } from 'react-native-maps';

type HistorySection = {
  title: string;
  data: AlertHistoryItem[];
};

export const AlertHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [history, setHistory] = useState<HistorySection[]>([]);
  const [selectedItem, setSelectedItem] = useState<AlertHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterDays, setFilterDays] = useState<number>(7); // 기본값 일주일

  // 날짜 포맷 함수
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    } else {
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
  };

  // 시간 포맷 함수
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    
    return `${ampm} ${hours}:${minutes}`;
  };

  // 알림 타입 텍스트 반환
  const getAlertTypeText = (type: string): string => {
    switch (type) {
      case 'proximity': return '근접 알림';
      case 'geofence': return '영역 알림';
      case 'destination': return '목적지 알림';
      default: return '위치 알림';
    }
  };

  // 히스토리 로드 및 그룹화
  const loadHistory = useCallback(() => {
    const allHistory = AlertHistoryService.getAllHistory();
    
    // 필터링: 설정된 일수 이내의 기록만 표시
    const cutoffTime = Date.now() - (filterDays * 24 * 60 * 60 * 1000);
    const filteredHistory = allHistory.filter(item => item.timestamp >= cutoffTime);
    
    // 날짜별로 그룹화
    const groupedHistory: { [date: string]: AlertHistoryItem[] } = {};
    
    filteredHistory.forEach(item => {
      const dateStr = formatDate(item.timestamp);
      if (!groupedHistory[dateStr]) {
        groupedHistory[dateStr] = [];
      }
      groupedHistory[dateStr].push(item);
    });
    
    // 섹션 리스트로 변환
    const sections = Object.keys(groupedHistory).map(date => ({
      title: date,
      data: groupedHistory[date].sort((a, b) => b.timestamp - a.timestamp)
    }));
    
    setHistory(sections);
  }, [filterDays]);

  // 화면이 포커스될 때마다 히스토리 새로고침
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // 히스토리 항목 삭제
  const deleteHistoryItem = async (item: AlertHistoryItem) => {
    Alert.alert(
      '히스토리 삭제',
      '이 알림 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            await AlertHistoryService.deleteHistoryItem(item.id);
            if (showDetailModal) {
              setShowDetailModal(false);
              setSelectedItem(null);
            }
            loadHistory();
          }
        }
      ]
    );
  };

  // 모든 히스토리 삭제
  const clearAllHistory = async () => {
    Alert.alert(
      '모든 히스토리 삭제',
      '정말 모든 알림 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '모두 삭제', 
          style: 'destructive',
          onPress: async () => {
            await AlertHistoryService.clearAllHistory();
            loadHistory();
          }
        }
      ]
    );
  };

  // 히스토리 필터 변경
  const changeHistoryFilter = (days: number) => {
    setFilterDays(days);
  };

  // 히스토리 항목 렌더링
  const renderHistoryItem = ({ item }: { item: AlertHistoryItem }) => {
    return (
      <TouchableOpacity
        style={[
          styles.historyItem, 
          { backgroundColor: isDark ? '#1e1e1e' : '#f8f9fa' }
        ]}
        onPress={() => {
          setSelectedItem(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.historyItemContent}>
          <View style={styles.historyItemLeft}>
            <View style={[styles.alertTypeIndicator, {
              backgroundColor: item.dismissed ? '#777' : getAlertTypeColor(item.alertType)
            }]} />
            <View style={styles.historyItemText}>
              <Text style={[styles.historyItemTitle, { color: colors.text }]}>
                {item.alertName}
              </Text>
              <Text style={[styles.historyItemSubtitle, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                {getAlertTypeText(item.alertType)}
                {item.category ? ` • ${item.category}` : ''}
                {item.dismissed ? ' • 확인됨' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.historyItemRight}>
            <Text style={[styles.historyItemTime, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
              {formatTime(item.timestamp)}
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={18} 
              color={isDark ? '#a4b0be' : '#7f8c8d'} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 섹션 헤더 렌더링
  const renderSectionHeader = ({ section }: { section: HistorySection }) => {
    return (
      <View style={[styles.sectionHeader, {
        backgroundColor: isDark ? '#2c3e50' : '#ecf0f1'
      }]}>
        <Text style={[styles.sectionHeaderText, { color: colors.text }]}>
          {section.title}
        </Text>
      </View>
    );
  };

  // 알림 유형별 색상 반환
  const getAlertTypeColor = (type: string): string => {
    switch (type) {
      case 'proximity': return '#5856d6';
      case 'geofence': return '#ff2d55';
      case 'destination': return '#30d158';
      default: return '#007aff';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>알림 히스토리</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.filterButton, { 
              backgroundColor: filterDays === 7 ? colors.primary : (isDark ? '#2c3e50' : '#ecf0f1')
            }]}
            onPress={() => changeHistoryFilter(7)}
          >
            <Text style={[styles.filterButtonText, { 
              color: filterDays === 7 ? 'white' : (isDark ? '#a4b0be' : '#7f8c8d')
            }]}>
              일주일
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, { 
              backgroundColor: filterDays === 30 ? colors.primary : (isDark ? '#2c3e50' : '#ecf0f1')
            }]}
            onPress={() => changeHistoryFilter(30)}
          >
            <Text style={[styles.filterButtonText, { 
              color: filterDays === 30 ? 'white' : (isDark ? '#a4b0be' : '#7f8c8d')
            }]}>
              한달
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, { 
              backgroundColor: filterDays === 90 ? colors.primary : (isDark ? '#2c3e50' : '#ecf0f1')
            }]}
            onPress={() => changeHistoryFilter(90)}
          >
            <Text style={[styles.filterButtonText, { 
              color: filterDays === 90 ? 'white' : (isDark ? '#a4b0be' : '#7f8c8d')
            }]}>
              3개월
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color={isDark ? '#a4b0be' : '#95a5a6'} />
          <Text style={[styles.emptyText, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
            알림 히스토리가 없습니다
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#8395a7' : '#95a5a6' }]}>
            위치 알림이 발생하면 이곳에 기록됩니다
          </Text>
        </View>
      ) : (
        <>
          <SectionList
            sections={history}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: '#ff3b30' }]}
            onPress={clearAllHistory}
          >
            <Text style={styles.clearButtonText}>모든 기록 삭제</Text>
          </TouchableOpacity>
        </>
      )}

      {/* 세부 정보 모달 */}
      <Modal
        visible={showDetailModal && selectedItem !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
      >
        {selectedItem && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <View style={[styles.alertTypeIndicator, { 
                    backgroundColor: getAlertTypeColor(selectedItem.alertType),
                    width: 12,
                    height: 12,
                    marginRight: 8
                  }]} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedItem.alertName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>유형:</Text>
                    <Text style={[styles.detailValue, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                      {getAlertTypeText(selectedItem.alertType)}
                    </Text>
                  </View>

                  {selectedItem.category && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.text }]}>카테고리:</Text>
                      <Text style={[styles.detailValue, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                        {selectedItem.category}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>발생 시간:</Text>
                    <Text style={[styles.detailValue, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                      {new Date(selectedItem.timestamp).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>거리:</Text>
                    <Text style={[styles.detailValue, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                      {selectedItem.distance.toFixed(0)}m
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>상태:</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: selectedItem.dismissed ? '#777' : '#30d158'
                    }]}>
                      <Text style={styles.statusText}>
                        {selectedItem.dismissed ? '확인됨' : '미확인'}
                      </Text>
                    </View>
                  </View>

                  {selectedItem.dismissed && selectedItem.dismissedAt && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.text }]}>확인 시간:</Text>
                      <Text style={[styles.detailValue, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                        {new Date(selectedItem.dismissedAt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: (selectedItem.latitude + selectedItem.userLatitude) / 2,
                      longitude: (selectedItem.longitude + selectedItem.userLongitude) / 2,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: selectedItem.latitude,
                        longitude: selectedItem.longitude
                      }}
                      pinColor={getAlertTypeColor(selectedItem.alertType)}
                    />
                    <Marker
                      coordinate={{
                        latitude: selectedItem.userLatitude,
                        longitude: selectedItem.userLongitude
                      }}
                      pinColor="#007aff"
                    >
                      <View style={styles.userLocationMarker}>
                        <Ionicons name="person" size={18} color="white" />
                      </View>
                    </Marker>
                    <Polyline
                      coordinates={[
                        { latitude: selectedItem.latitude, longitude: selectedItem.longitude },
                        { latitude: selectedItem.userLatitude, longitude: selectedItem.userLongitude }
                      ]}
                      strokeColor="#007aff"
                      strokeWidth={2}
                      lineDashPattern={[5, 5]}
                    />
                  </MapView>
                </View>

                <View style={styles.modalActions}>
                  {!selectedItem.dismissed && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={async () => {
                        await AlertHistoryService.markAsDismissed(selectedItem.id);
                        setShowDetailModal(false);
                        setSelectedItem(null);
                        loadHistory();
                      }}
                    >
                      <Text style={styles.actionButtonText}>확인으로 표시</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#ff3b30' }]}
                    onPress={() => deleteHistoryItem(selectedItem)}
                  >
                    <Text style={styles.actionButtonText}>삭제</Text>
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
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  sectionHeaderText: {
    fontWeight: '600',
    fontSize: 16,
  },
  historyItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  historyItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertTypeIndicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  historyItemText: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  historyItemSubtitle: {
    fontSize: 12,
  },
  historyItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemTime: {
    fontSize: 12,
    marginRight: 4,
  },
  clearButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '600',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  detailsContainer: {
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userLocationMarker: {
    backgroundColor: '#007aff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default AlertHistoryScreen;