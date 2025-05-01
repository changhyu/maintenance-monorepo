import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useReservation } from '../context/ReservationContext';
import { MaintenanceReservation } from '../types/maintenance';
import { colors, spacing, typography } from '../theme';

const ReservationForm: React.FC = () => {
  const navigation = useNavigation();
  const { createReservation } = useReservation();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState<Omit<MaintenanceReservation, 'id' | 'createdAt' | 'updatedAt'>>({
    vehicleId: '',
    customerId: '',
    serviceType: 'regular',
    status: 'pending',
    scheduledDate: new Date().toISOString(),
    estimatedDuration: 60,
    priority: 'medium',
    notes: '',
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await createReservation(formData);
      Alert.alert('성공', '예약이 생성되었습니다.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('오류', '예약 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        scheduledDate: selectedDate.toISOString(),
      }));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>차량 ID</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicleId}
          onChangeText={text => setFormData(prev => ({ ...prev, vehicleId: text }))}
          placeholder="차량 ID를 입력하세요"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>고객 ID</Text>
        <TextInput
          style={styles.input}
          value={formData.customerId}
          onChangeText={text => setFormData(prev => ({ ...prev, customerId: text }))}
          placeholder="고객 ID를 입력하세요"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>서비스 유형</Text>
        <View style={styles.buttonGroup}>
          {['regular', 'emergency', 'inspection', 'repair'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                formData.serviceType === type && styles.typeButtonActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, serviceType: type as any }))}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  formData.serviceType === type && styles.typeButtonTextActive,
                ]}
              >
                {type === 'regular' ? '정기' :
                 type === 'emergency' ? '긴급' :
                 type === 'inspection' ? '점검' : '수리'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>예약 날짜 및 시간</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {new Date(formData.scheduledDate).toLocaleString()}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(formData.scheduledDate)}
            mode="datetime"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>예상 소요 시간 (분)</Text>
        <TextInput
          style={styles.input}
          value={formData.estimatedDuration.toString()}
          onChangeText={text => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(text) || 0 }))}
          keyboardType="numeric"
          placeholder="예상 소요 시간을 입력하세요"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>우선순위</Text>
        <View style={styles.buttonGroup}>
          {['high', 'medium', 'low'].map(priority => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.priorityButton,
                formData.priority === priority && styles.priorityButtonActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, priority: priority as any }))}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  formData.priority === priority && styles.priorityButtonTextActive,
                ]}
              >
                {priority === 'high' ? '높음' :
                 priority === 'medium' ? '중간' : '낮음'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>메모</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.notes}
          onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
          placeholder="메모를 입력하세요"
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? '처리 중...' : '예약 생성'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.l,
    backgroundColor: colors.background,
  },
  formGroup: {
    marginBottom: spacing.m,
  },
  label: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    padding: spacing.m,
    borderRadius: spacing.s,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  typeButton: {
    flex: 1,
    margin: spacing.xs,
    padding: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    ...typography.body,
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.surface,
  },
  dateButton: {
    backgroundColor: colors.surface,
    padding: spacing.m,
    borderRadius: spacing.s,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
  },
  priorityButton: {
    flex: 1,
    margin: spacing.xs,
    padding: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: colors.primary,
  },
  priorityButtonText: {
    ...typography.body,
    color: colors.text,
  },
  priorityButtonTextActive: {
    color: colors.surface,
  },
  submitButton: {
    marginTop: spacing.l,
    padding: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
});

export default ReservationForm; 