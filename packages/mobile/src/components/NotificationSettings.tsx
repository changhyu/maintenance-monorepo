import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNotification } from '../context/NotificationContext';
import { colors, spacing, typography } from '../theme';

const NotificationSettings: React.FC = () => {
  const { settings, updateSettings } = useNotification();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      updateSettings({ dailySummaryTime: `${hours}:${minutes}` });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>알림 설정</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>알림 활성화</Text>
          <Switch
            value={settings.enabled}
            onValueChange={value => updateSettings({ enabled: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>예약 상태 변경 알림</Text>
          <Switch
            value={settings.statusChangeNotification}
            onValueChange={value => updateSettings({ statusChangeNotification: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
            disabled={!settings.enabled}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>예정된 예약 알림</Text>
          <Switch
            value={settings.upcomingReservationNotification}
            onValueChange={value => updateSettings({ upcomingReservationNotification: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
            disabled={!settings.enabled}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>일일 요약 알림</Text>
          <Switch
            value={settings.dailySummaryNotification}
            onValueChange={value => updateSettings({ dailySummaryNotification: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
            disabled={!settings.enabled}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 시간 설정</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>예약 알림 시간</Text>
          <View style={styles.timeInputContainer}>
            <TextInput
              style={styles.timeInput}
              value={settings.reminderTime.toString()}
              onChangeText={value => {
                const time = parseInt(value) || 0;
                updateSettings({ reminderTime: Math.max(0, Math.min(time, 180)) });
              }}
              keyboardType="numeric"
              maxLength={3}
              disabled={!settings.enabled}
            />
            <Text style={styles.timeUnit}>분 전</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>일일 요약 시간</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
            disabled={!settings.enabled}
          >
            <Text style={styles.timeButtonText}>{settings.dailySummaryTime}</Text>
          </TouchableOpacity>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={(() => {
              const [hours, minutes] = settings.dailySummaryTime.split(':').map(Number);
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
      </View>

      <View style={styles.section}>
        <Text style={styles.description}>
          예약 알림은 설정된 시간 전에 발송되며, 일일 요약은 매일 지정된 시간에 발송됩니다.
          상태 변경 알림은 예약 상태가 변경될 때마다 즉시 발송됩니다.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h1,
    color: colors.text,
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    ...typography.body,
    backgroundColor: colors.background,
    padding: spacing.s,
    borderRadius: spacing.xs,
    width: 60,
    textAlign: 'center',
    marginRight: spacing.s,
  },
  timeUnit: {
    ...typography.body,
    color: colors.textSecondary,
  },
  timeButton: {
    backgroundColor: colors.background,
    padding: spacing.s,
    borderRadius: spacing.xs,
    minWidth: 80,
  },
  timeButtonText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default NotificationSettings; 