/**
 * 맵 테마 타입 정의
 */
export type MapTheme = 'light' | 'dark' | 'satellite' | 'terrain' | 'hybrid' | 'custom';

/**
 * 맵 스타일 설정 인터페이스
 */
export interface MapStyleOptions {
  theme: MapTheme;
  customStyleUrl?: string;
  showTraffic: boolean;
  showPOI: boolean;
  show3DBuildings: boolean;
  showLabels: boolean;
  showIndoorMaps: boolean;
  highContrastMode: boolean;
}

/**
 * 맵박스 스타일 URL 상수
 */
export const MapboxStyles = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  navigation: 'mapbox://styles/mapbox/navigation-day-v1',
  navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
};

/**
 * 구글 맵 스타일 상수
 */
export const GoogleMapStyles = {
  light: [
    {
      featureType: 'all',
      elementType: 'all',
      stylers: [{ saturation: 0 }, { lightness: 10 }]
    }
  ],
  dark: [
    {
      featureType: 'all',
      elementType: 'all',
      stylers: [{ hue: '#0000b0' }, { invert_lightness: true }, { saturation: -30 }, { lightness: -70 }]
    }
  ],
  highContrast: [
    {
      featureType: 'all',
      elementType: 'all',
      stylers: [{ saturation: 100 }, { contrast: 150 }, { hue: '#0000ff' }]
    }
  ]
};

/**
 * 맵 스타일 렌더링 설정
 */
export interface MapLayerConfig {
  id: string;
  visible: boolean;
  options?: any;
}

/**
 * 기본 맵 스타일 옵션
 */
export const DEFAULT_MAP_STYLE_OPTIONS: MapStyleOptions = {
  theme: 'light',
  showTraffic: true,
  showPOI: true,
  show3DBuildings: true,
  showLabels: true,
  showIndoorMaps: true,
  highContrastMode: false,
};

/**
 * 맵 스타일 및 테마 관리 서비스
 */
export class MapStyleService {
  private options: MapStyleOptions = { ...DEFAULT_MAP_STYLE_OPTIONS };
  
  /**
   * 맵 스타일 옵션 설정
   * @param options 변경할 스타일 옵션
   * @returns 업데이트된 옵션
   */
  public setOptions(options: Partial<MapStyleOptions>): MapStyleOptions {
    this.options = { ...this.options, ...options };
    return this.options;
  }
  
  /**
   * 현재 맵 스타일 옵션 가져오기
   */
  public getOptions(): MapStyleOptions {
    return { ...this.options };
  }
  
  /**
   * 테마 변경
   * @param theme 설정할 테마
   */
  public setTheme(theme: MapTheme): void {
    this.options.theme = theme;
  }
  
  /**
   * Mapbox용 스타일 URL 가져오기
   */
  public getMapboxStyleURL(): string {
    switch (this.options.theme) {
      case 'light':
        return MapboxStyles.light;
      case 'dark':
        return MapboxStyles.dark;
      case 'satellite':
        return this.options.showLabels ? MapboxStyles.satelliteStreets : MapboxStyles.satellite;
      case 'terrain':
        return MapboxStyles.outdoors;
      case 'hybrid':
        return MapboxStyles.satelliteStreets;
      case 'custom':
        return this.options.customStyleUrl || MapboxStyles.streets;
      default:
        return MapboxStyles.streets;
    }
  }
  
  /**
   * 구글 맵용 스타일 배열 가져오기
   */
  public getGoogleMapStyle(): any[] {
    if (this.options.highContrastMode) {
      return GoogleMapStyles.highContrast;
    }
    
    switch (this.options.theme) {
      case 'light':
        return GoogleMapStyles.light;
      case 'dark':
        return GoogleMapStyles.dark;
      case 'custom':
        return []; // 커스텀 스타일은 별도 처리 필요
      default:
        return [];
    }
  }
  
  /**
   * 레이어 구성 가져오기
   */
  public getLayerConfig(): MapLayerConfig[] {
    return [
      {
        id: 'traffic',
        visible: this.options.showTraffic
      },
      {
        id: 'poi',
        visible: this.options.showPOI
      },
      {
        id: '3d-buildings',
        visible: this.options.show3DBuildings,
        options: {
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-color': this.options.theme === 'dark' ? '#aaa' : '#999',
          'fill-extrusion-opacity': 0.6
        }
      },
      {
        id: 'labels',
        visible: this.options.showLabels
      },
      {
        id: 'indoor',
        visible: this.options.showIndoorMaps
      }
    ];
  }
  
  /**
   * 색상 팔레트 가져오기 (테마에 따라 다른 색상)
   */
  public getColorPalette() {
    if (this.options.theme === 'dark') {
      return {
        primary: '#4dabf7',
        secondary: '#1864ab',
        background: '#212529',
        surface: '#343a40',
        border: '#495057',
        text: '#f8f9fa',
        accent: '#7048e8',
        success: '#37b24d',
        warning: '#f59f00',
        error: '#f03e3e',
        inactive: '#868e96'
      };
    } else {
      return {
        primary: '#1971c2',
        secondary: '#a5d8ff',
        background: '#f8f9fa',
        surface: '#ffffff',
        border: '#dee2e6',
        text: '#212529',
        accent: '#5f3dc4',
        success: '#2b8a3e',
        warning: '#e67700',
        error: '#c92a2a',
        inactive: '#adb5bd'
      };
    }
  }
  
  /**
   * 하이 컨트라스트 모드 토글
   * @param enabled 활성화 여부
   */
  public toggleHighContrastMode(enabled: boolean): void {
    this.options.highContrastMode = enabled;
  }
  
  /**
   * 사용자 정의 스타일 URL 설정
   * @param styleUrl 커스텀 스타일 URL
   */
  public setCustomStyleUrl(styleUrl: string): void {
    this.options.customStyleUrl = styleUrl;
    this.options.theme = 'custom';
  }
}