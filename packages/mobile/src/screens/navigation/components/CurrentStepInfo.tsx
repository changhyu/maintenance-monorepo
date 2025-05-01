import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteStep } from '../../../services/NavigationService';
import { formatDistance, getStepIcon } from '../utils/formatUtils';

interface CurrentStepInfoProps {
  step: RouteStep;
}

/**
 * 내비게이션 중 현재 단계 정보를 보여주는 컴포넌트
 */
const CurrentStepInfo: React.FC<CurrentStepInfoProps> = ({ step }) => {
  return (
    <View style={styles.currentStepContainer}>
      <MaterialIcons
        name={getStepIcon(step.maneuver) as any}
        size={32}
        color="#0066FF"
      />
      <View style={styles.stepInfoContainer}>
        <Text style={styles.stepInstruction}>{step.instruction}</Text>
        <Text style={styles.stepDistance}>
          {formatDistance(step.distance ?? 0)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  currentStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  stepInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  stepInstruction: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stepDistance: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default CurrentStepInfo;