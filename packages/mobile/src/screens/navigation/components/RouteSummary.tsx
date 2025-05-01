import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistance, formatDuration } from '../utils/formatUtils';

interface RouteSummaryProps {
  totalDuration: number;
  totalDistance: number;
  onSaveRoute: () => void;
  isSaving: boolean;
}

/**
 * 경로의 소요 시간과 거리를 요약해서 보여주는 컴포넌트
 */
const RouteSummary: React.FC<RouteSummaryProps> = ({
  totalDuration,
  totalDistance,
  onSaveRoute,
  isSaving,
}) => {
  return (
    <View style={styles.routeSummaryContainer}>
      <View style={styles.routeSummaryItem}>
        <MaterialIcons name="access-time" size={20} color="#666" />
        <Text style={styles.routeSummaryText}>
          {formatDuration(totalDuration)}
        </Text>
      </View>

      <View style={styles.routeSummaryItem}>
        <MaterialIcons name="straighten" size={20} color="#666" />
        <Text style={styles.routeSummaryText}>
          {formatDistance(totalDistance)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.saveRouteButton}
        onPress={onSaveRoute}
        disabled={isSaving}
      >
        <MaterialIcons name="save" size={20} color="white" />
        <Text style={styles.saveRouteButtonText}>
          {isSaving ? '저장 중...' : '경로 저장'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  routeSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 12,
  },
  routeSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeSummaryText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  saveRouteButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
  },
  saveRouteButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});

export default RouteSummary;