import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigationStore } from '../services/NavigationStore';
import { Ionicons } from '@expo/vector-icons';
import offlineMapService from '../services/OfflineMapService';
import locationTrackingService from '../services/LocationTrackingService';
import voiceGuidanceService from '../services/VoiceGuidanceService';
import { useTheme, ThemeType } from '../themes/ThemeContext';
import { useNavigation } from '@react-navigation/native';

// 섹션 헤더 컴포넌트
interface SectionHeaderProps {
  title: string;
  iconName: any;
  iconColor: string;
  isExpanded: boolean;
  onPress: () => void;
  isDark: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, iconName, iconColor, isExpanded, onPress, isDark }) => (
  <TouchableOpacity 
    style={[styles.sectionHeader, { backgroundColor: isDark ? '#1e1e1e' : '#fff', borderBottomColor: isDark ? '#2c3e50' : '#e0e0e0' }]}
    onPress={onPress}
  >
    <View style={styles.sectionTitleContainer}>
      <Ionicons name={iconName} size={24} color={iconColor} style={styles.sectionIcon} />
      <Text style={[styles.sectionTitle, { color: isDark ? '#ecf0f1' : '#2c3e50' }]}>{title}</Text>
    </View>
    <Ionicons 
      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
      size={24} 
      color={isDark ? '#95a5a6' : '#7f8c8d'} 
    />
  </TouchableOpacity>
);

// 설정 행 컴포넌트
interface SettingRowProps {
  label: string;
  isDark: boolean;
  children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, isDark, children }) => (
  <View style={[styles.settingRow, { borderBottomColor: isDark ? '#2c3e50' : '#f0f0f0' }]}>
    <Text style={[styles.settingLabel, { color: isDark ? '#ecf0f1' : '#2c3e50' }]}>{label}</Text>
    {children}
  </View>
);

// 버튼 셀렉터 컴포넌트
interface ButtonSelectorProps {
  text: string;
  isDark: boolean;
  onPress: () => void;
}

const ButtonSelector: React.FC<ButtonSelectorProps> = ({ text, isDark, onPress }) => (
  <TouchableOpacity 
    style={[styles.buttonSelector, { backgroundColor: isDark ? '#2c3e50' : '#ecf0f1' }]}
    onPress={onPress}
  >
    <Text style={[styles.buttonText, { color: isDark ? '#ecf0f1' : '#2c3e50' }]}>
      {text}
    </Text>
  </TouchableOpacity>
);

// 액션 버튼 컴포넌트
interface ActionButtonProps {
  text: string;
  backgroundColor: string;
  onPress: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ text, backgroundColor, onPress }) => (
  <TouchableOpacity 
    style={[styles.button, { backgroundColor }]}
    onPress={onPress}
  >
    <Text style={[styles.buttonText, { color: '#ffffff' }]}>{text}</Text>
  </TouchableOpacity>
);

// 내비게이션 설정 컴포넌트
interface NavigationSettingsProps {
  settings: any;
  updateSettings: (settings: any) => void;
  isDark: boolean;
}

