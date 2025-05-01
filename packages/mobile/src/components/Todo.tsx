import React, { useState, useEffect } from 'react';
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
import { useOfflineManager } from '../context/OfflineContext';
import { MaintenanceTask } from '../types/maintenance';
import { formatDate } from '../utils/dateUtils';
import { colors, spacing, typography } from '../theme';

interface TodoProps {
  onTaskPress?: (task: MaintenanceTask) => void;
  showCompleted?: boolean;
}

const Todo: React.FC<TodoProps> = ({
  onTaskPress,
  showCompleted = false,
}) => {
  const navigation = useNavigation();
  const { isOffline, syncTasks } = useOfflineManager();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await syncTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('작업 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const renderTask = ({ item }: { item: MaintenanceTask }) => (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => onTaskPress?.(item)}
    >
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={styles.taskDescription}>{item.description}</Text>
        <View style={styles.taskMeta}>
          <Text style={styles.taskDate}>
            {formatDate(item.dueDate)}
          </Text>
          {item.priority && (
            <Text style={[
              styles.priority,
              { color: getPriorityColor(item.priority) }
            ]}>
              {item.priority}
            </Text>
          )}
        </View>
      </View>
      {isOffline && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>오프라인</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks.filter(task => showCompleted || !task.completed)}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {showCompleted ? '완료된 작업이 없습니다' : '할 일이 없습니다'}
            </Text>
          </View>
        }
      />
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
  taskItem: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.s,
    marginVertical: spacing.xs,
    padding: spacing.m,
    borderRadius: spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  taskDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  priority: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  offlineIndicator: {
    backgroundColor: colors.warning,
    padding: spacing.xs,
    borderRadius: spacing.xs,
    marginLeft: spacing.s,
  },
  offlineText: {
    ...typography.caption,
    color: colors.surface,
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

export default Todo; 