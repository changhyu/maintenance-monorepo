import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTemplate } from '../context/TemplateContext';
import { useReport } from '../context/ReportContext';
import { colors, spacing, typography } from '../theme';
import DateTimePicker from '@react-native-community/datetimepicker';

const TemplateManager: React.FC = () => {
  const {
    templates,
    settings,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    updateSettings,
  } = useTemplate();

  const { reportOptions } = useReport();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    options: reportOptions,
  });

  const handleAddTemplate = async () => {
    if (!newTemplate.name) {
      Alert.alert('오류', '템플릿 이름을 입력해주세요.');
      return;
    }

    try {
      await addTemplate({
        ...newTemplate,
        createdBy: 'current_user', // 실제 사용자 ID로 대체
      });
      setNewTemplate({
        name: '',
        description: '',
        options: reportOptions,
      });
      Alert.alert('성공', '템플릿이 추가되었습니다.');
    } catch (err) {
      Alert.alert('오류', '템플릿 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTemplate = (id: string) => {
    Alert.alert(
      '템플릿 삭제',
      '이 템플릿을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(id);
              Alert.alert('성공', '템플릿이 삭제되었습니다.');
            } catch (err) {
              Alert.alert('오류', '템플릿 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>템플릿 관리</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>새 템플릿 추가</Text>
        <TextInput
          style={styles.input}
          placeholder="템플릿 이름"
          value={newTemplate.name}
          onChangeText={text => setNewTemplate(prev => ({ ...prev, name: text }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="설명 (선택사항)"
          value={newTemplate.description}
          onChangeText={text => setNewTemplate(prev => ({ ...prev, description: text }))}
          multiline
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddTemplate}
        >
          <Text style={styles.addButtonText}>템플릿 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>자동 저장</Text>
          <Switch
            value={settings.autoSave}
            onValueChange={value => updateSettings({ autoSave: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>템플릿 목록</Text>
        {templates.map(template => (
          <View key={template.id} style={styles.templateItem}>
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>{template.name}</Text>
              {template.isDefault && (
                <Text style={styles.defaultBadge}>기본</Text>
              )}
            </View>
            {template.description && (
              <Text style={styles.templateDescription}>{template.description}</Text>
            )}
            <Text style={styles.templateDate}>
              생성일: {new Date(template.createdAt).toLocaleDateString()}
            </Text>
            <View style={styles.templateActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setDefaultTemplate(template.id)}
              >
                <Text style={styles.actionButtonText}>기본으로 설정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteTemplate(template.id)}
              >
                <Text style={styles.actionButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
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
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: spacing.m,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
  },
  templateItem: {
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  templateName: {
    ...typography.h4,
    color: colors.text,
  },
  defaultBadge: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  templateDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  templateDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.m,
  },
  templateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: spacing.s,
    marginLeft: spacing.s,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: spacing.xs,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.primary,
  },
});

export default TemplateManager; 