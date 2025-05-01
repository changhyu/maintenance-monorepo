import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useReservation } from '../context/ReservationContext';
import { MaintenanceReservation } from '../types/maintenance';
import { colors, spacing, typography } from '../theme';
import { formatDate } from '../utils/dateUtils';

const ReservationList: React.FC = () => {
  const navigation = useNavigation();
  const {
    reservations,
    loading,
    error,
    syncReservations,
  } = useReservation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncReservations();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
        return colors.info;
      case 'in_progress':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.text;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.text;
    }
  };

  const renderReservation = ({ item }: { item: MaintenanceReservation }) => (
    <TouchableOpacity
      style={styles.reservationItem}
      onPress={() => navigation.navigate('ReservationDetail', { id: item.id })}
    >
      <View style={styles.reservationHeader}>
        <Text style={styles.reservationTitle}>{item.serviceType}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status === 'pending' ? '대기' :
             item.status === 'confirmed' ? '확정' :
             item.status === 'in_progress' ? '진행' :
             item.status === 'completed' ? '완료' : '취소'}
          </Text>
        </View>
      </View>

      <View style={styles.reservationDetails}>
        <Text style={styles.detailText}>
          차량: {item.vehicleId}
        </Text>
        <Text style={styles.detailText}>
          고객: {item.customerId}
        </Text>
        <Text style={styles.detailText}>
          예약 시간: {formatDate(item.scheduledDate)}
        </Text>
        <Text style={styles.detailText}>
          예상 소요 시간: {item.estimatedDuration}분
        </Text>
      </View>

      <View style={styles.reservationFooter}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>
            {item.priority === 'high' ? '높음' :
             item.priority === 'medium' ? '중간' : '낮음'}
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.notesText} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={syncReservations}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={reservations}
      renderItem={renderReservation}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>예약이 없습니다</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.m,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.m,
    textAlign: 'center',
  },
  retryButton: {
    padding: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: spacing.s,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.surface,
  },
  reservationItem: {
    backgroundColor: colors.surface,
    padding: spacing.m,
    marginBottom: spacing.s,
    borderRadius: spacing.s,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  reservationTitle: {
    ...typography.h3,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.surface,
  },
  reservationDetails: {
    marginBottom: spacing.s,
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reservationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  priorityText: {
    ...typography.caption,
    color: colors.surface,
  },
  notesText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.s,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default ReservationList; 