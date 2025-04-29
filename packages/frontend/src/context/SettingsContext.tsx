import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// 설정 상태 타입
interface SettingsState {
  // 레이아웃 설정
  sidebarCollapsed: boolean;
  contentDensity: 'comfortable' | 'compact' | 'default';
  
  // 표시 설정
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: 'thousand_dot' | 'thousand_comma';
  
  // 알림 설정
  enableNotifications: boolean;
  enableSoundEffects: boolean;
  
  // 성능 설정
  enableAnimations: boolean;
  enableBackgroundSync: boolean;
  
  // 접근성 설정
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reduceMotion: boolean;
}

// 액션 타입
type SettingsAction = 
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_CONTENT_DENSITY', payload: 'comfortable' | 'compact' | 'default' }
  | { type: 'SET_DATE_FORMAT', payload: string }
  | { type: 'SET_TIME_FORMAT', payload: '12h' | '24h' }
  | { type: 'SET_NUMBER_FORMAT', payload: 'thousand_dot' | 'thousand_comma' }
  | { type: 'TOGGLE_NOTIFICATIONS' }
  | { type: 'TOGGLE_SOUND_EFFECTS' }
  | { type: 'TOGGLE_ANIMATIONS' }
  | { type: 'TOGGLE_BACKGROUND_SYNC' }
  | { type: 'SET_FONT_SIZE', payload: 'small' | 'medium' | 'large' }
  | { type: 'TOGGLE_HIGH_CONTRAST' }
  | { type: 'TOGGLE_REDUCE_MOTION' }
  | { type: 'RESET_SETTINGS' }
  | { type: 'IMPORT_SETTINGS', payload: Partial<SettingsState> };

// 로컬 스토리지 키
const SETTINGS_STORAGE_KEY = 'app_settings';

// 초기 상태
const defaultSettings: SettingsState = {
  sidebarCollapsed: false,
  contentDensity: 'default',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  numberFormat: 'thousand_comma',
  enableNotifications: true,
  enableSoundEffects: true,
  enableAnimations: true,
  enableBackgroundSync: true,
  fontSize: 'medium',
  highContrast: false,
  reduceMotion: false,
};

// 로컬 스토리지에서 설정 불러오기
const loadSettings = (): SettingsState => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      return { ...defaultSettings, ...JSON.parse(storedSettings) };
    }
  } catch (error) {
    console.error('설정을 불러오는 중 오류 발생:', error);
  }
  return defaultSettings;
};

// 리듀서 함수
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  let newState: SettingsState;
  
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      newState = { ...state, sidebarCollapsed: !state.sidebarCollapsed };
      break;
      
    case 'SET_CONTENT_DENSITY':
      newState = { ...state, contentDensity: action.payload };
      break;
      
    case 'SET_DATE_FORMAT':
      newState = { ...state, dateFormat: action.payload };
      break;
      
    case 'SET_TIME_FORMAT':
      newState = { ...state, timeFormat: action.payload };
      break;
      
    case 'SET_NUMBER_FORMAT':
      newState = { ...state, numberFormat: action.payload };
      break;
      
    case 'TOGGLE_NOTIFICATIONS':
      newState = { ...state, enableNotifications: !state.enableNotifications };
      break;
      
    case 'TOGGLE_SOUND_EFFECTS':
      newState = { ...state, enableSoundEffects: !state.enableSoundEffects };
      break;
      
    case 'TOGGLE_ANIMATIONS':
      newState = { ...state, enableAnimations: !state.enableAnimations };
      break;
      
    case 'TOGGLE_BACKGROUND_SYNC':
      newState = { ...state, enableBackgroundSync: !state.enableBackgroundSync };
      break;
      
    case 'SET_FONT_SIZE':
      newState = { ...state, fontSize: action.payload };
      break;
      
    case 'TOGGLE_HIGH_CONTRAST':
      newState = { ...state, highContrast: !state.highContrast };
      break;
      
    case 'TOGGLE_REDUCE_MOTION':
      newState = { ...state, reduceMotion: !state.reduceMotion };
      break;
      
    case 'RESET_SETTINGS':
      newState = { ...defaultSettings };
      break;
      
    case 'IMPORT_SETTINGS':
      newState = { ...state, ...action.payload };
      break;
      
    default:
      return state;
  }
  
  // 설정 저장
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newState));
  return newState;
}

