import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import offlineMapService, { AutoUpdateSettings } from '../services/OfflineMapService';
import { useTheme } from '../themes/ThemeContext';

/**
 * 자동 업데이트 설정 화면 컴포넌트
 */
export const AutoUpdateSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  // 자동 업데이트 설정 상태
  const [settings, setSettings] = useState<AutoUpdateSettings>({
    enabled: false,
    wifiOnly: true,
    updateInterval: 'weekly',
    timeOfDay: '02:00',
    lastAutoCheck: 0
  });

  // 시간 선택기 표시 상태
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 컴포넌트 마운트 시 설정 로드
  useEffect(() => {
    const currentSettings = offlineMapService.getAutoUpdateSettings();
    setSettings(currentSettings);
  }, []);

  // 설정 변경 핸들러
  const handleSettingChange = (key: keyof AutoUpdateSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 시간 형식 변환 (00:00 형식)
  const formatTimeString = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // 시간 선택 처리
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    
    if (selectedDate) {
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const timeString = `${hours}:${minutes}`;
      handleSettingChange('timeOfDay', formatTimeString(timeString));
    }
  };

  // 현재 시간 문자열에서 Date 객체 생성
  const getTimeDate = (): Date => {
    const now = new Date();
    const [hours, minutes] = settings.timeOfDay.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);
    return now;
  };

  // 설정 저장
  const saveSettings = () => {
    offlineMapService.updateAutoUpdateSettings(settings);
    Alert.alert(
      '설정 저장됨',
      '자동 업데이트 설정이 저장되었습니다.',
      [{ text: '확인', onPress: () => navigation.goBack() }]
    );
  };

  // 업데이트 주기 선택 대화상자 표시
  const showIntervalPicker = () => {
    Alert.alert(
      '업데이트 주기 선택',
      '오프라인 지도의 자동 업데이트 주기를 선택하세요',
      [
        { text: '매일', onPress: () => handleSettingChange('updateInterval', 'daily') },
        { text: '매주', onPress: () => handleSettingChange('updateInterval', 'weekly') },
        { text: '매월', onPress: () => handleSettingChange('updateInterval', 'monthly') },
        { text: '업데이트 안함', onPress: () => handleSettingChange('updateInterval', 'never') },
        { text: '취소', style: 'cancel' }
      ]
    );
  };

  // 테스트 업데이트 실행
  const runTestUpdate = () => {
    Alert.alert(
      '테스트 업데이트',
      '지금 오프라인 지도의 업데이트 체크를 실행하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '실행', 
          onPress: async () => {
            try {
              const outdatedRegions = await offlineMapService.checkForUpdates();
              if (outdatedRegions.length > 0) {
                Alert.alert(
                  '업데이트 필요',
                  `${outdatedRegions.length}개의 오프라인 지도에 업데이트가 필요합니다.`,
                  [{ text: '확인' }]
                );
              } else {
                Alert.alert(
                  '업데이트 불필요',
                  '모든 오프라인 지도가 최신 상태입니다.',
                  [{ text: '확인' }]
                );
              }
            } catch (error) {
              Alert.alert(
                '오류',
                '업데이트 체크 중 오류가 발생했습니다.',
                [{ text: '확인' }]
              );
            }
          }
        }
      ]
    );
  };

  // 간격 텍스트로 변환
  const getIntervalText = (interval: string): string => {
    switch(interval) {
      case 'daily': return '매일';
      case 'weekly': return '매주';
      case 'monthly': return '매월';
      case 'never': return '업데이트 안함';
      default: return '매주';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>자동 업데이트 설정</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 자동 업데이트 활성화 섹션 */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="refresh-circle" size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>자동 업데이트</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>자동 업데이트 활성화</Text>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => handleSettingChange('enabled', value)}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={settings.enabled ? colors.accent : '#f4f3f4'}
            />
          </View>

          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            자동 업데이트를 활성화하면 설정한 조건에 따라 오프라인 지도가 자동으로 업데이트됩니다.
          </Text>
        </View>

        {/* 업데이트 조건 설정 */}
        <View style={[styles.section, { backgroundColor: colors.card, opacity: settings.enabled ? 1 : 0.6 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options" size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>업데이트 조건</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Wi-Fi 연결 시에만</Text>
            <Switch
              value={settings.wifiOnly}
              onValueChange={(value) => handleSettingChange('wifiOnly', value)}
              disabled={!settings.enabled}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={settings.wifiOnly ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>업데이트 주기</Text>
            <TouchableOpacity 
              style={[styles.buttonSelector, { backgroundColor: isDark ? '#2c3e50' : '#ecf0f1' }]}
              onPress={showIntervalPicker}
              disabled={!settings.enabled}
            >
              <Text style={[styles.buttonText, { color: isDark ? '#ecf0f1' : '#2c3e50' }]}>
                {getIntervalText(settings.updateInterval)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>업데이트 시간</Text>
            <TouchableOpacity 
              style={[styles.buttonSelector, { backgroundColor: isDark ? '#2c3e50' : '#ecf0f1' }]}
              onPress={() => settings.enabled && setShowTimePicker(true)}
              disabled={!settings.enabled}
            >
              <Text style={[styles.buttonText, { color: isDark ? '#ecf0f1' : '#2c3e50' }]}>
                {settings.timeOfDay}
              </Text>
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={getTimeDate()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            설정한 시간 근처(±30분)에 업데이트를 시도합니다. 실제 업데이트는 기기가 켜져 있고 인터넷에 연결되어 있을 때만 실행됩니다.
          </Text>
        </View>

        {/* 테스트 및 버튼 영역 */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.info }]}
            onPress={runTestUpdate}
          >
            <Ionicons name="search" size={18} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>업데이트 확인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.success }]}
            onPress={saveSettings}
          >
            <Ionicons name="save" size={18} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>설정 저장</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color={colors.info} style={{ marginRight: 8 }} />
          <Text style={[styles.infoText, { color: colors.secondaryText }]}>
            자동 업데이트는 기기가 켜져 있고 인터넷에 연결되어 있을 때만 실행됩니다. 배터리 소모를 최소화하기 위해 기본적으로 Wi-Fi 연결 시에만 실행되도록 설정되어 있습니다.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 14,
    padding: 16,
    paddingTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
  },
  buttonSelector: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 16,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  infoSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  }
});

export default AutoUpdateSettingsScreen;