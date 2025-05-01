import { useState, useCallback } from 'react';
import { VoiceOptions } from '../types/voice';

// 기본 음성 설정
const defaultVoiceSettings: VoiceOptions = {
  voiceEnabled: true,
  language: 'ko-KR',
  pitch: 1.0,
  rate: 0.9,
  volume: 0.8,
  useSound: true,
  muteGuidance: false,
  personalizedGuidance: false,
  batteryOptimization: true,
  enhancedVoiceQuality: false,
  drivingStyle: 'normal',
};

/**
 * 음성 설정을 관리하는 훅
 * 실제 구현에서는 store나 context API를 사용하여 전역 상태로 관리할 수 있습니다.
 */
export function useVoiceSettings() {
  // 음성 설정 상태
  const [voiceSettings, setVoiceSettings] = useState<VoiceOptions>(defaultVoiceSettings);

  // 음성 안내 활성화/비활성화 토글
  const toggleVoiceGuidance = useCallback(() => {
    setVoiceSettings((prev) => ({
      ...prev,
      voiceEnabled: !prev.voiceEnabled,
    }));

    return voiceSettings.voiceEnabled;
  }, [voiceSettings.voiceEnabled]);

  // 음성 설정 업데이트
  const updateVoiceSettings = useCallback((newSettings: Partial<VoiceOptions>) => {
    setVoiceSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  // 음성 설정 초기화
  const resetVoiceSettings = useCallback(() => {
    setVoiceSettings(defaultVoiceSettings);
  }, []);

  return {
    voiceSettings,
    toggleVoiceGuidance,
    updateVoiceSettings,
    resetVoiceSettings,
  };
}