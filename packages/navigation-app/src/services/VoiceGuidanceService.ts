import { RouteStep } from '../types';

// 음성 안내 옵션 인터페이스 추가
export interface VoiceGuidanceOptions {
  enabled: boolean;
  volume: number;
  useNativeVoices: boolean;
  language: string;
  speed: number;
  soundEffectsEnabled: boolean;
}

// TTS(Text-to-Speech) 모방 서비스
export class VoiceGuidanceService {
  private readonly utteranceQueue: string[] = [];
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 1.0;
  private rate: number = 1.0;
  private language: string = 'ko-KR';
  private audioContext: AudioContext | null = null;
  private readonly voiceSynthAvailable: boolean;
  private options: VoiceGuidanceOptions = {
    enabled: true,
    volume: 1.0,
    useNativeVoices: true,
    language: 'ko-KR',
    speed: 1.0,
    soundEffectsEnabled: true,
  };

  constructor() {
    // 생성자에서는 동기 작업만 수행
    this.voiceSynthAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // 서비스 초기화 - 생성자에서 분리된 비동기 메서드
  public async initialize(): Promise<void> {
    try {
      // Web Audio API 초기화
      if (typeof window !== 'undefined') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    } catch (error) {
      console.error('Web Audio API를 초기화하는 중 오류가 발생했습니다:', error);
    }
    // 음성 인터페이스 초기화 로그
    console.log('음성 안내 서비스가 초기화되었습니다. TTS 가능 여부:', this.voiceSynthAvailable);
  }

  // 옵션 업데이트
  public updateOptions(newOptions: Partial<VoiceGuidanceOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // 옵션에 따른 설정 반영
    this.setMuted(!this.options.enabled);
    this.setVolume(this.options.volume);
    this.setRate(this.options.speed);
    this.setLanguage(this.options.language);
  }

  // 음성 안내 재생
  public speak(text: string): Promise<boolean> {
    if (this.isMuted || !this.options.enabled) {
      console.log('음성 안내가 음소거 상태입니다:', text);
      return Promise.resolve(false);
    }
    this.utteranceQueue.push(text);
    // 현재 재생 중이 아니면 재생 시작
    if (!this.isPlaying) {
      return this.playNext().then(() => true);
    }
    return Promise.resolve(true);
  }

  // 큐에서 다음 안내 재생
  private playNext(): Promise<void> {
    if (this.utteranceQueue.length === 0) {
      this.isPlaying = false;
      return Promise.resolve();
    }
    this.isPlaying = true;
    const text = this.utteranceQueue.shift() || '';
    if (this.voiceSynthAvailable && this.options.useNativeVoices) {
      return this.playSpeechSynthesis(text);
    } else {
      // 음성 합성을 사용할 수 없는 경우, 콘솔에 출력만 하고 완료로 처리
      console.log('TTS 메시지 (에뮬레이션):', text);
      return new Promise((resolve) => {
        // 음성 메시지 재생 시간 시뮬레이션 (텍스트 길이에 비례)
        const delay = Math.min(Math.max(1000, text.length * 80), 5000);
        setTimeout(() => {
          resolve();
          this.playNext();
        }, delay);
      });
    }
  }

  // 실제 음성 합성 API 사용 재생
  private playSpeechSynthesis(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        this.playNext();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.rate = this.rate;
      utterance.lang = this.language;
      utterance.onend = () => {
        resolve();
        this.playNext();
      };
      utterance.onerror = (event) => {
        console.error('음성 합성 오류:', event);
        resolve();
        this.playNext();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  // 음소거 설정
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.isPlaying && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isPlaying = false;
      this.utteranceQueue.length = 0; // 큐 비우기
    }
  }

  // 볼륨 설정
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // 속도 설정
  public setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(2, rate));
  }

  // 언어 설정
  public setLanguage(language: string): void {
    this.language = language;
  }

  // 대기 중인 모든 안내 취소
  public cancelAll(): void {
    if (this.voiceSynthAvailable && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.utteranceQueue.length = 0;
    this.isPlaying = false;
  }

  // 현재 재생 중 여부
  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // 경로 안내
  public announceStep(step: RouteStep): Promise<boolean> {
    const message = getVoiceGuidanceMessage(step);
    return this.speak(message);
  }

  // 경고 안내
  public announceAlert(message: string): Promise<boolean> {
    return this.speak(message);
  }

  // 재생 중지
  public stopSpeaking(): void {
    this.cancelAll();
  }

  // 리소스 정리
  public async dispose(): Promise<void> {
    this.cancelAll();
    if (this.audioContext) {
      try {
        await this.audioContext.close();
        this.audioContext = null;
      } catch (error) {
        console.error('오디오 컨텍스트 정리 오류:', error);
        this.audioContext = null;
      }
    }
  }
}

