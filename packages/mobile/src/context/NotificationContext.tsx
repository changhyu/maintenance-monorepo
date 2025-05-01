import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MaintenanceReservation } from '../types/maintenance';
import { useReservation } from './ReservationContext';

interface NotificationSettings {
  enabled: boolean;
  reminderTime: number; // 예약 시작 전 알림 시간 (분)
  statusChangeNotification: boolean;
  upcomingReservationNotification: boolean;
  dailySummaryNotification: boolean;
  dailySummaryTime: string; // HH:mm 형식
}

interface NotificationContextType {
  settings: NotificationSettings;
  loading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  scheduleReservationNotification: (reservation: MaintenanceReservation) => Promise<void>;
  cancelReservationNotification: (reservationId: string) => Promise<void>;
  sendStatusChangeNotification: (reservation: MaintenanceReservation, oldStatus: string) => Promise<void>;
  scheduleDailySummaryNotification: () => Promise<void>;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  reminderTime: 30,
  statusChangeNotification: true,
  upcomingReservationNotification: true,
  dailySummaryNotification: true,
  dailySummaryTime: '09:00',
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reservations } = useReservation();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  useEffect(() => {
    if (!loading) {
      scheduleAllNotifications();
    }
  }, [reservations, settings]);

  const initializeNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      // 알림 권한 요청
      if (Platform.OS !== 'web') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          throw new Error('알림 권한이 필요합니다.');
        }
      }

      // 알림 설정 불러오기
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // 알림 설정
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림 초기화 중 오류가 발생했습니다.');
      console.error('알림 초기화 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
      setSettings(updatedSettings);

      // 설정 변경에 따른 알림 재스케줄링
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (updatedSettings.enabled) {
        await scheduleAllNotifications();
      }
    } catch (err) {
      console.error('설정 업데이트 오류:', err);
      throw new Error('설정을 업데이트하는데 실패했습니다.');
    }
  };

  const scheduleReservationNotification = async (reservation: MaintenanceReservation) => {
    if (!settings.enabled || !settings.upcomingReservationNotification) return;

    const scheduledDate = new Date(reservation.scheduledDate);
    const notificationDate = new Date(scheduledDate.getTime() - settings.reminderTime * 60000);

    if (notificationDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '예약 알림',
          body: `${scheduledDate.toLocaleTimeString()} 예약이 ${settings.reminderTime}분 후에 시작됩니다.`,
          data: { reservationId: reservation.id },
        },
        trigger: notificationDate,
      });
    }
  };

  const cancelReservationNotification = async (reservationId: string) => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.reservationId === reservationId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  };

  const sendStatusChangeNotification = async (
    reservation: MaintenanceReservation,
    oldStatus: string
  ) => {
    if (!settings.enabled || !settings.statusChangeNotification) return;

    const statusText = {
      pending: '대기',
      confirmed: '확정',
      in_progress: '진행',
      completed: '완료',
      cancelled: '취소',
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '예약 상태 변경',
        body: `예약이 ${statusText[oldStatus as keyof typeof statusText]}에서 ${
          statusText[reservation.status]
        } 상태로 변경되었습니다.`,
        data: { reservationId: reservation.id },
      },
      trigger: null,
    });
  };

  const scheduleDailySummaryNotification = async () => {
    if (!settings.enabled || !settings.dailySummaryNotification) return;

    const [hours, minutes] = settings.dailySummaryTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '일일 예약 요약',
        body: `오늘의 예약: ${reservations.length}건\n완료: ${
          reservations.filter(r => r.status === 'completed').length
        }건`,
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });
  };

  const scheduleAllNotifications = async () => {
    if (!settings.enabled) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    // 예약 알림 스케줄링
    for (const reservation of reservations) {
      if (reservation.status !== 'cancelled' && reservation.status !== 'completed') {
        await scheduleReservationNotification(reservation);
      }
    }

    // 일일 요약 알림 스케줄링
    await scheduleDailySummaryNotification();
  };

  return (
    <NotificationContext.Provider
      value={{
        settings,
        loading,
        error,
        updateSettings,
        scheduleReservationNotification,
        cancelReservationNotification,
        sendStatusChangeNotification,
        scheduleDailySummaryNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 