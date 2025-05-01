import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { RouteStep } from './NavigationService';

// 음성 안내 옵션 인터페이스
export interface VoiceOptions {
  language?: string;        // 음성 언어
  pitch?: number;           // 음성 높낮이 (0.5 ~ 2.0)
  rate?: number;            // 음성 속도 (0.5 ~ 2.0)
  volume?: number;          // 음성 볼륨 (0.0 ~ 1.0)
  useSound?: boolean;       // 효과음 사용 여부
  muteGuidance?: boolean;   // 음성 안내 음소거 여부
  personalizedGuidance?: boolean; // 개인화된 안내 사용 여부
  batteryOptimization?: boolean;  // 배터리 최적화 사용 여부
  enhancedVoiceQuality?: boolean; // 향상된 음성 품질 사용 여부
  drivingStyle?: 'normal' | 'cautious' | 'sporty'; // 운전 스타일
}

// 음성 인식 상태 인터페이스
export interface VoiceRecognitionState {
  isListening: boolean;
  results: string[];
  error?: string;
}

// 음성 인식 콜백 인터페이스
export interface VoiceCommandCallbacks {
  onNavigationCommand?: (command: string, params?: Record<string, any>) => void;
  onVolumeCommand?: (action: 'up' | 'down' | 'mute' | 'unmute') => void;
  onSearchCommand?: (query: string) => void;
  onSystemCommand?: (command: string) => void;
}

interface SoundAsset {
  path: string;
  sound: Audio.Sound | null;
  loaded: boolean;
  errorCount: number;
}

/**
 * 음성 안내 서비스 클래스
 * 네비게이션 앱에서 음성 안내, 음성 인식 기능을 제공
 */
class VoiceGuidanceService {
  private options: VoiceOptions = {
    language: 'ko-KR',
    pitch: 1.0,
    rate: 0.9,
    volume: 1.0,
    useSound: true,
    muteGuidance: false,
    personalizedGuidance: false,
    batteryOptimization: true,
    enhancedVoiceQuality: false,
    drivingStyle: 'normal'
  };
  
  private readonly soundPaths: Record<string, string> = {
    alert: require('../../assets/sounds/alert.mp3'),
    turn: require('../../assets/sounds/turn.mp3'),
    arrive: require('../../assets/sounds/arrive.mp3'),
    trafficAlert: require('../../assets/sounds/traffic_alert.mp3'),
    speedLimit: require('../../assets/sounds/speed_limit.mp3'),
    voiceCommand: require('../../assets/sounds/voice_command.mp3')
  };
  
  private readonly sounds: Record<string, SoundAsset> = {
    alert: { path: 'alert.mp3', sound: null, loaded: false, errorCount: 0 },
    turn: { path: 'turn.mp3', sound: null, loaded: false, errorCount: 0 },
    arrive: { path: 'arrive.mp3', sound: null, loaded: false, errorCount: 0 },
    trafficAlert: { path: 'traffic_alert.mp3', sound: null, loaded: false, errorCount: 0 },
    speedLimit: { path: 'speed_limit.mp3', sound: null, loaded: false, errorCount: 0 },
    voiceCommand: { path: 'voice_command.mp3', sound: null, loaded: false, errorCount: 0 }
  };
  
  private isSpeaking: boolean = false;
  private isInitialized: boolean = false;
  private readonly voiceRecognitionState: VoiceRecognitionState = {
    isListening: false,
    results: []
  };
  private voiceCommandCallbacks: VoiceCommandCallbacks = {};
  private batteryLevel: number = 100; // 배터리 레벨 (0-100)
  private recognitionListener: any = null;
  
  // 효과음 초기화 및 로드
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // 미리 효과음 로드
      await this.loadSounds();
      
      // TTS 사용 가능 여부 확인
      const available = await Speech.isSpeakingAsync();
      console.log('TTS 사용 가능 여부:', available);
      
      // 음성 인식 권한 요청 (iOS에서만 필요)
      if (Platform.OS === 'ios') {
        try {
          // 음성 인식에 대한 권한은 expo-av에 포함되어 있음
          await Audio.requestPermissionsAsync();
          console.log('음성 인식 권한 요청 완료');
        } catch (err) {
          console.error('음성 인식 권한 요청 오류:', err);
        }
      }
      
