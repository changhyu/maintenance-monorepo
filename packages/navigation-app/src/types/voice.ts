/**
 * 음성 인식 및 안내 관련 타입 정의
 */

// 음성 명령 콜백 인터페이스
export interface VoiceCommandCallbacks {
  onNavigationCommand?: (command: string, params?: Record<string, any>) => void;
  onVolumeCommand?: (action: 'up' | 'down' | 'mute' | 'unmute') => void;
  onSearchCommand?: (query: string) => void;
  onSystemCommand?: (command: string) => void;
}

// 음성 안내 옵션 인터페이스
export interface VoiceOptions {
  language?: string;        // 음성 언어
  pitch?: number;           // 음성 높낮이 (0.5 ~ 2.0)
  rate?: number;            // 음성 속도 (0.5 ~ 2.0)
  volume?: number;          // 음성 볼륨 (0.0 ~ 1.0)
  useSound?: boolean;       // 효과음 사용 여부
  muteGuidance?: boolean;   // 음성 안내 음소거 여부
  voiceEnabled?: boolean;   // 음성 안내 활성화 여부
  personalizedGuidance?: boolean; // 개인화된 안내 사용 여부
  batteryOptimization?: boolean;  // 배터리 최적화 사용 여부
  enhancedVoiceQuality?: boolean; // 향상된 음성 품질 사용 여부
  drivingStyle?: 'normal' | 'cautious' | 'sporty'; // 운전 스타일
  // 추가된 옵션들
  notifyTraffic?: boolean;           // 교통 상황 안내
  notifySpeedLimits?: boolean;       // 속도 제한 알림
  notifyPointsOfInterest?: boolean;  // 관심 지점 안내
  notifyRoadConditions?: boolean;    // 도로 상태 안내
  advancedDirections?: boolean;      // 상세 방향 안내
  voiceRecognition?: boolean;        // 음성 인식 사용 여부
}