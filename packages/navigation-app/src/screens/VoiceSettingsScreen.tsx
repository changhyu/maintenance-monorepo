import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SliderComponent } from '../components/SliderComponent';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { useTheme } from '../themes/ThemeContext';
import { PickerComponent } from '../components/PickerComponent';
import { VoiceOptions } from '../types/voice';

const voiceGuidanceService = {
  speak: (text: string) => {
    console.log(`Speaking: ${text}`);
  },
  getOptions: () => ({
    language: 'ko-KR',
    pitch: 1.0,
    rate: 0.9,
    volume: 0.8,
  }),
};

/**
 * 음성 안내 상세 설정 화면
 */
export const VoiceSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { voiceSettings, updateVoiceSettings, toggleVoiceGuidance, resetVoiceSettings } = useVoiceSettings();
  const { colors } = useTheme();

  const [localVoiceSettings, setLocalVoiceSettings] = useState<VoiceOptions>({
    volume: voiceSettings.volume ?? 0.8,
    rate: voiceSettings.rate ?? 1.0,
    notifyTraffic: voiceSettings.notifyTraffic !== false,
    notifySpeedLimits: voiceSettings.notifySpeedLimits !== false,
    notifyPointsOfInterest: voiceSettings.notifyPointsOfInterest === true,
    notifyRoadConditions: voiceSettings.notifyRoadConditions === true,
    advancedDirections: voiceSettings.advancedDirections === true,
    personalizedGuidance: voiceSettings.personalizedGuidance === true,
    drivingStyle: voiceSettings.drivingStyle ?? 'normal',
    enhancedVoiceQuality: voiceSettings.enhancedVoiceQuality === true,
    batteryOptimization: voiceSettings.batteryOptimization !== false,
    voiceRecognition: voiceSettings.voiceRecognition === true,
  });

  const speakExample = (text: string) => {
    if (!voiceSettings.voiceEnabled) {
      Alert.alert('음성 안내 꺼짐', '음성 안내가 비활성화되어 있습니다. 먼저 활성화해주세요.');
      return;
    }

    voiceGuidanceService.speak(text);
  };

  const saveSettings = () => {
    updateVoiceSettings(localVoiceSettings);

    if (voiceSettings.voiceEnabled) {
      speakExample('음성 설정이 저장되었습니다.');
    }

    navigation.goBack();
  };

  const handleResetSettings = () => {
    Alert.alert('설정 초기화', '음성 안내 설정을 기본값으로 초기화하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: () => {
          setLocalVoiceSettings({
            volume: 0.8,
            rate: 1.0,
            notifyTraffic: true,
            notifySpeedLimits: true,
            notifyPointsOfInterest: false,
            notifyRoadConditions: true,
            advancedDirections: false,
            personalizedGuidance: false,
            drivingStyle: 'normal',
            enhancedVoiceQuality: false,
            batteryOptimization: true,
            voiceRecognition: true,
          });
        },
      },
    ]);
  };

  const renderVolumeIcon = () => {
    const volume = localVoiceSettings.volume ?? 0;
    if (volume === 0) {
      return 'volume-mute';
    }
    if (volume < 0.3) {
      return 'volume-low';
    }
    if (volume < 0.7) {
      return 'volume-medium';
    }
    return 'volume-high';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>음성 안내 상세 설정</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="volume-high" size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>음성 안내</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>음성 안내 활성화</Text>
            <Switch
              value={voiceSettings.voiceEnabled}
              onValueChange={toggleVoiceGuidance}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={voiceSettings.voiceEnabled ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>음성 명령 인식</Text>
            <Switch
              value={localVoiceSettings.voiceRecognition}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, voiceRecognition: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.voiceRecognition ? colors.accent : '#f4f3f4'}
            />
          </View>

          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            음성 안내를 켜면 주행 중 음성으로 방향과 정보를 안내받을 수 있습니다. 음성 명령 인식을 활성화하면 "목적지로 가자", "경로 검색" 등의 명령을 음성으로 내릴 수 있습니다.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name={renderVolumeIcon()} size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>볼륨 및 속도</Text>
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderRow}>
              <Ionicons name={renderVolumeIcon()} size={20} color={colors.secondaryText} />
              <SliderComponent
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={localVoiceSettings.volume ?? 0.8}
                onValueChange={(value: number) => setLocalVoiceSettings({ ...localVoiceSettings, volume: value })}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
              <Text style={[styles.sliderValue, { color: colors.secondaryText }]}>
                {Math.round((localVoiceSettings.volume ?? 0) * 100)}%
              </Text>
            </View>

            <View style={styles.sliderRow}>
              <Ionicons name="speedometer" size={20} color={colors.secondaryText} />
              <SliderComponent
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2}
                step={0.1}
                value={localVoiceSettings.rate ?? 1.0}
                onValueChange={(value: number) => setLocalVoiceSettings({ ...localVoiceSettings, rate: value })}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
              <Text style={[styles.sliderValue, { color: colors.secondaryText }]}>
                {(localVoiceSettings.rate ?? 1.0).toFixed(1)}x
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={() => speakExample('안녕하세요, 이것은 음성 안내 테스트입니다. 현재 볼륨과 속도로 음성이 들립니다.')}
            >
              <Text style={styles.testButtonText}>테스트 음성 들어보기</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>안내 유형</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>교통 상황 안내</Text>
            <Switch
              value={localVoiceSettings.notifyTraffic}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, notifyTraffic: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.notifyTraffic ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>속도 제한 알림</Text>
            <Switch
              value={localVoiceSettings.notifySpeedLimits}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, notifySpeedLimits: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.notifySpeedLimits ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>관심 지점 안내</Text>
            <Switch
              value={localVoiceSettings.notifyPointsOfInterest}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, notifyPointsOfInterest: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.notifyPointsOfInterest ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>도로 상태 안내</Text>
            <Switch
              value={localVoiceSettings.notifyRoadConditions}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, notifyRoadConditions: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.notifyRoadConditions ? colors.accent : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options" size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>고급 설정</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>상세 방향 안내</Text>
            <Switch
              value={localVoiceSettings.advancedDirections}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, advancedDirections: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.advancedDirections ? colors.accent : '#f4f3f4'}
            />
          </View>

          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            상세 방향 안내를 활성화하면 차선 정보와 이정표 등 더 자세한 정보를 음성으로 안내합니다.
          </Text>

          <TouchableOpacity
            style={[styles.exampleButton, { backgroundColor: colors.info }]}
            onPress={() => speakExample('300m 앞에서 우회전 하세요. 우측 2개 차선을 이용하세요. 강남역 방면입니다.')}
          >
            <Text style={styles.exampleButtonText}>상세 안내 예시 듣기</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>음성 안내 개인화</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>개인화된 안내</Text>
            <Switch
              value={localVoiceSettings.personalizedGuidance}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, personalizedGuidance: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.personalizedGuidance ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>운전 스타일</Text>
            <View style={styles.pickerContainer}>
              <PickerComponent
                selectedValue={localVoiceSettings.drivingStyle}
                style={{ width: 150, color: colors.text }}
                onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, drivingStyle: value })}
                enabled={localVoiceSettings.personalizedGuidance}
                items={[
                  { label: '일반', value: 'normal' },
                  { label: '신중함', value: 'cautious' },
                  { label: '스포티', value: 'sporty' },
                ]}
              />
            </View>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            개인화된 안내를 활성화하면 운전 스타일에 맞는 맞춤형 음성 안내가 제공됩니다. 신중한 스타일은 더 자세한 안내를, 스포티 스타일은 간결한 안내를 제공합니다.
          </Text>

          <TouchableOpacity
            style={[styles.exampleButton, { backgroundColor: colors.info }]}
            onPress={() => {
              const style = localVoiceSettings.drivingStyle;
              let exampleText = '';

              switch (style) {
                case 'cautious':
                  exampleText = '200미터 전방에서 천천히 안전하게 우회전하세요. 교차로에 신호등이 있습니다.';
                  break;
                case 'sporty':
                  exampleText = '200미터, 우회전';
                  break;
                default:
                  exampleText = '200미터 앞에서 우회전하세요.';
              }

              speakExample(exampleText);
            }}
          >
            <Text style={styles.exampleButtonText}>개인화 안내 예시 듣기</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mic" size={24} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>음성 품질 및 최적화</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>고품질 음성 안내</Text>
            <Switch
              value={localVoiceSettings.enhancedVoiceQuality}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, enhancedVoiceQuality: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.enhancedVoiceQuality ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>배터리 최적화</Text>
            <Switch
              value={localVoiceSettings.batteryOptimization}
              onValueChange={(value) => setLocalVoiceSettings({ ...localVoiceSettings, batteryOptimization: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={localVoiceSettings.batteryOptimization ? colors.accent : '#f4f3f4'}
            />
          </View>

          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            고품질 음성 안내는 더 자연스러운 음성을 제공하지만, 배터리를 더 많이 사용할 수 있습니다. 배터리 최적화 기능은 배터리 잔량이 낮을 때 불필요한 안내를 줄여 배터리를 절약합니다.
          </Text>

          <TouchableOpacity
            style={[styles.exampleButton, { backgroundColor: colors.info }]}
            onPress={() => {
              const isEnhanced = localVoiceSettings.enhancedVoiceQuality;
              const exampleText =
                '이것은 ' +
                (isEnhanced ? '향상된 ' : '기본 ') +
                '음성 품질로 안내하는 예시입니다. 음성이 어떻게 들리는지 확인하세요.';
              speakExample(exampleText);
            }}
          >
            <Text style={styles.exampleButtonText}>음성 품질 예시 듣기</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.buttonsContainer, { marginTop: 20 }]}>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.error }]}
            onPress={handleResetSettings}
          >
            <Text style={styles.buttonText}>초기화</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.success }]}
            onPress={saveSettings}
          >
            <Text style={styles.buttonText}>설정 저장</Text>
          </TouchableOpacity>
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
  sliderContainer: {
    padding: 16,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  sliderValue: {
    width: 50,
    textAlign: 'right',
  },
  testButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  exampleButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    margin: 16,
    marginTop: 8,
  },
  exampleButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 16,
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 4,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
});

export default VoiceSettingsScreen;