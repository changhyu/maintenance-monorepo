import { useEffect, useRef, useState } from 'react';
import { RouteStep } from '../types';
import { VoiceGuidanceService, VoiceGuidanceOptions } from '../services/VoiceGuidanceService';

/**
 * 음성 안내 기능을 관리하는 React Hook
 * 현재 경로 안내나 경고 메시지를 음성으로 출력하는 기능을 제공
 */
export function useVoiceGuidance() {
  const serviceRef = useRef<VoiceGuidanceService | null>(null);
  const [options, setOptions] = useState<VoiceGuidanceOptions>({
    enabled: true,
    volume: 1.0,
    useNativeVoices: true,
    language: 'ko-KR',
    speed: 1.0,
    soundEffectsEnabled: true,
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // 서비스 초기화
  useEffect(() => {
    // 서비스 인스턴스 생성
    serviceRef.current = new VoiceGuidanceService();
    
    return () => {
      // 컴포넌트 언마운트 시 리소스 정리
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
    };
  }, []);
  
  // 옵션이 변경되면 서비스에 반영
  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.updateOptions(options);
    }
  }, [options]);
  
  /**
   * 음성 안내 옵션 업데이트
   * @param newOptions 새 옵션
   */
  const updateOptions = (newOptions: Partial<VoiceGuidanceOptions>) => {
    setOptions((prev: VoiceGuidanceOptions) => ({ ...prev, ...newOptions }));
  };
  
  /**
   * 음성 안내 활성화/비활성화
   * @param enabled 활성화 여부
   */
  const setEnabled = (enabled: boolean) => {
    updateOptions({ enabled });
    if (!enabled && serviceRef.current) {
      serviceRef.current.stopSpeaking();
      setIsSpeaking(false);
    }
  };
  
  /**
   * 현재 경로 단계 안내
   * @param step 경로 단계
   */
  const announceStep = async (step: RouteStep) => {
    if (serviceRef.current) {
      setIsSpeaking(true);
      const result = await serviceRef.current.announceStep(step);
      setIsSpeaking(false);
      return result;
    }
    return false;
  };
  
  /**
   * 경고 메시지 안내
   * @param message 경고 메시지
   */
  const announceAlert = async (message: string) => {
    if (serviceRef.current) {
      setIsSpeaking(true);
      const result = await serviceRef.current.announceAlert(message);
      setIsSpeaking(false);
      return result;
    }
    return false;
  };
  
  /**
   * 일반 메시지 안내
   * @param message 안내 메시지
   */
  const speak = async (message: string) => {
    if (serviceRef.current) {
      setIsSpeaking(true);
      const result = await serviceRef.current.speak(message);
      setIsSpeaking(false);
      return result;
    }
    return false;
  };
  
  /**
   * 진행 중인 음성 안내 중지
   */
  const stopSpeaking = () => {
    if (serviceRef.current) {
      serviceRef.current.stopSpeaking();
      setIsSpeaking(false);
    }
  };
  
  return {
    options,
    isSpeaking,
    updateOptions,
    setEnabled,
    announceStep,
    announceAlert,
    speak,
    stopSpeaking,
  };
}