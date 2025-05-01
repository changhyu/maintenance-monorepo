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
  Share as RNShare,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useShare } from '../context/ShareContext';
import { colors, spacing, typography } from '../theme';
import { ShareSettings } from '../types/report';

const ShareManager: React.FC<{ reportId: string }> = ({ reportId }) => {
  const {
    links,
    permissions,
    activities,
    recipients,
    loading,
    error,
    createShareLink,
    updateShareLink,
    deleteShareLink,
    shareViaEmail,
  } = useShare();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [settings, setSettings] = useState<ShareSettings>({
    allowPublicAccess: false,
    allowDownload: true,
    allowPrint: true,
    allowEdit: false,
    watermark: '',
  });
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const handleCreateLink = async () => {
    try {
      const link = await createShareLink(reportId, settings);
      await RNShare.share({
        message: `보고서 공유 링크: ${link.url}`,
      });
    } catch (err) {
      Alert.alert('오류', '공유 링크 생성 중 오류가 발생했습니다.');
    }
  };

  const handleShareViaEmail = async () => {
    if (!emailRecipients.trim()) {
      Alert.alert('오류', '이메일 주소를 입력해주세요.');
      return;
    }

    const recipients = emailRecipients
      .split(',')
      .map(email => ({ email: email.trim() }))
      .filter(({ email }) => email);

    if (recipients.length === 0) {
      Alert.alert('오류', '유효한 이메일 주소를 입력해주세요.');
      return;
    }

    try {
      await shareViaEmail(reportId, recipients, emailMessage);
      Alert.alert('성공', '이메일이 전송되었습니다.');
      setEmailRecipients('');
      setEmailMessage('');
    } catch (err) {
      Alert.alert('오류', '이메일 전송 중 오류가 발생했습니다.');
    }
  };

  const handleExpirationDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSettings(prev => ({
        ...prev,
        expirationDate: selectedDate,
      }));
    }
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
        <Text style={styles.title}>공유 관리</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>공유 설정</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>공개 액세스 허용</Text>
          <Switch
            value={settings.allowPublicAccess}
            onValueChange={value =>
              setSettings(prev => ({ ...prev, allowPublicAccess: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>다운로드 허용</Text>
          <Switch
            value={settings.allowDownload}
            onValueChange={value =>
              setSettings(prev => ({ ...prev, allowDownload: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>인쇄 허용</Text>
          <Switch
            value={settings.allowPrint}
            onValueChange={value =>
              setSettings(prev => ({ ...prev, allowPrint: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>편집 허용</Text>
          <Switch
            value={settings.allowEdit}
            onValueChange={value =>
              setSettings(prev => ({ ...prev, allowEdit: value }))
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <Text style={styles.label}>워터마크</Text>
        <TextInput
          style={styles.input}
          placeholder="워터마크 텍스트"
          value={settings.watermark}
          onChangeText={text => setSettings(prev => ({ ...prev, watermark: text }))}
        />

        <Text style={styles.label}>만료일</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {settings.expirationDate
              ? settings.expirationDate.toLocaleDateString()
              : '만료일 선택'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createLinkButton}
          onPress={handleCreateLink}
        >
          <Text style={styles.createLinkButtonText}>공유 링크 생성</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이메일로 공유</Text>
        <TextInput
          style={styles.input}
          placeholder="이메일 주소 (쉼표로 구분)"
          value={emailRecipients}
          onChangeText={setEmailRecipients}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="메시지 (선택사항)"
          value={emailMessage}
          onChangeText={setEmailMessage}
          multiline
        />
        <TouchableOpacity
          style={styles.emailButton}
          onPress={handleShareViaEmail}
        >
          <Text style={styles.emailButtonText}>이메일 전송</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>공유 링크</Text>
        {links
          .filter(link => link.reportId === reportId)
          .map(link => (
            <View key={link.id} style={styles.linkItem}>
              <Text style={styles.linkUrl}>{link.url}</Text>
              <Text style={styles.linkInfo}>
                생성일: {new Date(link.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.linkInfo}>
                접근 횟수: {link.accessCount}
              </Text>
              {link.lastAccessed && (
                <Text style={styles.linkInfo}>
                  마지막 접근: {new Date(link.lastAccessed).toLocaleString()}
                </Text>
              )}
              <View style={styles.linkActions}>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => RNShare.share({ message: link.url })}
                >
                  <Text style={styles.copyButtonText}>복사</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton]}
                  onPress={() => deleteShareLink(link.id)}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={settings.expirationDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleExpirationDateChange}
          minimumDate={new Date()}
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
  label: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.m,
    marginBottom: spacing.s,
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
  dateButton: {
    padding: spacing.m,
    backgroundColor: colors.background,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  createLinkButton: {
    backgroundColor: colors.primary,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginTop: spacing.m,
    alignItems: 'center',
  },
  createLinkButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  emailButton: {
    backgroundColor: colors.primary,
    padding: spacing.m,
    borderRadius: spacing.s,
    alignItems: 'center',
  },
  emailButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  linkItem: {
    backgroundColor: colors.background,
    padding: spacing.m,
    borderRadius: spacing.s,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkUrl: {
    ...typography.body,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  linkInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  linkActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.s,
  },
  copyButton: {
    backgroundColor: colors.primary,
    padding: spacing.s,
    borderRadius: spacing.xs,
    marginRight: spacing.s,
  },
  copyButtonText: {
    ...typography.body,
    color: colors.surface,
  },
  deleteButton: {
    backgroundColor: colors.error,
    padding: spacing.s,
    borderRadius: spacing.xs,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.surface,
  },
});

export default ShareManager; 