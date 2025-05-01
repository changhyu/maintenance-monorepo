import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSchedule } from '../context/ScheduleContext';
import { useTemplate } from '../context/TemplateContext';
import { colors, spacing, typography } from '../theme';
import { ReportSchedule } from '../types/report';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

const ScheduleManager: React.FC = () => {
  const {
    schedules,
    results,
    notifications,
    loading,
    error,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleScheduleActive,
    clearNotifications,
    markNotificationAsRead,
    fetchSchedules,
  } = useSchedule();

  const { templates } = useTemplate();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newSchedule, setNewSchedule] = useState<Partial<ReportSchedule>>({
    name: '',
    description: '',
    frequency: 'daily',
    timeOfDay: '09:00',
    recipients: [],
    active: true,
    notifyOnCompletion: true,
    retryOnFailure: true,
    maxRetries: 3,
  });

  // 화면 포커스시 스케줄 새로고침
  useFocusEffect(
    useCallback(() => {
      fetchSchedules();
    }, [fetchSchedules])
  );

  // 에러 발생시 토스트 메시지 표시
  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: '오류',
        text2: error,
        position: 'bottom',
      });
    }
  }, [error]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSchedules();
    } catch (err) {
      console.error('스케줄 새로고침 오류:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSchedules]);

  const validateSchedule = useCallback((schedule: Partial<ReportSchedule>): boolean => {
    if (!schedule.name?.trim()) {
      Toast.show({
        type: 'error',
        text1: '입력 오류',
        text2: '스케줄 이름을 입력해주세요.',
      });
      return false;
    }

    if (!schedule.templateId) {
      Toast.show({
        type: 'error',
        text1: '입력 오류',
        text2: '템플릿을 선택해주세요.',
      });
      return false;
    }

    return true;
  }, []);

  const handleTimeChange = useCallback((event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setNewSchedule(prev => ({
        ...prev,
        timeOfDay: selectedDate.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      }));
    }
  }, []);

  const handleAddSchedule = useCallback(async () => {
    if (!validateSchedule(newSchedule)) return;

    try {
      await addSchedule(newSchedule as Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>);
      setNewSchedule({
        name: '',
        description: '',
        frequency: 'daily',
        timeOfDay: '09:00',
        recipients: [],
        active: true,
        notifyOnCompletion: true,
        retryOnFailure: true,
        maxRetries: 3,
      });
      Toast.show({
        type: 'success',
        text1: '성공',
        text2: '스케줄이 추가되었습니다.',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: '오류',
        text2: '스케줄 추가 중 오류가 발생했습니다.',
      });
    }
  }, [newSchedule, addSchedule, validateSchedule]);

  const handleDeleteSchedule = useCallback((id: string, name: string) => {
    Alert.alert(
      '스케줄 삭제',
      `'${name}' 스케줄을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSchedule(id);
              Toast.show({
                type: 'success',
                text1: '성공',
                text2: '스케줄이 삭제되었습니다.',
              });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: '오류',
                text2: '스케줄 삭제 중 오류가 발생했습니다.',
              });
            }
          },
        },
      ]
    );
  }, [deleteSchedule]);

  const handleToggleActive = useCallback(async (id: string, currentStatus: boolean) => {
    try {
      await toggleScheduleActive(id);
      Toast.show({
        type: 'success',
        text1: '성공',
        text2: `스케줄이 ${currentStatus ? '비활성화' : '활성화'}되었습니다.`,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: '오류',
        text2: '상태 변경 중 오류가 발생했습니다.',
      });
    }
  }, [toggleScheduleActive]);

  // 스케줄 빈 목록용 컴포넌트
  const renderEmptySchedules = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>등록된 스케줄이 없습니다.</Text>
    </View>
  ), []);

  // 스케줄 목록 렌더링
  const renderScheduleItem = useCallback((schedule: ReportSchedule) => (
    <View key={schedule.id} style={styles.scheduleItem}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleName}>{schedule.name}</Text>
        <Switch
          value={schedule.active}
          onValueChange={() => handleToggleActive(schedule.id, schedule.active)}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      {schedule.description && (
        <Text style={styles.scheduleDescription}>{schedule.description}</Text>
      )}
      <Text style={styles.scheduleInfo}>
        실행: {schedule.frequency === 'daily' ? '매일' :
              schedule.frequency === 'weekly' ? '매주' : '매월'}{' '}
        {schedule.timeOfDay}
      </Text>
      {schedule.lastRun && (
        <Text style={styles.scheduleInfo}>
          마지막 실행: {new Date(schedule.lastRun).toLocaleString()}
        </Text>
      )}
      {schedule.nextRun && (
        <Text style={styles.scheduleInfo}>
          다음 실행: {new Date(schedule.nextRun).toLocaleString()}
        </Text>
      )}
      <View style={styles.scheduleActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSchedule(schedule.id, schedule.name)}
        >
          <Text style={styles.actionButtonText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [handleDeleteSchedule, handleToggleActive]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>스케줄 관리</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>새 스케줄 추가</Text>
        <TextInput
          style={styles.input}
          placeholder="스케줄 이름"
          value={newSchedule.name}
          onChangeText={text => setNewSchedule(prev => ({ ...prev, name: text }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="설명 (선택사항)"
          value={newSchedule.description}
          onChangeText={text => setNewSchedule(prev => ({ ...prev, description: text }))}
          multiline
        />

        <Text style={styles.label}>템플릿 선택</Text>
        <ScrollView horizontal style={styles.templateContainer}>
          {templates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateButton,
                newSchedule.templateId === template.id && styles.templateButtonActive,
              ]}
              onPress={() => setNewSchedule(prev => ({ ...prev, templateId: template.id }))}
            >
              <Text
                style={[
                  styles.templateButtonText,
                  newSchedule.templateId === template.id && styles.templateButtonTextActive,
                ]}
              >
                {template.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>실행 주기</Text>
        <View style={styles.frequencyButtons}>
          {[
            { value: 'daily', label: '매일' },
            { value: 'weekly', label: '매주' },
            { value: 'monthly', label: '매월' },
          ].map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.frequencyButton,
                newSchedule.frequency === value && styles.frequencyButtonActive,
              ]}
              onPress={() => setNewSchedule(prev => ({ ...prev, frequency: value as any }))}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  newSchedule.frequency === value && styles.frequencyButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>실행 시간</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.timeButtonText}>{newSchedule.timeOfDay}</Text>
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>완료 시 알림</Text>
          <Switch
            value={newSchedule.notifyOnCompletion}
            onValueChange={value =>
              setNewSchedule(prev => ({ ...prev, notifyOnCompletion: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>실패 시 재시도</Text>
          <Switch
            value={newSchedule.retryOnFailure}
            onValueChange={value =>
              setNewSchedule(prev => ({ ...prev, retryOnFailure: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSchedule}
        >
          <Text style={styles.addButtonText}>스케줄 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>스케줄 목록</Text>
        {schedules.length === 0 ? renderEmptySchedules() : schedules.map(renderScheduleItem)}
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = newSchedule.timeOfDay?.split(':').map(Number) || [9, 0];
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
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
  loadingText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
    marginTop: spacing.m,
  },
  header: {
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: typography.h1.fontSize,
    fontWeight: 'bold' as const,
    lineHeight: typography.h1.lineHeight,
    color: colors.text,
  },
  section: {
    padding: spacing.l,
    backgroundColor: colors.surface,
    marginTop: spacing.s,
    borderRadius: spacing.s,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600' as const,
    lineHeight: typography.h3.lineHeight,
    color: colors.text,
    marginBottom: spacing.m,
  },
  input: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
    marginBottom: spacing.s,
  },
  templateContainer: {
    flexDirection: 'row',
    marginBottom: spacing.m,
  },
  templateButton: {
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    marginRight: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  templateButtonText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  templateButtonTextActive: {
    color: colors.surface,
  },
  frequencyButtons: {
    flexDirection: 'row',
    marginBottom: spacing.m,
  },
  frequencyButton: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    marginRight: spacing.s,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  frequencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyButtonText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  frequencyButtonTextActive: {
    color: colors.surface,
  },
  timeButton: {
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginTop: spacing.m,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.surface,
    fontWeight: 'bold' as const,
  },
  scheduleItem: {
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  scheduleName: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600' as const,
    lineHeight: typography.h4.lineHeight,
    color: colors.text,
  },
  scheduleDescription: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scheduleInfo: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scheduleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.s,
  },
  actionButton: {
    padding: spacing.s,
    marginLeft: spacing.s,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.surface,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
  },
});

export default ScheduleManager; 