import { createTheme, Theme, alpha } from '@mui/material';
import { blue, orange, grey, red, green, purple, teal } from '@mui/material/colors';

// 테마 타입 정의
type ThemeMode = 'light' | 'dark';
type ThemeColor = 'blue' | 'purple' | 'teal';

// 커스텀 색상 팔레트 정의
const getCustomColors = (mode: ThemeMode, color: ThemeColor = 'blue') => {
  const colors = {
    blue: {
      light: blue[400],
      main: blue[600],
      dark: blue[800]
    },
    purple: {
      light: purple[400],
      main: purple[600],
      dark: purple[800]
    },
    teal: {
      light: teal[400],
      main: teal[600],
      dark: teal[800]
    }
  };

  return {
    primary: {
      main: mode === 'light' ? colors[color].main : colors[color].light,
      light: mode === 'light' ? colors[color].light : alpha(colors[color].light, 0.9),
      dark: mode === 'light' ? colors[color].dark : colors[color].main,
      contrastText: '#fff'
    },
    secondary: {
      main: mode === 'light' ? orange[500] : orange[400],
      light: mode === 'light' ? orange[300] : orange[200],
      dark: mode === 'light' ? orange[700] : orange[600],
      contrastText: '#fff'
    },
    success: {
      main: mode === 'light' ? green[600] : green[400],
      light: mode === 'light' ? green[400] : green[300],
      dark: mode === 'light' ? green[800] : green[600],
      contrastText: '#fff'
    },
    error: {
      main: mode === 'light' ? red[600] : red[400],
      light: mode === 'light' ? red[400] : red[300],
      dark: mode === 'light' ? red[800] : red[600],
      contrastText: '#fff'
    },
    grey: {
      50: grey[50],
      100: grey[100],
      200: grey[200],
      300: grey[300],
      400: grey[400],
      500: grey[500],
      600: grey[600],
      700: grey[700],
      800: grey[800],
      900: grey[900],
    },
    gradients: {
      primary: `linear-gradient(45deg, ${colors[color].dark} 0%, ${colors[color].main} 100%)`,
      secondary: `linear-gradient(45deg, ${orange[700]} 0%, ${orange[500]} 100%)`,
      success: `linear-gradient(45deg, ${green[800]} 0%, ${green[600]} 100%)`,
      error: `linear-gradient(45deg, ${red[800]} 0%, ${red[600]} 100%)`
    }
  };
};

interface ThemeOptions {
  mode: ThemeMode;
  color: ThemeColor;
  borderRadius?: number;
  fontFamily?: string;
}

