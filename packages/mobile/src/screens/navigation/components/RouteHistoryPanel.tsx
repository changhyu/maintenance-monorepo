import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteHistoryEntry } from '../../../services/RouteHistoryService';
import { formatDistance, formatDuration } from '../utils/formatUtils';

interface RouteHistoryPanelProps {
  routeHistory: RouteHistoryEntry[];
  onClose: () => void;
  onSelectRoute: (route: RouteHistoryEntry) => void;
}

/**
 * 저장된 경로 히스토리를 표시하고 선택할 수 있는 패널 컴포넌트
 */
const RouteHistoryPanel: React.FC<RouteHistoryPanelProps> = ({
  routeHistory,
  onClose,
  onSelectRoute,
}) => {
  return (
    <View style={styles.historyPanel}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>저장된 경로</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <MaterialIcons name="close" size={24} color="#555" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.historyList}>
        {routeHistory.length === 0 ? (
          <Text style={styles.emptyHistoryText}>저장된 경로가 없습니다.</Text>
        ) : (
          routeHistory.map(entry => (
            <TouchableOpacity
              key={entry.id}
              style={styles.historyItem}
              onPress={() => onSelectRoute(entry)}
            >
              <MaterialIcons 
                name="directions" 
                size={24} 
                color="#4CAF50" 
                style={styles.historyIcon} 
              />
              
              <View style={styles.historyItemContent}>
                <Text style={styles.historyItemTitle}>{entry.title}</Text>
                <Text style={styles.historyItemDate}>
                  {new Date(entry.timestamp).toLocaleDateString()}
                </Text>
                <Text style={styles.historyItemInfo}>
                  {formatDistance(entry.routeInfo.totalDistance)} • {formatDuration(entry.routeInfo.totalDuration)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  historyPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 200,
    backgroundColor: 'white',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyIcon: {
    marginRight: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyItemInfo: {
    fontSize: 14,
    color: '#333',
  },
  emptyHistoryText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
});

export default RouteHistoryPanel;