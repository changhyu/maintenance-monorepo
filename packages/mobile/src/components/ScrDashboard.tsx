import React, { useState, useEffect } from 'react';
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
import { colors, spacing, typography } from '../theme';
import { formatDate } from '../utils/dateUtils';

const ScrDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { tasks, loading } = useTodo();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    highPriority: 0,
  });

  useEffect(() => {
    if (tasks) {
      setStats({
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        highPriority: tasks.filter(t => t.priority === 'high').length,
      });
    }
  }, [tasks]);

  const StatCard: React.FC<{
    title: string;
    value: number;
    color: string;
    onPress?: () => void;
  }> = ({ title, value, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
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
        <Text style={styles.title}>정비 대시보드</Text>
        <Text style={styles.subtitle}>
          {formatDate(new Date())}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          title="전체 작업"
          value={stats.total}
          color={colors.primary}
          onPress={() => navigation.navigate('TodoList')}
        />
        <StatCard
          title="대기 중"
          value={stats.pending}
          color={colors.warning}
          onPress={() => navigation.navigate('TodoList', { status: 'pending' })}
        />
        <StatCard
          title="진행 중"
          value={stats.inProgress}
          color={colors.info}
          onPress={() => navigation.navigate('TodoList', { status: 'in_progress' })}
        />
        <StatCard
          title="완료"
          value={stats.completed}
          color={colors.success}
          onPress={() => navigation.navigate('TodoList', { status: 'completed' })}
        />
        <StatCard
          title="긴급"
          value={stats.highPriority}
          color={colors.error}
          onPress={() => navigation.navigate('TodoList', { priority: 'high' })}
        />
      </View>

      <View style={styles.recentTasks}>
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
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.m,
  },
  statCard: {
    width: '45%',
    backgroundColor: colors.surface,
    padding: spacing.m,
    margin: spacing.xs,
    borderRadius: spacing.s,
    borderLeftWidth: 4,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
  },
  statTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  recentTasks: {
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
});

export default ScrDashboard; 