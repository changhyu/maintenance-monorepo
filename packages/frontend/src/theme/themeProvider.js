import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightColorScheme, darkColorScheme, detectSystemColorScheme, listenToColorSchemeChanges, createPaletteOptions } from './colorScheme';
// 테마 컨텍스트 생성
const ThemeContext = createContext({
    mode: 'system',
    setMode: () => { },
    isDarkMode: false,
    toggleColorMode: () => { }
});
/**
 * 테마 호환성 컴포넌트 설정
 * MUI 컴포넌트에 대한 다크/라이트 모드별 스타일 오버라이드
 */
function getComponents(mode) {
    return {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: mode === 'dark' ? '#6b6b6b #2b2b2b' : '#959595 #f5f5f5',
                    '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                        backgroundColor: mode === 'dark' ? '#2b2b2b' : '#f5f5f5',
                    },
                    '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                        backgroundColor: mode === 'dark' ? '#6b6b6b' : '#959595',
                        borderRadius: 8,
                    }
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                    fontWeight: 500,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: mode === 'dark' ? '0px 2px 4px rgba(0,0,0,0.3)' : '0px 2px 4px rgba(0,0,0,0.1)',
                    }
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: mode === 'dark'
                        ? '0px 2px 8px rgba(0,0,0,0.4)'
                        : '0px 2px 4px rgba(0,0,0,0.05)',
                    borderRadius: 12,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        boxShadow: mode === 'dark'
                            ? '0px 4px 12px rgba(0,0,0,0.5)'
                            : '0px 4px 12px rgba(0,0,0,0.1)',
                    }
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: mode === 'dark'
                        ? '0px 2px 8px rgba(0,0,0,0.4)'
                        : '0px 2px 4px rgba(0,0,0,0.1)',
                }
            }
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                    }
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                }
            }
        },
        MuiSwitch: {
            styleOverrides: {
                root: {
                    padding: 8,
                },
                thumb: {
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 600,
                    backgroundColor: mode === 'dark' ? '#2d2d2d' : '#f5f7fa',
                }
            }
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:last-child td, &:last-child th': {
                        border: 0,
                    },
                    '&:hover': {
                        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    }
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                }
            }
        }
    };
}
/**
 * 커스텀 테마 프로바이더 컴포넌트
 */
export function ThemeProvider({ children, defaultMode = 'system' }) {
    // 테마 모드 상태
    const [mode, setMode] = useState(() => {
        // 로컬 스토리지에서 사용자 테마 설정 불러오기
        const savedMode = localStorage.getItem('themeMode');
        return savedMode || defaultMode;
    });
    // 실제 다크 모드 여부 상태
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // 시스템 모드인 경우 시스템 설정 감지, 아니면 모드 값 사용
        return mode === 'system' ? detectSystemColorScheme() : mode === 'dark';
    });
    // 모드 변경 시 로컬 스토리지 저장
    useEffect(() => {
        localStorage.setItem('themeMode', mode);
        // 시스템 모드인 경우 시스템 설정 감지, 아니면 모드 값 그대로 사용
        setIsDarkMode(mode === 'system' ? detectSystemColorScheme() : mode === 'dark');
    }, [mode]);
    // 시스템 다크 모드 변경 감지
    useEffect(() => {
        // 시스템 모드일 때만 감지
        if (mode !== 'system')
            return;
        // 리스너 등록
        const removeListener = listenToColorSchemeChanges((isDark) => {
            setIsDarkMode(isDark);
        });
        // 컴포넌트 언마운트 시 리스너 제거
        return removeListener;
    }, [mode]);
    // 테마 모드 토글 함수
    const toggleColorMode = () => {
        setMode((prevMode) => {
            if (prevMode === 'light')
                return 'dark';
            if (prevMode === 'dark')
                return 'system';
            // system -> light
            return 'light';
        });
    };
    // MUI 테마 생성
    const theme = useMemo(() => {
        const paletteMode = isDarkMode ? 'dark' : 'light';
        const colorScheme = isDarkMode ? darkColorScheme : lightColorScheme;
        return createTheme({
            palette: createPaletteOptions(colorScheme, paletteMode),
            typography: {
                fontFamily: '"Noto Sans KR", "Roboto", "Helvetica", "Arial", sans-serif',
                h1: { fontSize: '2.5rem', fontWeight: 500 },
                h2: { fontSize: '2rem', fontWeight: 500 },
                h3: { fontSize: '1.75rem', fontWeight: 500 },
                h4: { fontSize: '1.5rem', fontWeight: 500 },
                h5: { fontSize: '1.25rem', fontWeight: 500 },
                h6: { fontSize: '1rem', fontWeight: 500 },
                body1: { fontSize: '1rem' },
                body2: { fontSize: '0.875rem' },
                button: { textTransform: 'none' },
            },
            shape: {
                borderRadius: 8,
            },
            components: getComponents(paletteMode),
        });
    }, [isDarkMode]);
    // 컨텍스트 값
    const contextValue = useMemo(() => ({
        mode,
        setMode,
        isDarkMode,
        toggleColorMode,
    }), [mode, isDarkMode]);
    return (_jsx(ThemeContext.Provider, { value: contextValue, children: _jsxs(MuiThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), children] }) }));
}
/**
 * 테마 사용 훅
 * @returns 테마 컨텍스트
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
export default ThemeProvider;
