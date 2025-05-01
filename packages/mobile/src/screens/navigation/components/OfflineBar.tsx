import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface OfflineBarProps {
  onPress: () => void;
}

/**
 * 오프라인 상태를 표시하는 상태바 컴포넌트
 */
const OfflineBar: React.FC<OfflineBarProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.offlineBar}
      onPress={onPress}
    >
      <MaterialIcons name="cloud-off" size={18} color="white" />
      <Text style={styles.offlineText}>오프라인 모드</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  offlineBar: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    width: '100%',
  },
  offlineText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});

export default OfflineBar;