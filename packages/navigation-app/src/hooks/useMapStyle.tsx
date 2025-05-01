import { useState, useEffect, useRef, useCallback } from 'react';
import { MapStyleService, MapStyleOptions, MapTheme } from '../services/MapStyleService';
import { useColorScheme } from 'react-native';

/**
 * 맵 스타일 및 테마를 관리하는 React Hook
 */
export function useMapStyle() {
  const mapStyleServiceRef = useRef<MapStyleService>(new MapStyleService());
  const [styleOptions, setStyleOptions] = useState<MapStyleOptions>(
    mapStyleServiceRef.current.getOptions()
  );
  
  // 시스템 테마 감지
  const colorScheme = useColorScheme();
  
  // 시스템 테마에 맞게 자동 설정 (처음 로드할 때만)
  useEffect(() => {
    const service = mapStyleServiceRef.current;
    const currentTheme = service.getOptions().theme;
    
    // 처음 설정할 때만 시스템 테마 적용 (사용자가 수동으로 변경한 경우는 유지)
    if (currentTheme === 'light' || currentTheme === 'dark') {
      const systemTheme = colorScheme === 'dark' ? 'dark' : 'light';
      if (currentTheme !== systemTheme) {
        service.setTheme(systemTheme);
        setStyleOptions(service.getOptions());
      }
    }
  }, [colorScheme]);
  
  /**
   * 맵 테마 변경
   * @param theme 변경할 테마
   */
  const setMapTheme = useCallback((theme: MapTheme) => {
    const service = mapStyleServiceRef.current;
    service.setTheme(theme);
    setStyleOptions(service.getOptions());
  }, []);
  
  /**
   * 맵 스타일 옵션 변경
   * @param options 변경할 옵션
   */
  const updateStyleOptions = useCallback((options: Partial<MapStyleOptions>) => {
    const service = mapStyleServiceRef.current;
    service.setOptions(options);
    setStyleOptions(service.getOptions());
  }, []);
  
  /**
   * 커스텀 스타일 URL 설정
   * @param styleUrl Mapbox 호환 스타일 URL
   */
  const setCustomStyle = useCallback((styleUrl: string) => {
    const service = mapStyleServiceRef.current;
    service.setCustomStyleUrl(styleUrl);
    setStyleOptions(service.getOptions());
  }, []);
  
  /**
   * 하이 컨트라스트 모드 토글
   * @param enabled 활성화 여부
   */
  const toggleHighContrast = useCallback((enabled: boolean) => {
    const service = mapStyleServiceRef.current;
    service.toggleHighContrastMode(enabled);
    setStyleOptions(service.getOptions());
  }, []);
  
  /**
   * 현재 테마에 맞는 색상 팔레트 가져오기
   */
  const getColorPalette = useCallback(() => {
    return mapStyleServiceRef.current.getColorPalette();
  }, []);
  
  /**
   * Mapbox용 스타일 URL 가져오기
   */
  const getStyleUrl = useCallback(() => {
    return mapStyleServiceRef.current.getMapboxStyleURL();
  }, []);
  
  /**
   * Google Maps용 스타일 객체 가져오기
   */
  const getGoogleMapStyle = useCallback(() => {
    return mapStyleServiceRef.current.getGoogleMapStyle();
  }, []);
  
  /**
   * 레이어 설정 가져오기
   */
  const getLayerConfig = useCallback(() => {
    return mapStyleServiceRef.current.getLayerConfig();
  }, []);
  
  /**
   * 다크 모드 활성화 여부
   */
  const isDarkMode = styleOptions.theme === 'dark';
  
  return {
    styleOptions,
    isDarkMode,
    setMapTheme,
    updateStyleOptions,
    setCustomStyle,
    toggleHighContrast,
    getColorPalette,
    getStyleUrl,
    getGoogleMapStyle,
    getLayerConfig
  };
}