const NavigationSettings: React.FC<NavigationSettingsProps> = ({ settings, updateSettings, isDark }) => {
  const handleUnitToggle = () => {
    updateSettings({ units: settings.units === 'metric' ? 'imperial' : 'metric' });
  };

  const unitsText = settings.units === 'metric' ? '미터법 (km)' : '영국식 (miles)';
  
  return (
    <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
      <SettingRow label="교통 정보 사용" isDark={isDark}>
        <Switch
          value={settings.trafficEnabled}
          onValueChange={(value) => updateSettings({ trafficEnabled: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings.trafficEnabled ? '#3498db' : '#f4f3f4'}
        />
      </SettingRow>
      
      <SettingRow label="단위 시스템" isDark={isDark}>
        <ButtonSelector 
          text={unitsText} 
          isDark={isDark} 
          onPress={handleUnitToggle} 
        />
      </SettingRow>
      
      <SettingRow label="자동 재탐색" isDark={isDark}>
        <Switch
          value={true}
          onValueChange={() => {
            Alert.alert(
              '고급 기능',
              '이 기능은 현재 버전에서 항상 활성화되어 있습니다.'
            );
          }}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={'#3498db'}
        />
      </SettingRow>
    </View>
  );
};

// 지도 설정 컴포넌트
interface MapSettingsProps {
  settings: any;
  updateSettings: (settings: any) => void;
  isDark: boolean;
}

const MapSettings: React.FC<MapSettingsProps> = ({ settings, updateSettings, isDark }) => {
  const handleZoomChange = () => {
    let newZoom;
    if (settings.zoomLevel === 15) {
      newZoom = 13;
    } else if (settings.zoomLevel === 13) {
      newZoom = 10;
    } else {
      newZoom = 15;
    }
    updateSettings({ zoomLevel: newZoom });
  };
  
  const handleMapDirection = () => {
    Alert.alert(
      '지도 방향',
      '지도 방향을 선택하세요',
      [
        { text: '북쪽 고정', onPress: () => updateSettings({ mapOrientation: 'north' }) },
        { text: '진행 방향', onPress: () => updateSettings({ mapOrientation: 'direction' }) }
      ]
    );
  };
  
  const zoomLevelText = settings.zoomLevel === 15 ? '기본 (15)' :
                        settings.zoomLevel === 13 ? '넓게 (13)' :
                        '매우 넓게 (10)';
  
  return (
    <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
      <SettingRow label="기본 줌 레벨" isDark={isDark}>
        <ButtonSelector 
          text={zoomLevelText} 
          isDark={isDark} 
          onPress={handleZoomChange} 
        />
      </SettingRow>
      
      <SettingRow label="지도 방향" isDark={isDark}>
        <ButtonSelector 
          text="진행 방향" 
          isDark={isDark} 
          onPress={handleMapDirection} 
        />
      </SettingRow>
    </View>
  );
};

// 외관 설정 컴포넌트
interface AppearanceSettingsProps {
  settings: any;
  updateSettings: (settings: any) => void;
  theme: ThemeType;
  changeTheme: (theme: ThemeType) => void;
  isDark: boolean;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ settings, updateSettings, theme, changeTheme, isDark }) => {
  const showThemeSelector = () => {
    Alert.alert(
      '테마 설정',
      '앱의 테마를 선택하세요',
      [
        { text: '밝은 테마', onPress: () => changeTheme('light') },
        { text: '어두운 테마', onPress: () => changeTheme('dark') },
        { text: '시스템 설정 사용', onPress: () => changeTheme('system') },
        { text: '취소', style: 'cancel' }
      ]
    );
  };
  
  const themeText = theme === 'light' ? '밝은 테마' :
                    theme === 'dark' ? '어두운 테마' : 
                    '시스템 설정 사용';
  
  return (
    <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
      <SettingRow label="테마 설정" isDark={isDark}>
        <ButtonSelector 
          text={themeText} 
          isDark={isDark} 
          onPress={showThemeSelector} 
        />
      </SettingRow>
      
      <SettingRow label="지도 야간 모드" isDark={isDark}>
        <Switch
          value={settings.nightMode}
          onValueChange={(value) => updateSettings({ nightMode: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings.nightMode ? '#3498db' : '#f4f3f4'}
        />
      </SettingRow>
      
      <SettingRow label="고대비 모드" isDark={isDark}>
        <Switch
          value={settings.highContrast ?? false}
          onValueChange={(value) => updateSettings({ highContrast: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings.highContrast ? '#3498db' : '#f4f3f4'}
        />
      </SettingRow>
    </View>
  );
};

// 음성 안내 설정 컴포넌트
interface VoiceSettingsProps {
  settings: any;
  toggleVoiceGuidance: () => void;
  changeLanguage: () => void;
  testVoiceGuidance: () => void;
  navigateToVoiceSettings: () => void;
  isDark: boolean;
}

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ 
  settings, 
  toggleVoiceGuidance, 
  changeLanguage, 
  testVoiceGuidance, 
  navigateToVoiceSettings, 
  isDark 
}) => {
  const languageText = settings.language === 'ko-KR' ? '한국어' :
                       settings.language === 'en-US' ? '영어' :
                       settings.language === 'ja-JP' ? '일본어' :
                       settings.language === 'zh-CN' ? '중국어' : 
                       '한국어';
  
  return (
    <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
      <SettingRow label="음성 안내 활성화" isDark={isDark}>
        <Switch
          value={settings.voiceEnabled}
          onValueChange={toggleVoiceGuidance}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings.voiceEnabled ? '#3498db' : '#f4f3f4'}
        />
      </SettingRow>
      
      <SettingRow label="음성 안내 언어" isDark={isDark}>
        <ButtonSelector 
          text={languageText} 
          isDark={isDark} 
          onPress={changeLanguage} 
        />
      </SettingRow>
      
      <SettingRow label="" isDark={isDark}>
        <ActionButton 
          text="음성 안내 테스트" 
          backgroundColor={isDark ? '#2980b9' : '#3498db'} 
          onPress={testVoiceGuidance} 
        />
      </SettingRow>
      
      <View style={[styles.settingRow, { borderBottomColor: isDark ? '#2c3e50' : '#f0f0f0' }]}>
        <TouchableOpacity 
          style={[styles.fullButton, { backgroundColor: isDark ? '#16a085' : '#27ae60' }]}
          onPress={navigateToVoiceSettings}
        >
          <Ionicons name="settings-outline" size={18} color="#ffffff" style={styles.buttonIcon} />
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>음성 안내 상세 설정</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 오프라인 설정 컴포넌트
interface OfflineSettingsProps {
  clearAllMaps: () => void;
  isDark: boolean;
}

const OfflineSettings: React.FC<OfflineSettingsProps> = ({ clearAllMaps, isDark }) => (
  <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
    <SettingRow label="지도 캐시 크기" isDark={isDark}>
      <Text style={[styles.settingValue, { color: isDark ? '#95a5a6' : '#7f8c8d' }]}>
        {offlineMapService.getTotalCacheSize()} MB
      </Text>
    </SettingRow>
    
    <SettingRow label="" isDark={isDark}>
      <ActionButton 
        text="모든 오프라인 지도 삭제" 
        backgroundColor={isDark ? '#c0392b' : '#e74c3c'} 
        onPress={clearAllMaps} 
      />
    </SettingRow>
  </View>
);

// 정보 컴포넌트
interface AboutSettingsProps {
  resetLocationService: () => void;
  isDark: boolean;
}

const AboutSettings: React.FC<AboutSettingsProps> = ({ resetLocationService, isDark }) => (
  <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
    <SettingRow label="앱 버전" isDark={isDark}>
      <Text style={[styles.settingValue, { color: isDark ? '#95a5a6' : '#7f8c8d' }]}>1.0.0</Text>
    </SettingRow>
    
    <SettingRow label="기기 정보" isDark={isDark}>
      <Text style={[styles.settingValue, { color: isDark ? '#95a5a6' : '#7f8c8d' }]}>
        {Platform.OS} {Platform.Version}
      </Text>
    </SettingRow>
    
    <SettingRow label="" isDark={isDark}>
      <ActionButton 
        text="위치 서비스 재설정" 
        backgroundColor={isDark ? '#2980b9' : '#3498db'} 
        onPress={resetLocationService} 
      />
    </SettingRow>
  </View>
);

// 메인 설정 화면 컴포넌트
export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    toggleVoiceGuidance
  } = useNavigationStore();
  
  const { theme, setTheme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    navigation: true,
    map: false,
    appearance: false,
    voice: false,
    offline: false,
    about: false
  });
  
  // 섹션 확장/축소 토글
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // 캐시 초기화
  const clearAllMaps = () => {
    Alert.alert(
      '모든 오프라인 지도 삭제',
      '모든 오프라인 지도를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            offlineMapService.deleteAllRegions();
            Alert.alert('완료', '모든 오프라인 지도가 삭제되었습니다.');
          }
        }
      ]
    );
  };
  
  // 위치 서비스 재설정
  const resetLocationService = () => {
    if (locationTrackingService.isActive()) {
      locationTrackingService.stopTracking();
    }
    
    Alert.alert('완료', '위치 서비스가 재설정되었습니다.');
    
    setTimeout(() => {
      locationTrackingService.startTracking()
        .catch(() => {
          Alert.alert('오류', '위치 서비스 시작에 실패했습니다.');
        });
    }, 1000);
  };
  
  // 음성 설정 테스트
  const testVoiceGuidance = () => {
    if (!settings.voiceEnabled) {
      Alert.alert('알림', '음성 안내가 꺼져 있습니다. 먼저 음성 안내를 활성화해주세요.');
      return;
    }
    
    voiceGuidanceService.speak('음성 안내 테스트입니다. 설정이 올바르게 작동 중입니다.');
  };
  
  // 음성 언어 변경
  const changeLanguage = () => {
    const languages = [
      { code: 'ko-KR', name: '한국어' },
      { code: 'en-US', name: '영어 (미국)' },
      { code: 'ja-JP', name: '일본어' },
      { code: 'zh-CN', name: '중국어 (간체)' }
    ];
    
    Alert.alert(
      '음성 안내 언어 선택',
      '사용할 언어를 선택하세요.',
      languages.map(lang => ({
        text: lang.name,
        onPress: () => {
          updateSettings({ language: lang.code });
          voiceGuidanceService.setLanguage(lang.code);
          Alert.alert('설정 완료', `음성 안내 언어가 ${lang.name}로 변경되었습니다.`);
        }
      }))
    );
  };
  
  // 테마 변경 함수
  const changeTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    setTimeout(() => {
      if (settings.voiceEnabled) {
        const message = newTheme === 'light' ? '밝은 테마가 적용되었습니다.' :
                       newTheme === 'dark' ? '어두운 테마가 적용되었습니다.' :
                       '시스템 테마가 적용되었습니다.';
        voiceGuidanceService.speak(message);
      }
    }, 500);
  };
  
  // 상세 음성 설정 화면으로 이동
  const navigateToVoiceSettings = () => {
    navigation.navigate('VoiceSettings');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}>
      <Text style={[styles.headerTitle, { backgroundColor: isDark ? '#1e1e1e' : '#fff', color: isDark ? '#ecf0f1' : '#2c3e50', borderBottomColor: isDark ? '#2c3e50' : '#e0e0e0' }]}>설정</Text>
      
      <ScrollView style={styles.scrollView}>
        {/* 내비게이션 설정 */}
        <SectionHeader
          title="내비게이션 설정"
          iconName="navigate"
          iconColor="#3498db"
          isExpanded={expandedSections.navigation}
          onPress={() => toggleSection('navigation')}
          isDark={isDark}
        />
        
        {expandedSections.navigation && (
          <NavigationSettings
            settings={settings}
            updateSettings={updateSettings}
            isDark={isDark}
          />
        )}
        
        {/* 지도 설정 */}
        <SectionHeader
          title="지도 설정"
          iconName="map"
          iconColor="#e74c3c"
          isExpanded={expandedSections.map}
          onPress={() => toggleSection('map')}
          isDark={isDark}
        />
        
        {expandedSections.map && (
          <MapSettings
            settings={settings}
            updateSettings={updateSettings}
            isDark={isDark}
          />
        )}
        
        {/* 외관 설정 */}
        <SectionHeader
          title="외관 설정"
          iconName="color-palette"
          iconColor="#9b59b6"
          isExpanded={expandedSections.appearance}
          onPress={() => toggleSection('appearance')}
          isDark={isDark}
        />
        
        {expandedSections.appearance && (
          <AppearanceSettings
            settings={settings}
            updateSettings={updateSettings}
            theme={theme}
            changeTheme={changeTheme}
            isDark={isDark}
          />
        )}
        
        {/* 음성 안내 설정 */}
        <SectionHeader
          title="음성 안내 설정"
          iconName="volume-high"
          iconColor="#f39c12"
          isExpanded={expandedSections.voice}
          onPress={() => toggleSection('voice')}
          isDark={isDark}
        />
        
        {expandedSections.voice && (
          <VoiceSettings
            settings={settings}
            toggleVoiceGuidance={toggleVoiceGuidance}
            changeLanguage={changeLanguage}
            testVoiceGuidance={testVoiceGuidance}
            navigateToVoiceSettings={navigateToVoiceSettings}
            isDark={isDark}
          />
        )}
        
        {/* 오프라인 설정 */}
        <SectionHeader
          title="오프라인 설정"
          iconName="cloud-offline"
          iconColor="#27ae60"
          isExpanded={expandedSections.offline}
          onPress={() => toggleSection('offline')}
          isDark={isDark}
        />
        
        {expandedSections.offline && (
          <OfflineSettings
            clearAllMaps={clearAllMaps}
            isDark={isDark}
          />
        )}
        
        {/* 정보 */}
        <SectionHeader
          title="앱 정보"
          iconName="information-circle"
          iconColor="#3498db"
          isExpanded={expandedSections.about}
          onPress={() => toggleSection('about')}
          isDark={isDark}
        />
        
        {expandedSections.about && (
          <AboutSettings
            resetLocationService={resetLocationService}
            isDark={isDark}
          />
        )}
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#7f8c8d' : '#95a5a6' }]}>
            © 2025 내비게이션 앱. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sectionContent: {
    backgroundColor: '#fff',
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  settingValue: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonSelector: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
  },
  fullButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    width: '100%',
  },
  buttonIcon: {
    marginRight: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#95a5a6',
    fontSize: 12,
  },
});