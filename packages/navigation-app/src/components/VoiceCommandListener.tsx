import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Mock 타입을 import하여 문제 해결
import { VoiceCommandCallbacks } from '../types/voice';
import { useNavigation } from '@react-navigation/native';
// 전체 NavigationStore가 아닌 필요한 훅만 import
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { useTheme } from '../themes/ThemeContext';

// 실제 프로젝트에 VoiceGuidanceService가 통합될 때 주석 해제
// import VoiceGuidanceService from '../../mobile/src/services/VoiceGuidanceService';

// Mock VoiceGuidanceService 구현 (실제 구현이 완료되면 제거)
const VoiceGuidanceService = {
  initialize: async () => {
    console.log('Voice service initialized');
  },
  startVoiceRecognition: async (callbacks: any) => {
    console.log('Voice recognition started', callbacks);
    return true;
  },
  stopVoiceRecognition: async () => {
    console.log('Voice recognition stopped');
  },
  playNotification: async (message: string) => {
    console.log('Notification:', message);
  },
  speak: async (text: string) => {
    console.log('Speaking:', text);
  }
};

interface VoiceCommandListenerProps {
  onCommand?: (command: string, params?: any) => void;
  visible?: boolean;
}

/**
 * 음성 명령을 감지하고 처리하는 컴포넌트
 * 음성 인식 버튼과 상태 표시를 제공합니다.
 */
export const VoiceCommandListener: React.FC<VoiceCommandListenerProps> = ({
  onCommand,
  visible = true
}) => {
  const [isListening, setIsListening] = useState(false);
  const [processingCommand, setProcessingCommand] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const navigation = useNavigation();
  
  // 실제 구현시 NavigationStore 훅으로 교체
  // const { toggleVoiceGuidance, updateSettings } = useNavigationStore();
  const { toggleVoiceGuidance, updateVoiceSettings } = useVoiceSettings();
  const { colors } = useTheme();

  // 음성 안내 서비스 초기화
  useEffect(() => {
    const initVoiceService = async () => {
      await VoiceGuidanceService.initialize();
    };
    
    initVoiceService();
    
    return () => {
      if (isListening) {
        VoiceGuidanceService.stopVoiceRecognition();
      }
    };
  }, []);

  // 음성 명령 콜백 처리
  const handleVoiceCommands: VoiceCommandCallbacks = {
    onNavigationCommand: (command: string, params?: any) => {
      setProcessingCommand(true);
      console.log('네비게이션 명령:', command, params);
      
      // 목적지 검색 및 경로 설정
      if (command === 'navigate' && params?.destination) {
        // 목적지로 안내 시작
        onCommand?.('navigate', params);
        
        // 음성 안내 재생
        VoiceGuidanceService.playNotification(`${params.destination}(으)로 경로를 안내합니다.`);
      }
      
      setProcessingCommand(false);
    },
    
    onVolumeCommand: (action: 'up' | 'down' | 'mute' | 'unmute') => {
      setProcessingCommand(true);
      console.log('음량 제어 명령:', action);
      
      // Mock 구현 - 실제 볼륨 조정 로직 필요
      switch (action) {
        case 'up': {
          VoiceGuidanceService.playNotification('음량이 높아졌습니다.');
          break;
        }
          
        case 'down': {
          VoiceGuidanceService.playNotification('음량이 낮아졌습니다.');
          break;
        }
          
        case 'mute': {
          // 실제 구현: updateSettings({ voiceEnabled: false });
          updateVoiceSettings({ voiceEnabled: false });
          break;
        }
          
        case 'unmute': {
          // 실제 구현: updateSettings({ voiceEnabled: true });
          updateVoiceSettings({ voiceEnabled: true });
          VoiceGuidanceService.playNotification('음성 안내가 다시 활성화되었습니다.');
          break;
        }
      }
      
      setProcessingCommand(false);
    },
    
    onSearchCommand: (query: string) => {
      setProcessingCommand(true);
      console.log('검색 명령:', query);
      
      // 검색 화면으로 이동하여 검색어 전달
      onCommand?.('search', { query });
      
      setProcessingCommand(false);
    },
    
    onSystemCommand: (command: string) => {
      setProcessingCommand(true);
      console.log('시스템 명령:', command);
      
      switch (command) {
        case 'help': {
          // 도움말 표시
          Alert.alert(
            '음성 명령 도움말',
            '사용 가능한 명령:\n\n' +
            '- "[장소명]으로 가자" - 목적지 설정\n' +
            '- "음량 높여/낮춰" - 음량 조절\n' +
            '- "[검색어] 검색해" - 장소 검색\n' +
            '- "도움말" - 이 화면 표시\n' +
            '- "취소/종료" - 명령 취소'
          );
          break;
        }
          
        case 'cancel': {
          // 현재 작업 취소
          onCommand?.('cancel', {});
          VoiceGuidanceService.playNotification('명령이 취소되었습니다.');
          break;
        }
      }
      
      setProcessingCommand(false);
    }
  };

  // 음성 인식 토글
  const toggleVoiceRecognition = useCallback(async () => {
    try {
      if (isListening) {
        await VoiceGuidanceService.stopVoiceRecognition();
        setIsListening(false);
        setRecognizedText('');
      } else {
        const started = await VoiceGuidanceService.startVoiceRecognition(handleVoiceCommands);
        setIsListening(started);
        if (started) {
          VoiceGuidanceService.playNotification('음성 명령을 말씀해주세요');
        } else {
          Alert.alert('알림', '음성 인식을 시작할 수 없습니다. 권한을 확인해주세요.');
        }
      }
    } catch (error) {
      console.error('음성 인식 토글 오류:', error);
      setIsListening(false);
      Alert.alert('오류', '음성 인식 중 문제가 발생했습니다.');
    }
  }, [isListening, handleVoiceCommands]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isListening ? styles.listeningButton : {},
          { backgroundColor: colors.card }
        ]}
        onPress={toggleVoiceRecognition}
        disabled={processingCommand}
      >
        {processingCommand ? (
          <ActivityIndicator color={isListening ? colors.primary : colors.text} size="small" />
        ) : (
          <Ionicons
            name={isListening ? "mic" : "mic-outline"}
            size={24}
            color={isListening ? colors.primary : colors.text}
          />
        )}
      </TouchableOpacity>
      
      {isListening && (
        <View style={[styles.recognitionStatus, { backgroundColor: colors.card }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {recognizedText || '듣는 중...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    alignItems: 'flex-end'
  },
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listeningButton: {
    borderColor: '#0066FF',
    borderWidth: 2,
  },
  recognitionStatus: {
    marginTop: 8,
    padding: 8,
    borderRadius: 16,
    maxWidth: 200,
  },
  statusText: {
    fontSize: 14,
  }
});