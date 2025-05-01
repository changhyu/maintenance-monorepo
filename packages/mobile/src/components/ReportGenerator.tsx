import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useReport } from '../context/ReportContext';
import { useReservationFilter } from '../context/ReservationFilterContext';
import { useTemplate } from '../context/TemplateContext';
import { colors, spacing, typography } from '../theme';

const ReportGenerator: React.FC = () => {
  const { generating, error, generateReport, generateSummaryReport } = useReport();
  const { filteredReservations } = useReservationFilter();
  const { templates, settings, getTemplate } = useTemplate();

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    format: 'pdf' as const,
    dateRange: {
      startDate: null as Date | null,
      endDate: null as Date | null,
    },
    includeFields: {
      status: true,
      serviceType: true,
      priority: true,
      duration: true,
      cost: true,
      location: true,
      notes: false,
      parts: false,
    },
    groupBy: 'none' as const,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (settings.lastUsedTemplate) {
      setSelectedTemplate(settings.lastUsedTemplate);
      const template = getTemplate(settings.lastUsedTemplate);
      if (template) {
        setReportOptions(template.options);
      }
    }
  }, [settings.lastUsedTemplate]);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setReportOptions(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          startDate: selectedDate,
        },
      }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setReportOptions(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          endDate: selectedDate,
        },
      }));
    }
  };

  const toggleField = (field: keyof typeof reportOptions.includeFields) => {
    setReportOptions(prev => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: !prev.includeFields[field],
      },
    }));
  };

  const handleGenerateReport = async () => {
    await generateReport(reportOptions);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setReportOptions(template.options);
    }
  };

  if (generating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>보고서 생성 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>보고서 생성</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>빠른 보고서</Text>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={generateSummaryReport}
        >
          <Text style={styles.quickButtonText}>요약 보고서 생성</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => generateReport({
            ...reportOptions,
            dateRange: {
              startDate: new Date(),
              endDate: new Date(),
            },
          })}
        >
          <Text style={styles.quickButtonText}>오늘의 보고서 생성</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>보고서 형식</Text>
        <View style={styles.formatButtons}>
          {[
            { value: 'pdf', label: 'PDF' },
            { value: 'csv', label: 'CSV' },
            { value: 'excel', label: 'Excel' },
          ].map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.formatButton,
                reportOptions.format === value && styles.formatButtonActive,
              ]}
              onPress={() =>
                setReportOptions(prev => ({ ...prev, format: value as any }))
              }
            >
              <Text
                style={[
                  styles.formatButtonText,
                  reportOptions.format === value && styles.formatButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>날짜 범위</Text>
        <View style={styles.dateRangeContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {reportOptions.dateRange.startDate
                ? reportOptions.dateRange.startDate.toLocaleDateString()
                : '시작일'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dateRangeSeparator}>~</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {reportOptions.dateRange.endDate
                ? reportOptions.dateRange.endDate.toLocaleDateString()
                : '종료일'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>포함할 정보</Text>
        {Object.entries(reportOptions.includeFields).map(([field, value]) => (
          <View key={field} style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>
              {field === 'status' ? '상태' :
               field === 'serviceType' ? '서비스 유형' :
               field === 'priority' ? '우선순위' :
               field === 'duration' ? '소요 시간' :
               field === 'cost' ? '비용' :
               field === 'location' ? '위치' :
               field === 'notes' ? '메모' : '부품'}
            </Text>
            <Switch
              value={value}
              onValueChange={() => toggleField(field as keyof typeof reportOptions.includeFields)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>그룹화</Text>
        <View style={styles.groupButtons}>
          {[
            { value: 'none', label: '없음' },
            { value: 'status', label: '상태별' },
            { value: 'serviceType', label: '서비스 유형별' },
            { value: 'priority', label: '우선순위별' },
            { value: 'technician', label: '기술자별' },
          ].map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.groupButton,
                reportOptions.groupBy === value && styles.groupButtonActive,
              ]}
              onPress={() =>
                setReportOptions(prev => ({ ...prev, groupBy: value as any }))
              }
            >
              <Text
                style={[
                  styles.groupButtonText,
                  reportOptions.groupBy === value && styles.groupButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>템플릿 선택</Text>
        <View style={styles.templateButtons}>
          {templates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateButton,
                selectedTemplate === template.id && styles.templateButtonActive,
              ]}
              onPress={() => handleTemplateSelect(template.id)}
            >
              <Text
                style={[
                  styles.templateButtonText,
                  selectedTemplate === template.id && styles.templateButtonTextActive,
                ]}
              >
                {template.name}
              </Text>
              {template.isDefault && (
                <Text style={styles.defaultBadge}>기본</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateReport}
      >
        <Text style={styles.generateButtonText}>보고서 생성</Text>
      </TouchableOpacity>

      {showStartDatePicker && (
        <DateTimePicker
          value={reportOptions.dateRange.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={reportOptions.dateRange.endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}
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
  loadingText: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.m,
  },
  header: {
    padding: spacing.l,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  errorContainer: {
    padding: spacing.m,
    backgroundColor: colors.error,
    marginBottom: spacing.m,
  },
  errorText: {
    ...typography.body,
    color: colors.surface,
  },
  section: {
    padding: spacing.l,
    backgroundColor: colors.surface,
    marginTop: spacing.s,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.m,
  },
  quickButton: {
    padding: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
  },
  quickButtonText: {
    ...typography.body,
    color: colors.surface,
    textAlign: 'center',
  },
  formatButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.m,
  },
  formatButton: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    marginHorizontal: spacing.s,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  formatButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formatButtonText: {
    ...typography.body,
    color: colors.text,
  },
  formatButtonTextActive: {
    color: colors.surface,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  dateRangeSeparator: {
    ...typography.body,
    color: colors.text,
    marginHorizontal: spacing.m,
  },
  fieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabel: {
    ...typography.body,
    color: colors.text,
  },
  groupButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.xs,
  },
  groupButton: {
    margin: spacing.xs,
    padding: spacing.s,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupButtonText: {
    ...typography.body,
    color: colors.text,
  },
  groupButtonTextActive: {
    color: colors.surface,
  },
  generateButton: {
    margin: spacing.l,
    padding: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: spacing.s,
  },
  generateButtonText: {
    ...typography.body,
    color: colors.surface,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  templateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.xs,
  },
  templateButton: {
    margin: spacing.xs,
    padding: spacing.s,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  templateButtonText: {
    ...typography.body,
    color: colors.text,
  },
  templateButtonTextActive: {
    color: colors.surface,
  },
  defaultBadge: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: spacing.xxs,
    marginLeft: spacing.xs,
  },
});

export default ReportGenerator; 