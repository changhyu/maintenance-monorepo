// 앱 테마 정의
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    error: string;
    text: string;
    subtext: string;
    border: string;
    statusBar: string;
    card: string;
    tab: string;
    tabActive: string;
    notification: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    }
  };
  opacity: {
    disabled: number;
    overlay: number;
  };
}

// 라이트 테마 (기본)
export const lightTheme: Theme = {
  colors: {
    primary: '#3498db',
    secondary: '#2ecc71',
    background: '#ffffff',
    surface: '#f8f8f8',
    error: '#e74c3c',
    text: '#2c3e50',
    subtext: '#7f8c8d',
    border: '#dfe6e9',
    statusBar: '#2980b9',
    card: '#ffffff',
    tab: '#2c3e50',
    tabActive: '#3498db',
    notification: '#e74c3c',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
  typography: {
    fontFamily: 'System',
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    }
  },
  opacity: {
    disabled: 0.5,
    overlay: 0.7,
  },
};

// 다크 테마
export const darkTheme: Theme = {
  colors: {
    primary: '#3498db',
    secondary: '#2ecc71',
    background: '#1a1a1a',
    surface: '#2c2c2c',
    error: '#e74c3c',
    text: '#ecf0f1',
    subtext: '#bdc3c7',
    border: '#34495e',
    statusBar: '#2c3e50',
    card: '#2c2c2c',
    tab: '#ecf0f1',
    tabActive: '#3498db',
    notification: '#e74c3c',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  typography: lightTheme.typography,
  opacity: lightTheme.opacity,
};

// 고대비 테마
export const highContrastTheme: Theme = {
  colors: {
    primary: '#ffff00',
    secondary: '#00ff00',
    background: '#000000',
    surface: '#121212',
    error: '#ff0000',
    text: '#ffffff',
    subtext: '#dddddd',
    border: '#ffffff',
    statusBar: '#000000',
    card: '#121212',
    tab: '#ffffff',
    tabActive: '#ffff00',
    notification: '#ff0000',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  typography: lightTheme.typography,
  opacity: {
    ...lightTheme.opacity,
    disabled: 0.75, // 고대비 모드에서는 더 높은 투명도
  },
};

// 테마 데이터 객체
const themes = { lightTheme, darkTheme, highContrastTheme };

// 기본 내보내기로는 themes를 내보내고
export default themes;