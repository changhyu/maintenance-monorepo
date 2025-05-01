import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { OfflineManager } from './src/services/OfflineManager';
export default function App() {
    return (_jsx(SafeAreaProvider, { children: _jsx(ThemeProvider, { children: _jsx(AuthProvider, { children: _jsxs(NavigationContainer, { children: [_jsx(OfflineManager, {}), _jsx(AppNavigator, {}), _jsx(StatusBar, { style: "auto" })] }) }) }) }));
}
