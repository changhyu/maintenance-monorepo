import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface NavigationControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onStop: () => void;
}

/**
 * 내비게이션 제어 버튼들(이전, 중지, 다음)을 제공하는 컴포넌트
 */
const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentStepIndex,
  totalSteps,
  onPrevious,
  onNext,
  onStop,
}) => {
  return (
    <View style={styles.navigationControls}>
      <TouchableOpacity
        style={styles.navControlButton}
        onPress={onPrevious}
        disabled={currentStepIndex === 0}
      >
        <MaterialIcons
          name="arrow-back"
          size={24}
          color={currentStepIndex === 0 ? '#ccc' : '#0066FF'}
        />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.navControlButton, styles.stopButton]}
        onPress={onStop}
      >
        <MaterialIcons name="stop" size={24} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.navControlButton}
        onPress={onNext}
        disabled={currentStepIndex >= totalSteps - 1}
      >
        <MaterialIcons
          name="arrow-forward"
          size={24}
          color={
            currentStepIndex >= totalSteps - 1
              ? '#ccc'
              : '#0066FF'
          }
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  navControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
});

export default NavigationControls;