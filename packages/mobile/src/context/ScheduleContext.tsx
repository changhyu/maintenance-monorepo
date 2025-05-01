import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReportSchedule, ScheduleResult, ScheduleNotification } from '../types/report';
import { useAuth } from './AuthContext';
import { useTemplate } from './TemplateContext';
import { useReport } from './ReportContext';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { parseISO, format, addDays, addWeeks, addMonths } from 'date-fns';

const SCHEDULE_TASK_NAME = 'REPORT_SCHEDULE_TASK';

interface ScheduleContextType {
  schedules: ReportSchedule[];
  results: ScheduleResult[];
  notifications: ScheduleNotification[];
  loading: boolean;
  error: string | null;
  addSchedule: (schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>) => Promise<void>;
  updateSchedule: (id: string, schedule: Partial<ReportSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  getSchedule: (id: string) => ReportSchedule | undefined;
  toggleScheduleActive: (id: string) => Promise<void>;
  getScheduleResults: (scheduleId: string) => ScheduleResult[];
  clearNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  fetchSchedules: () => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// 백그라운드 태스크 정의
TaskManager.defineTask(SCHEDULE_TASK_NAME, async () => {
  try {
    const now = new Date();
    const schedules = await loadSchedulesFromStorage();
    const activeSchedules = schedules.filter(s => s.active);

    for (const schedule of activeSchedules) {
      if (shouldRunSchedule(schedule, now)) {
        await executeSchedule(schedule);
        await updateScheduleNextRun(schedule);
      }
    }

    return BackgroundFetch.Result.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.Result.Failed;
  }
});

const loadSchedulesFromStorage = async () => {
  try {
    const stored = await AsyncStorage.getItem('report_schedules');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading schedules:', error);
    return [];
  }
};

const shouldRunSchedule = (schedule: ReportSchedule, now: Date): boolean => {
  if (!schedule.nextRun) return false;
  const nextRun = parseISO(schedule.nextRun.toString());
  return nextRun <= now;
};

const calculateNextRun = (schedule: ReportSchedule): Date => {
  const now = new Date();
  const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
  let next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    switch (schedule.frequency) {
      case 'daily':
        next = addDays(next, 1);
        break;
      case 'weekly':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          // 다음 실행 요일 찾기
          let found = false;
          for (let i = 1; i <= 7 && !found; i++) {
            const nextDay = addDays(next, i);
            if (schedule.daysOfWeek.includes(nextDay.getDay())) {
              next = nextDay;
              found = true;
            }
          }
          if (!found) next = addWeeks(next, 1);
        } else {
          next = addWeeks(next, 1);
        }
        break;
      case 'monthly':
        if (schedule.dayOfMonth) {
          next = new Date(next.getFullYear(), next.getMonth() + 1, schedule.dayOfMonth);
        } else {
          next = addMonths(next, 1);
        }
        break;
      case 'custom':
        // 커스텀 cron 처리는 별도 구현 필요
        next = addDays(next, 1);
        break;
    }
  }

