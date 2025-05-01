import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useVoiceGuidance } from '../hooks/useVoiceGuidance';
import { useNavigationStore } from '../stores/navigationStore';

interface VoiceGuidanceControllerProps {
  showControls?: boolean;
}

/**
 * 음성 안내를 제어하는 컴포넌트
 * 네비게이션 중 자동으로 음성 안내를 제공하고, 사용자가 설정을 조정할 수 있는 UI 제공
 */
export const VoiceGuidanceController: React.FC<VoiceGuidanceControllerProps> = ({
  showControls = true,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const {
    options,
    isSpeaking,
    updateOptions,
    setEnabled,
    announceStep,
    announceAlert,
  } = useVoiceGuidance();
  
  const { navigationState } = useNavigationStore();
  const { currentRoute, currentStepIndex, navigationMode, userOffRoute } = navigationState;
  
  // 변경된 경로 단계에 따라 음성 안내 제공
  useEffect(() => {
    if (
      navigationMode === 'navigating' &&
      currentRoute?.steps &&
      currentStepIndex < currentRoute.steps.length
    ) {
      const currentStep = currentRoute.steps[currentStepIndex];
      announceStep(currentStep);
    }
  }, [navigationMode, currentStepIndex, currentRoute?.steps, announceStep]);
  
  // 경로 이탈 시 경고 안내
  useEffect(() => {
    if (userOffRoute) {
      announceAlert('경로를 이탈했습니다. 새로운 경로를 계산중입니다.');
    }
  }, [userOffRoute, announceAlert]);
  
  // 볼륨 조절 핸들러
  const handleVolumeChange = useCallback(
    (value: number) => {
      updateOptions({ volume: value });
    },
    [updateOptions]
  );
  
  // 속도 조절 핸들러
  const handleSpeedChange = useCallback(
    (value: number) => {
      updateOptions({ speed: value });
    },
    [updateOptions]
  );
  
  // 음성 안내 활성화/비활성화 토글
  const toggleVoiceGuidance = useCallback(() => {
    setEnabled(!options.enabled);
  }, [options.enabled, setEnabled]);
  
  // 효과음 활성화/비활성화 토글
  const toggleSoundEffects = useCallback(() => {
    updateOptions({ soundEffectsEnabled: !options.soundEffectsEnabled });
  }, [options.soundEffectsEnabled, updateOptions]);
  
  if (!showControls) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {/* 음성 안내 버튼 */}
      <TouchableOpacity
        style={styles.voiceButton}
        onPress={toggleVoiceGuidance}
        activeOpacity={0.7}
      >
        <Ionicons
          name={options.enabled ? 'volume-high' : 'volume-mute'}
          size={24}
          color={options.enabled ? '#0066FF' : '#888888'}
        />
      </TouchableOpacity>
      
      {/* 설정 버튼 */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={22} color="#555555" />
      </TouchableOpacity>
      
      {/* 설정 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>음성 안내 설정</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>음성 안내</Text>
              <TouchableOpacity onPress={toggleVoiceGuidance}>
                <View style={[styles.switch, options.enabled ? styles.switchOn : styles.switchOff]}>
                  <View style={[styles.switchThumb, options.enabled ? styles.switchThumbOn : styles.switchThumbOff]} />
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>효과음</Text>
              <TouchableOpacity onPress={toggleSoundEffects}>
                <View style={[styles.switch, options.soundEffectsEnabled ? styles.switchOn : styles.switchOff]}>
                  <View style={[styles.switchThumb, options.soundEffectsEnabled ? styles.switchThumbOn : styles.switchThumbOff]} />
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.settingLabel}>볼륨</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={options.volume}
                onValueChange={handleVolumeChange}
                minimumTrackTintColor="#0066FF"
                maximumTrackTintColor="#CCCCCC"
                thumbTintColor="#0066FF"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>작게</Text>
                <Text style={styles.sliderLabel}>크게</Text>
              </View>
            </View>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.settingLabel}>속도</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2}
                value={options.speed}
                onValueChange={handleSpeedChange}
                minimumTrackTintColor="#0066FF"
                maximumTrackTintColor="#CCCCCC"
                thumbTintColor="#0066FF"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>느리게</Text>
                <Text style={styles.sliderLabel}>빠르게</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 활성 상태 표시 (말하는 중일 때) */}
      {isSpeaking && (
        <View style={styles.speakingIndicator}>
          <Ionicons name="radio" size={14} color="#FF6600" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  settingsButton: {
    marginLeft: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  speakingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  switchOn: {
    backgroundColor: '#34C759',
  },
  switchOff: {
    backgroundColor: '#CCCCCC',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  switchThumbOff: {
    transform: [{ translateX: 0 }],
  },
  sliderContainer: {
    marginVertical: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666666',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#0066FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});