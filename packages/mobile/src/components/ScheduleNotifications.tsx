import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSchedule } from '../context/ScheduleContext';
import { colors, spacing, typography } from '../theme';

const ScheduleNotifications: React.FC = () => {
  const { notifications, clearNotifications, markNotificationAsRead } = useSchedule();

  const handleClearAll = () => {
    Alert.alert(
      '알림 전체 삭제',
      '모든 알림을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: clearNotifications,
        },
      ]
    );
  };

  const getNotificationIcon = (type: 'success' | 'failure' | 'retry') => {
    switch (type) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'retry':
        return '🔄';
    }
  };

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>알림이 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>알림</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearAllText}>전체 삭제</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.notificationList}>
        {notifications.map(notification => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationItem,
              notification.read && styles.notificationItemRead,
            ]}
            onPress={() => markNotificationAsRead(notification.id)}
          >
            <Text style={styles.notificationIcon}>
              {getNotificationIcon(notification.type)}
            </Text>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              <Text style={styles.notificationTime}>
                {new Date(notification.createdAt).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  clearAllText: {
    ...typography.body,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  notificationList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: spacing.m,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationItemRead: {
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: spacing.m,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default ScheduleNotifications; 