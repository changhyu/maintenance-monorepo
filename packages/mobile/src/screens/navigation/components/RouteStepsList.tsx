import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteStep } from '../../../services/NavigationService';
import { formatDistance, formatDuration, getStepIcon } from '../utils/formatUtils';

interface RouteStepsListProps {
  steps: RouteStep[];
}

/**
 * 경로의 전체 단계 목록을 보여주는 컴포넌트
 */
const RouteStepsList: React.FC<RouteStepsListProps> = ({ steps }) => {
  return (
    <ScrollView style={styles.stepsContainer}>
      <Text style={styles.stepsTitle}>경로 안내</Text>
      
      {steps.map((step, index) => (
        <View 
          key={`step-${index}-${step.maneuver ?? ''}`} 
          style={styles.stepItem}
        >
          <MaterialIcons
            name={getStepIcon(step.maneuver) as any}
            size={24}
            color="#0066FF"
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepInstruction}>{step.instruction}</Text>
            <Text style={styles.stepDetail}>
              {formatDistance(step.distance ?? 0)} • {formatDuration(step.duration ?? 0)}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  stepsContainer: {
    maxHeight: 200,
    marginTop: 16,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
  },
  stepInstruction: {
    fontSize: 16,
    color: '#333',
  },
  stepDetail: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
});

export default RouteStepsList;