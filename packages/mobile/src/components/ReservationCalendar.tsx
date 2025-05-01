import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { useReservation } from '../context/ReservationContext';
import { MaintenanceReservation } from '../types/maintenance';
import { colors, spacing, typography } from '../theme';
import { formatDate } from '../utils/dateUtils';

const ReservationCalendar: React.FC = () => {
  const navigation = useNavigation();
  const { getReservationsByDate, loading } = useReservation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<MaintenanceReservation[]>([]);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadReservations();
  }, [selectedDate]);

  const loadReservations = async () => {
    try {
      const data = await getReservationsByDate(selectedDate);
      setReservations(data);
      updateMarkedDates(data);
    } catch (error) {
      console.error('예약 로딩 실패:', error);
    }
  };

  const updateMarkedDates = (reservations: MaintenanceReservation[]) => {
    const marked: any = {};
    reservations.forEach(reservation => {
      const date = new Date(reservation.scheduledDate).toISOString().split('T')[0];
      marked[date] = {
        marked: true,
        dotColor: getStatusColor(reservation.status),
      };
    });
    setMarkedDates(marked);
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
          시간: {formatDate(item.scheduledDate)}
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

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate.toISOString().split('T')[0]}
        onDayPress={day => setSelectedDate(new Date(day.dateString))}
        markedDates={{
          ...markedDates,
          [selectedDate.toISOString().split('T')[0]]: {
            selected: true,
            marked: markedDates[selectedDate.toISOString().split('T')[0]]?.marked,
            dotColor: markedDates[selectedDate.toISOString().split('T')[0]]?.dotColor,
          },
        }}
        theme={{
          selectedDayBackgroundColor: colors.primary,
          todayTextColor: colors.primary,
          dotColor: colors.primary,
          arrowColor: colors.primary,
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reservations}
          renderItem={renderReservation}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>선택한 날짜에 예약이 없습니다</Text>
            </View>
          }
        />
      )}
    </View>
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
  listContainer: {
    padding: spacing.m,
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
});

export default ReservationCalendar; 