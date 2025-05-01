import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMapStyle } from '../hooks/useMapStyle';
import { MapTheme } from '../services/MapStyleService';

interface MapStyleSelectorProps {
  compact?: boolean;
  showButton?: boolean;
}

/**
 * 맵 스타일 테마 선택 컴포넌트
 */
export const MapStyleSelector: React.FC<MapStyleSelectorProps> = ({
  compact = false,
  showButton = true,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const {
    styleOptions,
    isDarkMode,
    setMapTheme,
    updateStyleOptions,
    toggleHighContrast,
    getColorPalette
  } = useMapStyle();
  
  const colorPalette = getColorPalette();
  
  // 테마 항목 정의
  const themeOptions: { id: MapTheme; label: string; icon: string }[] = [
    { id: 'light', label: '라이트 모드', icon: 'white-balance-sunny' },
    { id: 'dark', label: '다크 모드', icon: 'weather-night' },
    { id: 'satellite', label: '위성 지도', icon: 'satellite-variant' },
    { id: 'terrain', label: '지형 지도', icon: 'terrain' },
    { id: 'hybrid', label: '하이브리드', icon: 'satellite' },
  ];
  
  // 레이어 항목 정의
  const layerOptions = [
    { id: 'showTraffic', label: '교통 정보', icon: 'traffic-light' },
    { id: 'showPOI', label: '관심 장소(POI)', icon: 'map-marker-multiple' },
    { id: 'show3DBuildings', label: '3D 건물', icon: 'office-building' },
    { id: 'showLabels', label: '지명 표시', icon: 'label' },
    { id: 'showIndoorMaps', label: '실내 지도', icon: 'floor-plan' },
  ];
  
  // 테마 선택 핸들러
  const handleThemeSelect = (theme: MapTheme) => {
    setMapTheme(theme);
  };
  
  // 레이어 토글 핸들러
  const handleLayerToggle = (optionId: string, value: boolean) => {
    updateStyleOptions({ [optionId]: value });
  };
  
  // 하이 컨트라스트 모드 토글 핸들러
  const handleHighContrastToggle = (value: boolean) => {
    toggleHighContrast(value);
  };
  
  // 현재 활성화된 테마 아이콘
  const getActiveThemeIcon = () => {
    const activeTheme = themeOptions.find(theme => theme.id === styleOptions.theme) || themeOptions[0];
    return activeTheme.icon;
  };
  
  // 간단한 버튼 렌더링 (compact 모드)
  if (compact && showButton) {
    return (
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons
          name={getActiveThemeIcon()}
          size={24}
          color={isDarkMode ? '#fff' : '#333'}
        />
      </TouchableOpacity>
    );
  }
  
  // 전체 컴포넌트 렌더링
  return (
    <>
      {/* 맵 스타일 버튼 */}
      {showButton && (
        <TouchableOpacity
          style={[styles.styleButton, isDarkMode && styles.styleButtonDark]}
          onPress={() => setModalVisible(true)}
        >
          <MaterialCommunityIcons
            name={getActiveThemeIcon()}
            size={20}
            color={isDarkMode ? '#fff' : '#333'}
          />
          <Text
            style={[styles.styleButtonText, isDarkMode && styles.styleButtonTextDark]}
          >
            맵 스타일
          </Text>
        </TouchableOpacity>
      )}

      {/* 맵 스타일 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                맵 스타일 설정
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>

            {/* 테마 선택기 */}
            <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
              테마 선택
            </Text>
            <View style={styles.themeSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {themeOptions.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      styleOptions.theme === theme.id && styles.themeOptionActive,
                      isDarkMode && styles.themeOptionDark,
                      styleOptions.theme === theme.id && isDarkMode && styles.themeOptionActiveDark,
                    ]}
                    onPress={() => handleThemeSelect(theme.id)}
                  >
                    <MaterialCommunityIcons
                      name={theme.icon}
                      size={28}
                      color={
                        styleOptions.theme === theme.id
                          ? colorPalette.primary
                          : isDarkMode
                          ? '#ddd'
                          : '#666'
                      }
                    />
                    <Text
                      style={[
                        styles.themeLabel,
                        isDarkMode && styles.themeLabelDark,
                        styleOptions.theme === theme.id && styles.themeLabelActive,
                      ]}
                    >
                      {theme.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 레이어 설정 */}
            <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
              레이어 설정
            </Text>
            <View style={styles.layerOptions}>
              {layerOptions.map((option) => (
                <View key={option.id} style={styles.layerOption}>
                  <View style={styles.layerLabelContainer}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={20}
                      color={isDarkMode ? '#ddd' : '#666'}
                    />
                    <Text style={[styles.layerLabel, isDarkMode && styles.layerLabelDark]}>
                      {option.label}
                    </Text>
                  </View>
                  <Switch
                    value={styleOptions[option.id as keyof typeof styleOptions] as boolean}
                    onValueChange={(value) => handleLayerToggle(option.id, value)}
                    trackColor={{ false: '#ccc', true: colorPalette.primary }}
                    thumbColor={isDarkMode ? '#ddd' : '#fff'}
                  />
                </View>
              ))}
              
              {/* 하이 컨트라스트 모드 */}
              <View style={styles.layerOption}>
                <View style={styles.layerLabelContainer}>
                  <MaterialCommunityIcons
                    name="contrast-circle"
                    size={20}
                    color={isDarkMode ? '#ddd' : '#666'}
                  />
                  <Text style={[styles.layerLabel, isDarkMode && styles.layerLabelDark]}>
                    하이 컨트라스트 모드
                  </Text>
                </View>
                <Switch
                  value={styleOptions.highContrastMode}
                  onValueChange={handleHighContrastToggle}
                  trackColor={{ false: '#ccc', true: colorPalette.primary }}
                  thumbColor={isDarkMode ? '#ddd' : '#fff'}
                />
              </View>
            </View>

            {/* 맵 스타일 미리보기 */}
            <View style={styles.previewContainer}>
              <Text style={[styles.previewText, isDarkMode && styles.previewTextDark]}>
                현재 선택: {themeOptions.find(t => t.id === styleOptions.theme)?.label}
              </Text>
            </View>

            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colorPalette.primary }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>적용</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 16,
    top: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  styleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  styleButtonDark: {
    backgroundColor: '#333',
  },
  styleButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
  },
  styleButtonTextDark: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalContentDark: {
    backgroundColor: '#222',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalTitleDark: {
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#eee',
  },
  themeSelector: {
    marginBottom: 24,
  },
  themeOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 10,
    borderRadius: 12,
    width: 100,
    backgroundColor: '#f5f5f5',
  },
  themeOptionDark: {
    backgroundColor: '#333',
  },
  themeOptionActive: {
    backgroundColor: '#e6f2ff',
  },
  themeOptionActiveDark: {
    backgroundColor: '#1a365d',
  },
  themeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  themeLabelDark: {
    color: '#ccc',
  },
  themeLabelActive: {
    fontWeight: '600',
  },
  layerOptions: {
    marginBottom: 20,
  },
  layerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  layerLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layerLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  layerLabelDark: {
    color: '#eee',
  },
  previewContainer: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 14,
    color: '#666',
  },
  previewTextDark: {
    color: '#aaa',
  },
  applyButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});