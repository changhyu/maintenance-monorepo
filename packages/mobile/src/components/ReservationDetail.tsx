import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useReservation } from '../context/ReservationContext';
import { MaintenanceReservation } from '../types/maintenance';
import { colors, spacing, typography } from '../theme';
import { formatDate } from '../utils/dateUtils';

const ReservationDetail: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: string };
  const { getReservation, updateReservation, cancelReservation } = useReservation();
  const [reservation, setReservation] = useState<MaintenanceReservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservation();
  }, [id]);

  const loadReservation = async () => {
    try {
      setLoading(true);
      const data = await getReservation(id);
      setReservation(data);
    } catch (error) {
      Alert.alert('오류', '예약 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateReservation(id, { status: newStatus });
      setReservation(prev => prev ? { ...prev, status: newStatus as any } : null);
      Alert.alert('성공', '상태가 업데이트되었습니다.');
    } catch (error) {
      Alert.alert('오류', '상태 업데이트에 실패했습니다.');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelReservation(id);
      setReservation(prev => prev ? { ...prev, status: 'cancelled' } : null);
      Alert.alert('성공', '예약이 취소되었습니다.');
    } catch (error) {
      Alert.alert('오류', '예약 취소에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>예약을 찾을 수 없습니다</Text>
      </View>
    );
  }

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{reservation.serviceType}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.status) }]}>
          <Text style={styles.statusText}>
            {reservation.status === 'pending' ? '대기' :
             reservation.status === 'confirmed' ? '확정' :
             reservation.status === 'in_progress' ? '진행' :
             reservation.status === 'completed' ? '완료' : '취소'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기본 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>차량 ID</Text>
          <Text style={styles.value}>{reservation.vehicleId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>고객 ID</Text>
          <Text style={styles.value}>{reservation.customerId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>예약 시간</Text>
          <Text style={styles.value}>{formatDate(reservation.scheduledDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>예상 소요 시간</Text>
          <Text style={styles.value}>{reservation.estimatedDuration}분</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>우선순위</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(reservation.priority) }]}>
            <Text style={styles.priorityText}>
              {reservation.priority === 'high' ? '높음' :
               reservation.priority === 'medium' ? '중간' : '낮음'}
            </Text>
          </View>
        </View>
      </View>

      {reservation.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메모</Text>
          <Text style={styles.notes}>{reservation.notes}</Text>
        </View>
      )}

      {reservation.location && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>위치</Text>
          <Text style={styles.value}>{reservation.location.name}</Text>
          <Text style={styles.value}>{reservation.location.address}</Text>
        </View>
      )}

      {reservation.parts && reservation.parts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>부품</Text>
          {reservation.parts.map(part => (
            <View key={part.id} style={styles.partItem}>
              <Text style={styles.value}>{part.name}</Text>
              <Text style={styles.value}>
                {part.quantity}개 × {part.unitPrice.toLocaleString()}원
              </Text>
            </View>
          ))}
        </View>
      )}

      {reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
        <View style={styles.actions}>
          {reservation.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleStatusChange('confirmed')}
            >
              <Text style={styles.actionButtonText}>확정</Text>
            </TouchableOpacity>
          )}
          {reservation.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => handleStatusChange('in_progress')}
            >
              <Text style={styles.actionButtonText}>작업 시작</Text>
            </TouchableOpacity>
          )}
          {reservation.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleStatusChange('completed')}
            >
              <Text style={styles.actionButtonText}>작업 완료</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.actionButtonText}>취소</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h1,
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
  section: {
    padding: spacing.l,
    backgroundColor: colors.surface,
    marginTop: spacing.s,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.m,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.text,
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
  notes: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  actions: {
    padding: spacing.l,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    padding: spacing.m,
    borderRadius: spacing.s,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.info,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
});

export default ReservationDetail; 