const getDesignTokens = (options: ThemeOptions): Theme => {
  const {
    mode,
    color,
    borderRadius = 8,
    fontFamily = '"Inter", "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif'
  } = options;
  
  const colors = getCustomColors(mode, color);

  return createTheme({
    palette: {
      mode,
      ...colors,
      background: {
        default: mode === 'light' ? grey[50] : grey[900],
        paper: mode === 'light' ? '#fff' : grey[800]
      },
      text: {
        primary: mode === 'light' ? grey[900] : grey[100],
        secondary: mode === 'light' ? grey[700] : grey[300]
      },
      action: {
        hover: mode === 'light' ? alpha(colors.primary.main, 0.04) : alpha(colors.primary.main, 0.12),
        selected: mode === 'light' ? alpha(colors.primary.main, 0.08) : alpha(colors.primary.main, 0.16),
        disabled: mode === 'light' ? alpha(grey[900], 0.26) : alpha(grey[100], 0.3),
        disabledBackground: mode === 'light' ? alpha(grey[900], 0.12) : alpha(grey[100], 0.12)
      }
    },
    typography: {
      fontFamily,
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '-0.02em'
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em'
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.4
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
        letterSpacing: '0.00938em'
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
        letterSpacing: '0.00714em'
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
        letterSpacing: '0.02857em'
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.66,
        letterSpacing: '0.03333em'
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 2.66,
        letterSpacing: '0.08333em',
        textTransform: 'uppercase'
      }
    },
    shape: {
      borderRadius
    },
    shadows: [
      'none',
      mode === 'light'
        ? '0px 2px 4px -1px rgba(0,0,0,0.05), 0px 4px 5px 0px rgba(0,0,0,0.03), 0px 1px 10px 0px rgba(0,0,0,0.02)'
        : '0px 2px 4px -1px rgba(0,0,0,0.15), 0px 4px 5px 0px rgba(0,0,0,0.1), 0px 1px 10px 0px rgba(0,0,0,0.06)',
      ...Array(23).fill('none')
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'light' ? '#9e9e9e #f5f5f5' : '#666 #424242',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              backgroundColor: mode === 'light' ? '#f5f5f5' : '#424242',
              width: '8px',
              height: '8px'
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: mode === 'light' ? '#9e9e9e' : '#666',
              border: `2px solid ${mode === 'light' ? '#f5f5f5' : '#424242'}`
            },
            '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
              backgroundColor: mode === 'light' ? '#757575' : '#808080'
            },
            '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
              backgroundColor: mode === 'light' ? '#757575' : '#808080'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius,
            textTransform: 'none',
            fontWeight: 500,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: mode === 'light'
                ? '0px 2px 4px -1px rgba(0,0,0,0.07), 0px 4px 5px 0px rgba(0,0,0,0.05), 0px 1px 10px 0px rgba(0,0,0,0.03)'
                : '0px 2px 4px -1px rgba(0,0,0,0.15), 0px 4px 5px 0px rgba(0,0,0,0.1), 0px 1px 10px 0px rgba(0,0,0,0.06)'
            }
          },
          containedPrimary: {
            background: colors.gradients.primary,
            '&:hover': {
              background: colors.gradients.primary,
              filter: 'brightness(110%)'
            }
          },
          containedSecondary: {
            background: colors.gradients.secondary,
            '&:hover': {
              background: colors.gradients.secondary,
              filter: 'brightness(110%)'
            }
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px'
            }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light'
              ? '0px 2px 4px -1px rgba(0,0,0,0.05), 0px 4px 5px 0px rgba(0,0,0,0.03), 0px 1px 10px 0px rgba(0,0,0,0.02)'
              : '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
            borderRadius: borderRadius * 1.5,
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: mode === 'light'
                ? '0px 4px 8px -2px rgba(0,0,0,0.07), 0px 8px 10px 0px rgba(0,0,0,0.05), 0px 2px 20px 0px rgba(0,0,0,0.03)'
                : '0px 4px 8px -2px rgba(0,0,0,0.25), 0px 8px 10px 0px rgba(0,0,0,0.2), 0px 2px 20px 0px rgba(0,0,0,0.15)'
            }
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius,
              '& fieldset': {
                borderWidth: '1.5px',
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)'
              },
              '&:hover fieldset': {
                borderWidth: '1.5px',
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)'
              },
              '&.Mui-focused fieldset': {
                borderWidth: '1.5px'
              }
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius * 0.75,
            height: 28,
            backgroundColor: mode === 'light' ? grey[100] : grey[700],
            '&:hover': {
              backgroundColor: mode === 'light' ? grey[200] : grey[600]
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'light' ? grey[800] : grey[700],
            color: '#fff',
            fontSize: '0.75rem',
            padding: '8px 12px',
            borderRadius: borderRadius * 0.75
          },
          arrow: {
            color: mode === 'light' ? grey[800] : grey[700]
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius * 1.5
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius * 1.25
          }
        }
      }
    }
  });
};

// 테마 생성 함수
export const createAppTheme = (options: ThemeOptions) => getDesignTokens(options);

// 기본 테마
export const lightTheme = createAppTheme({ mode: 'light', color: 'blue' });
export const darkTheme = createAppTheme({ mode: 'dark', color: 'blue' });