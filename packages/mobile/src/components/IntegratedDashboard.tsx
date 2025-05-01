import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTodo } from '../context/TodoContext';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme';
import { formatDate } from '../utils/dateUtils';

const IntegratedDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { tasks, loading } = useTodo();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats' | 'calendar'>('tasks');

  const TabButton: React.FC<{
    label: string;
    value: 'tasks' | 'stats' | 'calendar';
  }> = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === value && styles.tabButtonActive,
      ]}
      onPress={() => setActiveTab(value)}
    >
      <Text
        style={[
          styles.tabButtonText,
          activeTab === value && styles.tabButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTasks = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>최근 작업</Text>
      {tasks.slice(0, 5).map(task => (
        <TouchableOpacity
          key={task.id}
          style={styles.taskItem}
          onPress={() => navigation.navigate('TodoDetail', { id: task.id })}
        >
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskMeta}>
            {formatDate(task.dueDate)} • {task.priority}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>작업 통계</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tasks.filter(t => t.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>대기 중</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tasks.filter(t => t.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>진행 중</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tasks.filter(t => t.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>완료</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {tasks.filter(t => t.priority === 'high').length}
          </Text>
          <Text style={styles.statLabel}>긴급</Text>
        </View>
      </View>
    </View>
  );

  const renderCalendar = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>오늘의 작업</Text>
      {tasks
        .filter(task => {
          const taskDate = new Date(task.dueDate);
          const today = new Date();
          return (
            taskDate.getDate() === today.getDate() &&
            taskDate.getMonth() === today.getMonth() &&
            taskDate.getFullYear() === today.getFullYear()
          );
        })
        .map(task => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskItem}
            onPress={() => navigation.navigate('TodoDetail', { id: task.id })}
          >
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskMeta}>
              {formatDate(task.dueDate, 'HH:mm')} • {task.priority}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          안녕하세요, {user?.name}님
        </Text>
        <Text style={styles.dateText}>
          {formatDate(new Date())}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TabButton label="작업" value="tasks" />
        <TabButton label="통계" value="stats" />
        <TabButton label="일정" value="calendar" />
      </View>

      {activeTab === 'tasks' && renderTasks()}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'calendar' && renderCalendar()}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('TodoCreate')}
      >
        <Text style={styles.addButtonText}>새 작업 추가</Text>
      </TouchableOpacity>
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
  header: {
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  welcomeText: {
    ...typography.h1,
    color: colors.text,
  },
  dateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.m,
    backgroundColor: colors.surface,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.s,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  section: {
    padding: spacing.l,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.m,
  },
  taskItem: {
    backgroundColor: colors.surface,
    padding: spacing.m,
    marginBottom: spacing.s,
    borderRadius: spacing.s,
  },
  taskTitle: {
    ...typography.body,
    color: colors.text,
  },
  taskMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.m,
    marginBottom: spacing.s,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButton: {
    margin: spacing.l,
    padding: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
});

export default IntegratedDashboard; 