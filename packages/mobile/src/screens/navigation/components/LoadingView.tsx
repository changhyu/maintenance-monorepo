import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';

interface LoadingViewProps {
  message: string;
}

/**
 * 로딩 상태를 표시하는 전체 화면 컴포넌트
 */
const LoadingView: React.FC<LoadingViewProps> = ({ message }) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0066FF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default LoadingView;