// Context 생성
interface SettingsContextType {
  settings: SettingsState;
  toggleSidebar: () => void;
  setContentDensity: (density: 'comfortable' | 'compact' | 'default') => void;
  setDateFormat: (format: string) => void;
  setTimeFormat: (format: '12h' | '24h') => void;
  setNumberFormat: (format: 'thousand_dot' | 'thousand_comma') => void;
  toggleNotifications: () => void;
  toggleSoundEffects: () => void;
  toggleAnimations: () => void;
  toggleBackgroundSync: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  resetSettings: () => void;
  importSettings: (settings: Partial<SettingsState>) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  toggleSidebar: () => {},
  setContentDensity: () => {},
  setDateFormat: () => {},
  setTimeFormat: () => {},
  setNumberFormat: () => {},
  toggleNotifications: () => {},
  toggleSoundEffects: () => {},
  toggleAnimations: () => {},
  toggleBackgroundSync: () => {},
  setFontSize: () => {},
  toggleHighContrast: () => {},
  toggleReduceMotion: () => {},
  resetSettings: () => {},
  importSettings: () => {},
});

// Provider 컴포넌트
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, dispatch] = useReducer(settingsReducer, loadSettings());
  
  // 접근성 설정 적용
  useEffect(() => {
    // 글꼴 크기 설정
    const fontSizeClass = `font-size-${settings.fontSize}`;
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(fontSizeClass);
    
    // 고대비 설정
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // 모션 감소 설정
    if (settings.reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.fontSize, settings.highContrast, settings.reduceMotion]);
  
  // 액션 핸들러
  const toggleSidebar = () => dispatch({ type: 'TOGGLE_SIDEBAR' });
  
  const setContentDensity = (density: 'comfortable' | 'compact' | 'default') => 
    dispatch({ type: 'SET_CONTENT_DENSITY', payload: density });
  
  const setDateFormat = (format: string) => 
    dispatch({ type: 'SET_DATE_FORMAT', payload: format });
  
  const setTimeFormat = (format: '12h' | '24h') => 
    dispatch({ type: 'SET_TIME_FORMAT', payload: format });
  
  const setNumberFormat = (format: 'thousand_dot' | 'thousand_comma') => 
    dispatch({ type: 'SET_NUMBER_FORMAT', payload: format });
  
  const toggleNotifications = () => dispatch({ type: 'TOGGLE_NOTIFICATIONS' });
  
  const toggleSoundEffects = () => dispatch({ type: 'TOGGLE_SOUND_EFFECTS' });
  
  const toggleAnimations = () => dispatch({ type: 'TOGGLE_ANIMATIONS' });
  
  const toggleBackgroundSync = () => dispatch({ type: 'TOGGLE_BACKGROUND_SYNC' });
  
  const setFontSize = (size: 'small' | 'medium' | 'large') => 
    dispatch({ type: 'SET_FONT_SIZE', payload: size });
  
  const toggleHighContrast = () => dispatch({ type: 'TOGGLE_HIGH_CONTRAST' });
  
  const toggleReduceMotion = () => dispatch({ type: 'TOGGLE_REDUCE_MOTION' });
  
  const resetSettings = () => dispatch({ type: 'RESET_SETTINGS' });
  
  const importSettings = (newSettings: Partial<SettingsState>) => 
    dispatch({ type: 'IMPORT_SETTINGS', payload: newSettings });
  
  return (
    <SettingsContext.Provider
      value={{
        settings,
        toggleSidebar,
        setContentDensity,
        setDateFormat,
        setTimeFormat,
        setNumberFormat,
        toggleNotifications,
        toggleSoundEffects,
        toggleAnimations,
        toggleBackgroundSync,
        setFontSize,
        toggleHighContrast,
        toggleReduceMotion,
        resetSettings,
        importSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// 커스텀 훅
export function useSettings() {
  return useContext(SettingsContext);
}

// 특정 설정을 위한 커스텀 훅들
export function useLayoutSettings() {
  const { settings, toggleSidebar, setContentDensity } = useSettings();
  return { 
    sidebarCollapsed: settings.sidebarCollapsed,
    contentDensity: settings.contentDensity,
    toggleSidebar,
    setContentDensity
  };
}

export function useDateTimeSettings() {
  const { settings, setDateFormat, setTimeFormat } = useSettings();
  return {
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    setDateFormat,
    setTimeFormat
  };
}

export function useAccessibilitySettings() {
  const { settings, setFontSize, toggleHighContrast, toggleReduceMotion } = useSettings();
  return {
    fontSize: settings.fontSize,
    highContrast: settings.highContrast,
    reduceMotion: settings.reduceMotion,
    setFontSize,
    toggleHighContrast,
    toggleReduceMotion
  };
}