  return next;
};

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { getTemplate } = useTemplate();
  const { generateReport } = useReport();
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [results, setResults] = useState<ScheduleResult[]>([]);
  const [notifications, setNotifications] = useState<ScheduleNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeScheduler();
    loadData();
  }, []);

  const initializeScheduler = async () => {
    if (Platform.OS === 'ios') {
      await BackgroundFetch.registerTaskAsync(SCHEDULE_TASK_NAME, {
        minimumInterval: 15 * 60, // 15분
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  };

  const loadData = async () => {
    try {
      const [storedSchedules, storedResults, storedNotifications] = await Promise.all([
        AsyncStorage.getItem('report_schedules'),
        AsyncStorage.getItem('schedule_results'),
        AsyncStorage.getItem('schedule_notifications'),
      ]);

      setSchedules(storedSchedules ? JSON.parse(storedSchedules) : []);
      setResults(storedResults ? JSON.parse(storedResults) : []);
      setNotifications(storedNotifications ? JSON.parse(storedNotifications) : []);
    } catch (err) {
      setError('스케줄 데이터 로드 중 오류가 발생했습니다.');
      console.error('스케줄 데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedules = async (newSchedules: ReportSchedule[]) => {
    try {
      await AsyncStorage.setItem('report_schedules', JSON.stringify(newSchedules));
      setSchedules(newSchedules);
    } catch (err) {
      setError('스케줄 저장 중 오류가 발생했습니다.');
      console.error('스케줄 저장 오류:', err);
    }
  };

  const saveResults = async (newResults: ScheduleResult[]) => {
    try {
      await AsyncStorage.setItem('schedule_results', JSON.stringify(newResults));
      setResults(newResults);
    } catch (err) {
      console.error('결과 저장 오류:', err);
    }
  };

  const saveNotifications = async (newNotifications: ScheduleNotification[]) => {
    try {
      await AsyncStorage.setItem('schedule_notifications', JSON.stringify(newNotifications));
      setNotifications(newNotifications);
    } catch (err) {
      console.error('알림 저장 오류:', err);
    }
  };

  const addSchedule = async (schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>) => {
    try {
      const newSchedule: ReportSchedule = {
        ...schedule,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        nextRun: calculateNextRun({
          ...schedule,
          id: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ReportSchedule),
      };
      const newSchedules = [...schedules, newSchedule];
      await saveSchedules(newSchedules);
    } catch (err) {
      setError('스케줄 추가 중 오류가 발생했습니다.');
      console.error('스케줄 추가 오류:', err);
    }
  };

  const updateSchedule = async (id: string, schedule: Partial<ReportSchedule>) => {
    try {
      const newSchedules = schedules.map(s =>
        s.id === id
          ? {
              ...s,
              ...schedule,
              updatedAt: new Date(),
              nextRun: calculateNextRun({ ...s, ...schedule } as ReportSchedule),
            }
          : s
      );
      await saveSchedules(newSchedules);
    } catch (err) {
      setError('스케줄 업데이트 중 오류가 발생했습니다.');
      console.error('스케줄 업데이트 오류:', err);
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const newSchedules = schedules.filter(s => s.id !== id);
      await saveSchedules(newSchedules);
    } catch (err) {
      setError('스케줄 삭제 중 오류가 발생했습니다.');
      console.error('스케줄 삭제 오류:', err);
    }
  };

  const getSchedule = (id: string) => {
    return schedules.find(s => s.id === id);
  };

  const toggleScheduleActive = async (id: string) => {
    try {
      const schedule = schedules.find(s => s.id === id);
      if (schedule) {
        await updateSchedule(id, { active: !schedule.active });
      }
    } catch (err) {
      setError('스케줄 상태 변경 중 오류가 발생했습니다.');
      console.error('스케줄 상태 변경 오류:', err);
    }
  };

  const getScheduleResults = (scheduleId: string) => {
    return results.filter(r => r.scheduleId === scheduleId);
  };

  const clearNotifications = async () => {
    try {
      await saveNotifications([]);
    } catch (err) {
      console.error('알림 초기화 오류:', err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const newNotifications = notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      await saveNotifications(newNotifications);
    } catch (err) {
      console.error('알림 상태 변경 오류:', err);
    }
  };

  const executeSchedule = async (schedule: ReportSchedule) => {
    const result: ScheduleResult = {
      id: Date.now().toString(),
      scheduleId: schedule.id,
      status: 'pending',
      startTime: new Date(),
      retryCount: 0,
    };

    try {
      const template = getTemplate(schedule.templateId);
      if (!template) throw new Error('템플릿을 찾을 수 없습니다.');

      const reportUrl = await generateReport(template.options);
      
      result.status = 'success';
      result.endTime = new Date();
      result.reportUrl = reportUrl;

      if (schedule.notifyOnCompletion) {
        const notification: ScheduleNotification = {
          id: Date.now().toString(),
          scheduleId: schedule.id,
          type: 'success',
          message: `${schedule.name} 보고서가 성공적으로 생성되었습니다.`,
          createdAt: new Date(),
          read: false,
        };
        setNotifications(prev => [...prev, notification]);
      }
    } catch (err) {
      result.status = 'failure';
      result.endTime = new Date();
      result.error = err.message;

      if (schedule.retryOnFailure && result.retryCount < schedule.maxRetries) {
        // 재시도 로직
        result.retryCount++;
        const notification: ScheduleNotification = {
          id: Date.now().toString(),
          scheduleId: schedule.id,
          type: 'retry',
          message: `${schedule.name} 보고서 생성 재시도 중... (${result.retryCount}/${schedule.maxRetries})`,
          createdAt: new Date(),
          read: false,
        };
        setNotifications(prev => [...prev, notification]);
        await executeSchedule(schedule);
      } else {
        const notification: ScheduleNotification = {
          id: Date.now().toString(),
          scheduleId: schedule.id,
          type: 'failure',
          message: `${schedule.name} 보고서 생성 실패: ${err.message}`,
          createdAt: new Date(),
          read: false,
        };
        setNotifications(prev => [...prev, notification]);
      }
    } finally {
      setResults(prev => [...prev, result]);
    }
  };

  return (
    <ScheduleContext.Provider
      value={{
        schedules,
        results,
        notifications,
        loading,
        error,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        getSchedule,
        toggleScheduleActive,
        getScheduleResults,
        clearNotifications,
        markNotificationAsRead,
        fetchSchedules: loadData,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}; 