// 경로 단계에 따른 음성 안내 생성
export const getVoiceGuidanceMessage = (step: RouteStep): string => {
  // 거리 형식화 (1km 이상이면 킬로미터로 표시)
  const formattedDistance = step.distance < 1000 
    ? `${Math.round(step.distance)}미터` 
    : `${(step.distance / 1000).toFixed(1)}킬로미터`;
    
  switch (step.maneuver) {
    case 'depart':
      return `안내를 시작합니다. ${step.roadName}에서 출발합니다.`;
    case 'arrive':
      return '목적지에 도착했습니다.';
    case 'straight':
      return `${formattedDistance} 직진하세요.`;
    case 'turn-right':
      return `${formattedDistance} 앞에서 우회전하세요.`;
    case 'turn-left':
      return `${formattedDistance} 앞에서 좌회전하세요.`;
    case 'slight-right':
      return `${formattedDistance} 앞에서 우측으로 이동하세요.`;
    case 'slight-left':
      return `${formattedDistance} 앞에서 좌측으로 이동하세요.`;
    case 'u-turn':
      return `${formattedDistance} 앞에서 유턴하세요.`;
    case 'merge':
      return `${formattedDistance} 앞에서 ${step.roadName}로 합류하세요.`;
    case 'exit':
      return `${formattedDistance} 앞에서 ${step.roadName}으로 나가세요.`;
    default:
      return `${formattedDistance} 이동하세요.`;
  }
};

// 안내 거리에 따른 음성 메시지 생성
export const getDistanceBasedGuidance = (
  remainingDistance: number,
  step: RouteStep
): string | null => {
  if (step.maneuver === 'depart' || step.maneuver === 'arrive') {
    return null; // 출발/도착은 이미 별도 안내
  }

  // 다음 단계까지 거리에 따른 안내
  if (remainingDistance <= 30) {
    switch (step.maneuver) {
      case 'turn-right':
        return '곧 우회전하세요.';
      case 'turn-left':
        return '곧 좌회전하세요.';
      case 'slight-right':
        return '곧 우측으로 이동하세요.';
      case 'slight-left':
        return '곧 좌측으로 이동하세요.';
      case 'u-turn':
        return '곧 유턴하세요.';
      case 'merge':
        return `곧 ${step.roadName}로 합류합니다.`;
      case 'exit':
        return `곧 ${step.roadName}으로 나갑니다.`;
      default:
        return null;
    }
  } else if (remainingDistance <= 100) {
    return `100미터 앞에서 ${getManeuverText(step.maneuver)}`;
  } else if (remainingDistance <= 500) {
    return `500미터 앞에서 ${getManeuverText(step.maneuver)}`;
  } else if (remainingDistance <= 1000) {
    return `1킬로미터 앞에서 ${getManeuverText(step.maneuver)}`;
  }

  return null;
};

// 조작 타입에 따른 텍스트 변환
const getManeuverText = (maneuver: RouteStep['maneuver']): string => {
  switch (maneuver) {
    case 'turn-right':
      return '우회전하세요.';
    case 'turn-left':
      return '좌회전하세요.';
    case 'slight-right':
      return '우측으로 이동하세요.';
    case 'slight-left':
      return '좌측으로 이동하세요.';
    case 'u-turn':
      return '유턴하세요.';
    case 'merge':
      return '합류하세요.';
    case 'exit':
      return '출구로 나가세요.';
    default:
      return '다음 안내를 따르세요.';
  }
};

// 내비게이션 종료 메시지
export const getNavigationEndMessage = (): string => {
  return '경로 안내를 종료합니다.';
};

// 오프라인 모드 메시지
export const getOfflineModeMessage = (): string => {
  return '오프라인 모드입니다. 저장된 지도와 경로만 사용할 수 있습니다.';
};

// 싱글톤 인스턴스 생성
const voiceGuidanceInstance = new VoiceGuidanceService();

// 초기화를 비동기적으로 실행 (인스턴스를 내보내기 전에 초기화 실행)
voiceGuidanceInstance.initialize().catch(err => {
  console.error('음성 안내 서비스 초기화 실패:', err);
});

export default voiceGuidanceInstance;