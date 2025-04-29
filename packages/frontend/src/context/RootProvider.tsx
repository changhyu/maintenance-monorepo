import React, { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { AppProvider } from './AppContext';
import { AuthProvider } from './AuthContext';
import { SettingsProvider } from './SettingsContext';

interface RootProviderProps {
  children: ReactNode;
}

/**
 * 애플리케이션의 모든 Context Provider를 통합 관리하는 컴포넌트
 * 적용 순서가 중요: 내부에서 사용되는 Context는 외부에 위치해야 함
 */
export function RootProvider({ children }: RootProviderProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <SettingsProvider>
        <AppProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppProvider>
      </SettingsProvider>
    </I18nextProvider>
  );
}

export default RootProvider;