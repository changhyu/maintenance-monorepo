import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Todo from './Todo';
import { colors, spacing, typography } from '../theme';

interface TodoAuthWrapperProps {
  onTaskPress?: (task: any) => void;
  showCompleted?: boolean;
}

const TodoAuthWrapper: React.FC<TodoAuthWrapperProps> = (props) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          정비 작업을 보려면 로그인이 필요합니다.
        </Text>
      </View>
    );
  }

  if (!user?.permissions?.includes('maintenance:read')) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          정비 작업을 볼 권한이 없습니다.
        </Text>
      </View>
    );
  }

  return <Todo {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TodoAuthWrapper; 