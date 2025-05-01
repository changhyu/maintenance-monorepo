import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TransportMode } from '../types';

interface TransportModeSelectorProps {
  selectedMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
  disabled?: boolean;
}

export const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false
}) => {
  // 각 이동 수단의 정보
  const transportOptions: Array<{
    mode: TransportMode;
    label: string;
    icon: string;
  }> = [
    { mode: 'car', label: '자동차', icon: '🚗' },
    { mode: 'walk', label: '도보', icon: '🚶' },
    { mode: 'bicycle', label: '자전거', icon: '🚲' },
    { mode: 'transit', label: '대중교통', icon: '🚆' },
    { mode: 'motorcycle', label: '오토바이', icon: '🏍️' }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>이동 수단 선택</Text>
      <View style={styles.optionsContainer}>
        {transportOptions.map(option => (
          <TouchableOpacity
            key={option.mode}
            style={[
              styles.option,
              selectedMode === option.mode && styles.selectedOption,
              disabled && styles.disabledOption
            ]}
            onPress={() => !disabled && onSelectMode(option.mode)}
            disabled={disabled}
          >
            <Text style={styles.icon}>{option.icon}</Text>
            <Text 
              style={[
                styles.label,
                selectedMode === option.mode && styles.selectedLabel,
                disabled && styles.disabledLabel
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  option: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 60,
    marginBottom: 8
  },
  selectedOption: {
    backgroundColor: '#3498db',
  },
  disabledOption: {
    opacity: 0.5
  },
  icon: {
    fontSize: 24,
    marginBottom: 4
  },
  label: {
    fontSize: 12,
    color: '#333'
  },
  selectedLabel: {
    color: '#fff',
    fontWeight: 'bold'
  },
  disabledLabel: {
    color: '#999'
  }
});