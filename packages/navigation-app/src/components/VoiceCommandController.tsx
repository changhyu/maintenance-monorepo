import React, { useEffect, useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { VoiceCommandListener } from './VoiceCommandListener';
import { useVoiceSettings } from '../hooks/useVoiceSettings';

// Mock VoiceGuidanceService 구현
const MobileVoiceGuidanceService = {
  initialize: async () => console.log('VoiceGuidanceService initialized'),
  stop: async () => console.log('Voice guidance stopped'),
  playNotification: async (message: string) => console.log(`Notification: ${message}`)
};

interface VoiceCommandControllerProps {
  visible?: boolean;
}

/**
 * 음성 명령 컨트롤러 컴포넌트
 * 네비게이션 앱에 음성 명령 기능을 통합하는 주요 컴포넌트입니다.
 * 이 컴포넌트는 VoiceCommandListener를 활용하여 UI를 제공하고
 * 음성 명령을 처리하여 적절한 앱 기능으로 연결합니다.
 */
export const VoiceCommandController: React.FC<VoiceCommandControllerProps> = ({
  visible = true
}) => {
  const [commandProcessing, setCommandProcessing] = useState(false);
  const navigation = useNavigation();
  const { voiceSettings } = useVoiceSettings();
  
  // 음성 명령 활성화 여부 확인
  const voiceCommandEnabled = voiceSettings.voiceEnabled && voiceSettings.voiceEnabled;
  
  // 음성 명령 처리 함수
  const handleCommand = async (command: string, params?: any) => {
    if (!voiceCommandEnabled || commandProcessing) {
      return;
    }
    
    setCommandProcessing(true);
    
    try {
      console.log('명령 처리:', command, params);
      
      switch (command) {
        case 'navigate': {
          // 목적지로 내비게이션 시작
          if (params?.destination) {
            // 실제 구현에서는 다음과 같은 작업이 필요합니다:
            // 1. 목적지 주소/장소명을 좌표로 변환 (지오코딩)
            // 2. 현재 위치에서 목적지까지 경로 계산
            // 3. 경로 안내 시작
            
            // 임시 구현 (실제 앱 통합 시 수정 필요):
            Alert.alert(
              '안내 시작',
              `${params.destination}(으)로 안내를 시작합니다.`,
              [
                { text: '확인', onPress: () => {
                  // 경로 검색 화면으로 이동
                  // 참고: 실제 구현에서는 네비게이션 타입에 맞게 수정 필요
                  try {
                    // @ts-ignore - 실제 구현에서는 타입 정의 필요
                    navigation.navigate('SearchScreen', { 
                      searchQuery: params.destination
                    });
                  } catch (e) {
                    console.error('네비게이션 오류:', e);
                  }
                }}
              ]
            );
          }
          break;
        }
          
        case 'search': {
          // 장소 검색
          if (params?.query) {
            try {
              // @ts-ignore - 실제 구현에서는 타입 정의 필요
              navigation.navigate('SearchScreen', { searchQuery: params.query });
            } catch (e) {
              console.error('검색 화면 이동 오류:', e);
            }
          }
          break;
        }
          
        case 'settings': {
          // 설정 화면으로 이동
          try {
            // @ts-ignore - 실제 구현에서는 타입 정의 필요
            navigation.navigate('SettingsScreen');
          } catch (e) {
            console.error('설정 화면 이동 오류:', e);
          }
          break;
        }
          
        case 'voice_settings': {
          // 음성 설정 화면으로 이동
          try {
            // @ts-ignore - 실제 구현에서는 타입 정의 필요
            navigation.navigate('VoiceSettings');
          } catch (e) {
            console.error('음성 설정 화면 이동 오류:', e);
          }
          break;
        }
          
        case 'cancel': {
          // 현재 작업 취소 (음성 안내 중지 등)
          await MobileVoiceGuidanceService.stop();
          break;
        }
          
        default: {
          console.log(`알 수 없는 명령: ${command}`);
        }
      }
    } catch (error) {
      console.error('명령 처리 중 오류 발생:', error);
      MobileVoiceGuidanceService.playNotification('명령을 처리할 수 없습니다.');
    } finally {
      setCommandProcessing(false);
    }
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    const initVoiceServices = async () => {
      try {
        await MobileVoiceGuidanceService.initialize();
      } catch (error) {
        console.error('음성 서비스 초기화 오류:', error);
      }
    };
    
    initVoiceServices();
  }, []);

  // 음성 명령이 비활성화된 경우 UI를 표시하지 않음
  if (!voiceCommandEnabled || !visible) {
    return null;
  }

  return (
    <VoiceCommandListener
      onCommand={handleCommand}
      visible={true}
    />
  );
};

export default VoiceCommandController;