      // 배터리 레벨 모니터링 (여기서는 모의로 구현)
      this.startBatteryMonitoring();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('음성 안내 서비스 초기화 오류:', error);
      throw new Error('음성 안내 서비스 초기화 실패');
    }
  }
  
  // 배터리 모니터링 시작 (실제 구현은 Battery API 사용 필요)
  private startBatteryMonitoring(): void {
    // 실제 구현에서는 expo-battery 같은 라이브러리를 사용하여 구현
    // 여기서는 모의로 배터리 레벨을 설정
    this.batteryLevel = 80; // 예시 값
  }
  
  // 효과음 로드
  private async loadSounds(): Promise<void> {
    const soundKeys = Object.keys(this.sounds);
    
    for (const key of soundKeys) {
      await this.loadSound(key);
    }
  }
  
  // 개별 효과음 로드
  private async loadSound(soundKey: string): Promise<boolean> {
    const soundAsset = this.sounds[soundKey];
    if (!soundAsset) {
      return false;
    }
    
    // 이미 로드된 경우 또는 에러 횟수가 3회 이상인 경우 건너뜀
    if (soundAsset.loaded || soundAsset.errorCount >= 3) {
      return soundAsset.loaded;
    }
    
    try {
      // 배터리 최적화 모드가 활성화되고 배터리 잔량이 낮은 경우 효과음 최적화
      if (this.options.batteryOptimization && this.batteryLevel < 20 && 
          soundKey !== 'alert' && soundKey !== 'turn') {
        console.log(`배터리 최적화: ${soundKey} 효과음 건너뜀`);
        return false;
      }
      
      // 효과음 로드
      const { sound } = await Audio.Sound.createAsync(this.soundPaths[soundKey]);
      
      soundAsset.sound = sound;
      soundAsset.loaded = true;
      
      return true;
    } catch (error) {
      console.error(`효과음 로드 오류 (${soundKey}):`, error);
      if (soundAsset) {
        soundAsset.errorCount++;
      }
      return false;
    }
  }
  
  // 음성 안내 재생
  async speak(text: string, soundType?: string): Promise<void> {
    try {
      if (this.options.muteGuidance) {
        return;
      }
      
      // 이미 재생 중인 경우 중지
      if (this.isSpeaking) {
        await this.stop();
      }
      
      // 음성 품질 향상 설정이 활성화된 경우
      if (this.options.enhancedVoiceQuality) {
        // 더 자연스러운 음성을 위한 설정 조정
        this.adjustVoiceQuality();
      }
      
      // 배터리 최적화 모드
      if (this.options.batteryOptimization && this.batteryLevel < 15) {
        // 중요한 안내만 재생 (예: 회전 안내, 도착 안내 등)
        const isImportant = this.isImportantGuidance(text, soundType);
        if (!isImportant) {
          console.log('배터리 최적화: 중요하지 않은 안내 건너뜀');
          return;
        }
      }
      
      // 효과음 재생
      if (this.options.useSound && soundType && this.sounds[soundType]) {
        try {
          const soundAsset = this.sounds[soundType];
          if (soundAsset) {
            // 효과음이 로드되지 않았다면 로드 시도
            if (!soundAsset.loaded) {
              await this.loadSound(soundType);
            }
            
            // 로드된 효과음이 있으면 재생
            if (soundAsset.loaded && soundAsset.sound) {
              await soundAsset.sound.replayAsync();
            }
          }
        } catch (soundError) {
          console.error(`효과음 재생 오류 (${soundType}):`, soundError);
          // 효과음 재생 실패해도 TTS는 계속 진행
        }
      }
      
      // 개인화된 안내 기능이 활성화된 경우 텍스트 조정
      if (this.options.personalizedGuidance) {
        text = this.getPersonalizedMessage(text);
      }
      
      // TTS 음성 안내 재생 시도
      try {
        this.isSpeaking = true;
        
        await Speech.speak(text, {
          language: this.options.language,
          pitch: this.options.enhancedVoiceQuality ? 1.1 : this.options.pitch, // 음성 품질 향상 적용
          rate: this.options.enhancedVoiceQuality ? 0.95 : this.options.rate,  // 음성 품질 향상 적용
          volume: this.options.volume,
          onDone: () => {
            this.isSpeaking = false;
          },
          onError: (error: any) => {
            console.error('음성 안내 재생 오류:', error);
            this.isSpeaking = false;
          }
        });
      } catch (ttsError) {
        console.error('TTS 음성 안내 재생 오류:', ttsError);
        this.isSpeaking = false;
      }
    } catch (error) {
      console.error('음성 안내 재생 중 오류:', error);
      this.isSpeaking = false;
    }
  }
  
  // 중요한 안내인지 확인 (배터리 최적화용)
  private isImportantGuidance(text: string, soundType?: string): boolean {
    // 특정 키워드가 포함된 안내나 중요 효과음만 재생
    const importantKeywords = ['회전', '도착', '좌회전', '우회전', '유턴', '출구'];
    const importantSounds = ['turn', 'arrive', 'alert'];
    
    const hasKeyword = importantKeywords.some(keyword => text.includes(keyword));
    const isImportantSound = soundType ? importantSounds.includes(soundType) : false;
    
    return hasKeyword || isImportantSound;
  }
  
  // 개인화된 안내 메시지 생성
  private getPersonalizedMessage(originalMessage: string): string {
    // 운전 스타일에 따른 메시지 조정
    switch (this.options.drivingStyle) {
      case 'cautious': {
        // 더 자세하고 충분한 시간을 주는 안내
        if (originalMessage.includes('회전')) {
          return originalMessage.replace('회전하세요', '천천히 안전하게 회전하세요');
        }
        // 더 일찍 안내 시작
        if (originalMessage.includes('미터 앞에서')) {
          return originalMessage.replace('미터 앞에서', '미터 전방에서 준비하시고');
        }
        return originalMessage;
      }
        
      case 'sporty': {
        // 간결하고 핵심적인 안내
        return originalMessage
          .replace('앞에서 우회전하세요', '우회전')
          .replace('앞에서 좌회전하세요', '좌회전')
          .replace('미터 직진하세요', '직진');
      }
        
      default:
        return originalMessage;
    }
  }
  
  // 음성 품질 조정
  private adjustVoiceQuality(): void {
    // 실제 구현에서는 고품질 음성 합성 설정 적용
    // pitch와 rate 조정은 이미 speak 메서드에서 처리함
  }
  
  // 현재 음성 안내 중지
  async stop(): Promise<void> {
    try {
      // TTS 중지
      try {
        await Speech.stop();
      } catch (e) {
        console.error('TTS 중지 오류:', e);
      }
      
      this.isSpeaking = false;
      
      // 효과음 중지
      for (const soundKey of Object.keys(this.sounds)) {
        try {
          const soundAsset = this.sounds[soundKey];
          if (soundAsset && soundAsset.loaded && soundAsset.sound) {
            await soundAsset.sound.stopAsync();
          }
        } catch (e) {
          // 이미 중지된 경우는 에러 처리하지 않음
          console.log(`효과음 중지 무시: ${soundKey}`);
        }
      }
    } catch (error) {
      console.error('음성 안내 중지 오류:', error);
    }
  }
  
  // 음성 인식 시작 (SpeechRecognition API 대신 임시 구현)
  async startVoiceRecognition(callbacks: VoiceCommandCallbacks): Promise<boolean> {
    if (this.voiceRecognitionState.isListening) {
      console.log('이미 음성 인식 중입니다');
      return false;
    }
    try {
      // 음성 명령 콜백 등록
      this.voiceCommandCallbacks = callbacks;
      // 음성 인식 시작 알림음 재생
      if (this.options.useSound) {
        try {
          const voiceCommandSound = this.sounds['voiceCommand'];
          if (voiceCommandSound && voiceCommandSound.loaded && voiceCommandSound.sound) {
            await voiceCommandSound.sound.replayAsync();
          }
        } catch (e) {
          console.error('음성 인식 알림음 재생 오류:', e);
        }
      }
      // 음성 인식 시작
      this.voiceRecognitionState.isListening = true;
      this.voiceRecognitionState.results = [];
      
      // 현재 expo에서 직접적인 SpeechRecognition API가 없으므로, 외부 라이브러리를 사용하거나
      // 별도의 설정이 필요함 (추후 구현)
      
      console.log('음성 인식 시작 (현재는 임시 구현)');
      // 임시 구현: 5초 후에 자동으로 음성 인식 종료
      setTimeout(() => {
        this.stopVoiceRecognition();
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('음성 인식 시작 오류:', error);
      this.voiceRecognitionState.error = '음성 인식 시작 오류';
      this.voiceRecognitionState.isListening = false;
      return false;
    }
  }
  
  // 음성 인식 중지
  async stopVoiceRecognition(): Promise<void> {
    if (!this.voiceRecognitionState.isListening) {
      return;
    }
    try {
      if (this.recognitionListener) {
        // 리스너가 있는 경우 정리
        this.recognitionListener = null;
      }
      this.voiceRecognitionState.isListening = false;
    } catch (error) {
      console.error('음성 인식 중지 오류:', error);
    }
  }
  
  // 음성 명령 처리
  private processVoiceCommand(command: string): void {
    if (!command) {
      return;
    }
    const lowerCommand = command.toLowerCase();
    // 내비게이션 명령
    if (lowerCommand.includes('목적지') || lowerCommand.includes('가자') || 
        lowerCommand.includes('안내') || lowerCommand.includes('경로')) {
      // 목적지 설정 명령
      if (this.voiceCommandCallbacks.onNavigationCommand) {
        this.voiceCommandCallbacks.onNavigationCommand('navigate', { destination: this.extractDestination(command) });
      }
    }
    // 음량 조절 명령
    else if (lowerCommand.includes('음량') || lowerCommand.includes('볼륨')) {
      if (lowerCommand.includes('올려') || lowerCommand.includes('키워') || lowerCommand.includes('높여')) {
        if (this.voiceCommandCallbacks.onVolumeCommand) {
          this.voiceCommandCallbacks.onVolumeCommand('up');
        }
      } else if (lowerCommand.includes('내려') || lowerCommand.includes('줄여') || lowerCommand.includes('낮춰')) {
        if (this.voiceCommandCallbacks.onVolumeCommand) {
          this.voiceCommandCallbacks.onVolumeCommand('down');
        }
      } else if (lowerCommand.includes('음소거') || lowerCommand.includes('꺼')) {
        if (this.voiceCommandCallbacks.onVolumeCommand) {
          this.voiceCommandCallbacks.onVolumeCommand('mute');
        }
      }
    }
    // 검색 명령
    else if (lowerCommand.includes('검색') || lowerCommand.includes('찾아')) {
      if (this.voiceCommandCallbacks.onSearchCommand) {
        this.voiceCommandCallbacks.onSearchCommand(this.extractSearchQuery(command));
      }
    }
    // 시스템 명령
    else if (lowerCommand.includes('도움말') || lowerCommand.includes('도움')) {
      if (this.voiceCommandCallbacks.onSystemCommand) {
        this.voiceCommandCallbacks.onSystemCommand('help');
      }
    }
    else if (lowerCommand.includes('취소') || lowerCommand.includes('중지') || lowerCommand.includes('종료')) {
      if (this.voiceCommandCallbacks.onSystemCommand) {
        this.voiceCommandCallbacks.onSystemCommand('cancel');
      }
    }
  }
  
  // 명령에서 목적지 추출 (간소화된 버전)
  private extractDestination(command: string): string {
    // 기존의 정규표현식 로직을 간소화
    // 일반적인 키워드 이후의 텍스트를 가져옴
    const keywords = ['목적지', '가자', '안내해', '경로', '설정'];
    for (const keyword of keywords) {
      const keywordIndex = command.indexOf(keyword);
      if (keywordIndex !== -1) {
        const destination = command.substring(0, keywordIndex).trim();
        if (destination) {
          return destination;
        }
      }
    }
    return command; // 목적지를 특정할 수 없는 경우 전체 명령 반환
  }
  
  // 명령에서 검색어 추출
  private extractSearchQuery(command: string): string {
    const searchKeywords = ['검색', '찾아'];
    for (const keyword of searchKeywords) {
      const keywordIndex = command.indexOf(keyword);
      if (keywordIndex !== -1) {
        // '검색' 또는 '찾아' 이전 텍스트가 검색어
        const searchQuery = command.substring(0, keywordIndex).trim();
        if (searchQuery) {
          return searchQuery;
        }
      }
    }
    return command.replace(/검색|찾아/g, '').trim();
  }
  
  // 옵션 설정
  setOptions(options: Partial<VoiceOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  // 옵션 가져오기
  getOptions(): VoiceOptions {
    return { ...this.options };
  }
  
  // 음소거 토글
  toggleMute(): boolean {
    this.options.muteGuidance = !this.options.muteGuidance;
    
    // 음소거 활성화 시 진행 중인 안내 중지
    if (this.options.muteGuidance && this.isSpeaking) {
      this.stop().catch(e => console.error('음소거 토글 중 중지 오류:', e));
    }
    
    return this.options.muteGuidance;
  }
  
  // 경로 단계에 따른 음성 안내 메시지 생성 및 재생
  async playRouteGuidance(step: RouteStep): Promise<void> {
    if (!step) {
      console.error('유효하지 않은 경로 단계 정보');
      return;
    }
    
    let guidanceText = '';
    let soundType = '';
    
    switch (step.maneuver) {
      case 'depart': {
        guidanceText = '경로 안내를 시작합니다. ' + 
                       (step.instruction || '출발지에서 출발하세요.');
        soundType = 'alert';
        break;
      }
      
      case 'turn-right': {
        guidanceText = (step.distance < 100 ? 
                      '잠시 후 ' : 
                      `${Math.round(step.distance)}미터 앞에서 `) + 
                      '우회전하세요.';
        soundType = 'turn';
        break;
      }
      
      case 'turn-left': {
        guidanceText = (step.distance < 100 ? 
                      '잠시 후 ' : 
                      `${Math.round(step.distance)}미터 앞에서 `) + 
                      '좌회전하세요.';
        soundType = 'turn';
        break;
      }
      
      case 'straight': {
        guidanceText = `${Math.round(step.distance)}미터 직진하세요.`;
        break;
      }
      
      case 'arrive': {
        guidanceText = '목적지에 도착했습니다.';
        soundType = 'arrive';
        break;
      }
      
      default: {
        guidanceText = step.instruction || `${Math.round(step.distance)}미터 이동하세요.`;
      }
    }
    
    await this.speak(guidanceText, soundType);
  }
  
  // 알림 메시지 재생
  async playNotification(message: string): Promise<void> {
    await this.speak(message, 'alert');
  }
  
  // 교통 상황 알림 재생
  async playTrafficAlert(message: string): Promise<void> {
    await this.speak(message, 'trafficAlert');
  }
  
  // 속도 제한 알림 재생
  async playSpeedLimitAlert(message: string): Promise<void> {
    await this.speak(message, 'speedLimit');
  }
  
  // 서비스 리소스 정리
  async cleanup(): Promise<void> {
    try {
      // 음성 인식 중지
      await this.stopVoiceRecognition();
      
      // 재생 중인 모든 효과음 및 TTS 중지
      await this.stop();
      
      // 모든 효과음 언로드
      for (const soundKey of Object.keys(this.sounds)) {
        try {
          const soundAsset = this.sounds[soundKey];
          if (soundAsset && soundAsset.loaded && soundAsset.sound) {
            await soundAsset.sound.unloadAsync();
            soundAsset.loaded = false;
            soundAsset.sound = null;
          }
        } catch (e) {
          console.error(`효과음 정리 오류 (${soundKey}):`, e);
        }
      }
      
      this.isInitialized = false;
    } catch (error) {
      console.error('음성 안내 서비스 정리 오류:', error);
    }
  }
  
  // 싱글톤 인스턴스
  private static instance: VoiceGuidanceService;
  
  public static getInstance(): VoiceGuidanceService {
    if (!VoiceGuidanceService.instance) {
      VoiceGuidanceService.instance = new VoiceGuidanceService();
    }
    return VoiceGuidanceService.instance;
  }
}

// Export the class and the instance separately to preserve typing
export { VoiceGuidanceService };
const voiceGuidanceServiceInstance = VoiceGuidanceService.getInstance();
export default voiceGuidanceServiceInstance;