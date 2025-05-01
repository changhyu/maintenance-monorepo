import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Switch, 
  TextInput,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LocationAlertService, { LocationAlert, DEFAULT_CATEGORIES } from '../services/LocationAlertService';
import { useTheme } from '../themes/ThemeContext';
import MapView, { Marker, Circle } from 'react-native-maps';
import { GeoPoint } from '../types';

export const LocationAlertScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [alerts, setAlerts] = useState<LocationAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<LocationAlert[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<Partial<LocationAlert>>({
    name: '',
    description: '',
    radius: 100,
    active: true,
    oneTime: false,
    type: 'proximity',
    category: '기타',
    location: { latitude: 37.5665, longitude: 126.9780 } // 서울 기본 위치
  });

  // 알림 목록 및 카테고리 로드
  const loadData = useCallback(() => {
    const allAlerts = LocationAlertService.getAllAlerts();
    const allCategories = LocationAlertService.getAllCategories();
    
    setAlerts(allAlerts);
    setCategories(allCategories);
    
    // 카테고리 필터 적용
    filterAlerts(allAlerts, selectedCategory);
  }, [selectedCategory]);

  // 카테고리별 알림 필터링
  const filterAlerts = (alertsList: LocationAlert[], category?: string) => {
    if (!category) {
      setFilteredAlerts(alertsList);
    } else {
      setFilteredAlerts(alertsList.filter(alert => alert.category === category));
    }
  };

  // 카테고리 선택 처리
  const handleCategorySelect = (category?: string) => {
    setSelectedCategory(category);
    filterAlerts(alerts, category);
  };

  // 새 카테고리 추가
  const addNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('입력 오류', '카테고리 이름을 입력해주세요.');
      return;
    }

    const trimmedName = newCategoryName.trim();
    const success = await LocationAlertService.addCategory(trimmedName);
    
    if (success) {
      const updatedCategories = LocationAlertService.getAllCategories();
      setCategories(updatedCategories);
      setNewCategoryName('');
    } else {
      Alert.alert('오류', '이미 존재하는 카테고리이거나 추가할 수 없는 카테고리입니다.');
    }
  };

  // 카테고리 삭제
  const deleteCategory = async (categoryName: string) => {
    if (DEFAULT_CATEGORIES.includes(categoryName)) {
      Alert.alert('삭제 불가', '기본 카테고리는 삭제할 수 없습니다.');
      return;
    }

    Alert.alert(
      '카테고리 삭제',
      `"${categoryName}" 카테고리를 삭제하시겠습니까? 해당 카테고리의 알림들은 '기타' 카테고리로 이동됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            const success = await LocationAlertService.removeCategory(categoryName);
            if (success) {
              if (selectedCategory === categoryName) {
                setSelectedCategory(undefined);
              }
              loadData();
            }
          }
        }
      ]
    );
  };

  // 화면이 포커스될 때마다 알림 목록 새로고침
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 알림 활성화/비활성화 토글
  const toggleAlertActive = async (id: string, active: boolean) => {
    await LocationAlertService.setAlertActive(id, active);
    loadData();
  };

  // 알림 삭제
  const deleteAlert = async (id: string, name: string) => {
    Alert.alert(
      '위치 알림 삭제',
      `"${name}" 알림을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            await LocationAlertService.deleteAlert(id);
            loadData();
          }
        }
      ]
    );
  };

  // 알림 추가
  const addNewAlert = async () => {
    if (!newAlert.name || !newAlert.location) {
      Alert.alert('입력 오류', '이름과 위치는 필수 입력 항목입니다.');
      return;
    }

    try {
      await LocationAlertService.addAlert({
        name: newAlert.name!,
        description: newAlert.description || '',
        location: newAlert.location!,
        radius: newAlert.radius || 100,
        active: newAlert.active !== undefined ? newAlert.active : true,
        oneTime: newAlert.oneTime || false,
        type: newAlert.type || 'proximity',
        category: newAlert.category,
      });
      
      setNewAlert({
        name: '',
        description: '',
        radius: 100,
        active: true,
        oneTime: false,
        type: 'proximity',
        category: '기타',
        location: { latitude: 37.5665, longitude: 126.9780 }
      });
      
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('알림 추가 중 오류:', error);
      Alert.alert('오류', '위치 알림을 추가하는 동안 문제가 발생했습니다.');
    }
  };

  // 알림 편집 시작
  const startEditAlert = (alert: LocationAlert) => {
    setNewAlert({
      name: alert.name,
      description: alert.description,
      location: { ...alert.location },
      radius: alert.radius,
      active: alert.active,
      oneTime: alert.oneTime,
      type: alert.type,
      category: alert.category,
    });
    setEditingAlert(alert.id);
    setShowEditModal(true);
  };

  // 알림 편집 저장
  const saveEditedAlert = async () => {
    if (!newAlert.name || !newAlert.location || !editingAlert) {
      Alert.alert('입력 오류', '이름과 위치는 필수 입력 항목입니다.');
      return;
    }

    try {
      await LocationAlertService.updateAlert(editingAlert, {
        name: newAlert.name,
        description: newAlert.description,
        location: newAlert.location,
        radius: newAlert.radius,
        active: newAlert.active,
        oneTime: newAlert.oneTime,
        type: newAlert.type,
        category: newAlert.category,
      });
      
      setNewAlert({
        name: '',
        description: '',
        radius: 100,
        active: true,
        oneTime: false,
        type: 'proximity',
        category: '기타',
        location: { latitude: 37.5665, longitude: 126.9780 }
      });
      
      setEditingAlert(null);
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error('알림 편집 중 오류:', error);
      Alert.alert('오류', '위치 알림을 편집하는 동안 문제가 발생했습니다.');
    }
  };

  // 지도에서 위치 선택
  const selectLocationOnMap = (location: GeoPoint) => {
    setNewAlert(prev => ({ ...prev, location }));
    setShowMapModal(false);
  };

  // 알림 항목 렌더링
  const renderAlertItem = ({ item }: { item: LocationAlert }) => {
    const alertTypeIcon = {
      proximity: 'navigate-circle',
      geofence: 'map',
      destination: 'flag'
    };

    return (
      <View style={[styles.alertItem, { 
        backgroundColor: isDark ? '#1e1e1e' : '#f8f9fa',
        borderLeftColor: item.active ? colors.primary : colors.border
      }]}>
        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Ionicons 
              name={alertTypeIcon[item.type] as any || 'location'} 
              size={24} 
              color={item.active ? colors.primary : colors.text} 
              style={styles.alertIcon} 
            />
            
            <View style={styles.alertTitles}>
              <Text style={[styles.alertName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.alertDescription, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                {item.description || '설명 없음'}
              </Text>
            </View>
            
            <Switch 
              value={item.active}
              onValueChange={(value) => toggleAlertActive(item.id, value)}
              trackColor={{ false: '#767577', true: colors.primaryLight }}
              thumbColor={item.active ? colors.primary : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.alertDetails}>
            <Text style={[styles.alertDetailText, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
              <Ionicons name="navigate" size={14} color={isDark ? '#a4b0be' : '#7f8c8d'} /> 
              {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
            </Text>
            <Text style={[styles.alertDetailText, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
              <Ionicons name="resize" size={14} color={isDark ? '#a4b0be' : '#7f8c8d'} /> 
              반경: {item.radius}m
            </Text>
            <Text style={[styles.alertDetailText, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
              <Ionicons name="pricetag" size={14} color={isDark ? '#a4b0be' : '#7f8c8d'} /> 
              카테고리: {item.category}
            </Text>
            {item.oneTime && (
              <View style={[styles.badge, { backgroundColor: isDark ? '#2c3e50' : '#f1f2f6' }]}>
                <Text style={[styles.badgeText, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                  일회성
                </Text>
              </View>
            )}
            {item.notified && (
              <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: 'white' }]}>
                  알림됨
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => startEditAlert(item)}
            >
              <Ionicons name="create-outline" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? '#c23616' : '#e74c3c' }]}
              onPress={() => deleteAlert(item.id, item.name)}
            >
              <Ionicons name="trash-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 카테고리 칩 렌더링
  const renderCategoryChip = (category?: string) => {
    const isSelected = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category || 'all'}
        style={[
          styles.categoryChip,
          {
            backgroundColor: isSelected ? colors.primary : isDark ? '#2c3e50' : '#ecf0f1',
          }
        ]}
        onPress={() => handleCategorySelect(category)}
      >
        <Text
          style={[
            styles.categoryChipText,
            { color: isSelected ? 'white' : isDark ? '#a4b0be' : '#7f8c8d' }
          ]}
        >
          {category || '전체'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.text }]}>위치 기반 알림</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AlertHistory')}
          >
            <Ionicons name="time-outline" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.primary, marginLeft: 8 }]}
            onPress={() => setShowCategoriesModal(true)}
          >
            <Ionicons name="list-outline" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.primary, marginLeft: 8 }]}
            onPress={() => navigation.navigate('MapAlertManagement')}
          >
            <Ionicons name="map-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollView}
        >
          {renderCategoryChip(undefined)}
          {categories.map(category => renderCategoryChip(category))}
        </ScrollView>
      </View>
      
      {filteredAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={isDark ? '#a4b0be' : '#95a5a6'} />
          <Text style={[styles.emptyText, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
            {selectedCategory ? `${selectedCategory} 카테고리에 알림이 없습니다` : '등록된 위치 알림이 없습니다'}
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#8395a7' : '#95a5a6' }]}>
            아래 버튼을 눌러 새 위치 알림을 추가하세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={item => item.id}
          renderItem={renderAlertItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
      
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* 새 알림 추가 모달 */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>새 위치 알림 추가</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2c3e50' : '#f1f2f6',
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="알림 이름"
              placeholderTextColor={isDark ? '#a4b0be' : '#95a5a6'}
              value={newAlert.name}
              onChangeText={text => setNewAlert(prev => ({ ...prev, name: text }))}
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2c3e50' : '#f1f2f6',
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="설명 (선택사항)"
              placeholderTextColor={isDark ? '#a4b0be' : '#95a5a6'}
              value={newAlert.description}
              onChangeText={text => setNewAlert(prev => ({ ...prev, description: text }))}
            />
            
            <TouchableOpacity 
              style={[styles.locationButton, { backgroundColor: colors.primaryLight }]}
              onPress={() => setShowMapModal(true)}
            >
              <Ionicons name="location" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.locationButtonText}>
                {newAlert.location?.latitude ? 
                  `위치: ${newAlert.location.latitude.toFixed(5)}, ${newAlert.location.longitude.toFixed(5)}` : 
                  '지도에서 위치 선택'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>카테고리:</Text>
              <View style={styles.pickerContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPickerScrollView}
                >
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        { 
                          backgroundColor: newAlert.category === category 
                            ? colors.primary 
                            : isDark ? '#2c3e50' : '#ecf0f1' 
                        }
                      ]}
                      onPress={() => setNewAlert(prev => ({ ...prev, category }))}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          { 
                            color: newAlert.category === category 
                              ? 'white' 
                              : isDark ? '#a4b0be' : '#7f8c8d' 
                          }
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>반경 (미터):</Text>
              <TextInput
                style={[styles.numberInput, { 
                  backgroundColor: isDark ? '#2c3e50' : '#f1f2f6',
                  color: colors.text,
                  borderColor: colors.border
                }]}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor={isDark ? '#a4b0be' : '#95a5a6'}
                value={newAlert.radius?.toString()}
                onChangeText={text => setNewAlert(prev => ({ 
                  ...prev, 
                  radius: text ? parseInt(text) : 100 
                }))}
              />
            </View>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>알림 유형:</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: newAlert.type === 'proximity' 
                        ? colors.primary 
                        : isDark ? '#2c3e50' : '#ecf0f1' 
                    }
                  ]}
                  onPress={() => setNewAlert(prev => ({ ...prev, type: 'proximity' }))}
                >
                  <Ionicons 
                    name="navigate-circle" 
                    size={16} 
                    color={newAlert.type === 'proximity' ? 'white' : isDark ? '#a4b0be' : '#7f8c8d'} 
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      { 
                        color: newAlert.type === 'proximity' 
                          ? 'white' 
                          : isDark ? '#a4b0be' : '#7f8c8d' 
                      }
                    ]}
                  >
                    근접
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: newAlert.type === 'geofence' 
                        ? colors.primary 
                        : isDark ? '#2c3e50' : '#ecf0f1' 
                    }
                  ]}
                  onPress={() => setNewAlert(prev => ({ ...prev, type: 'geofence' }))}
                >
                  <Ionicons 
                    name="map" 
                    size={16} 
                    color={newAlert.type === 'geofence' ? 'white' : isDark ? '#a4b0be' : '#7f8c8d'} 
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      { 
                        color: newAlert.type === 'geofence' 
                          ? 'white' 
                          : isDark ? '#a4b0be' : '#7f8c8d' 
                      }
                    ]}
                  >
                    영역
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: newAlert.type === 'destination' 
                        ? colors.primary 
                        : isDark ? '#2c3e50' : '#ecf0f1' 
                    }
                  ]}
                  onPress={() => setNewAlert(prev => ({ ...prev, type: 'destination' }))}
                >
                  <Ionicons 
                    name="flag" 
                    size={16} 
                    color={newAlert.type === 'destination' ? 'white' : isDark ? '#a4b0be' : '#7f8c8d'} 
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      { 
                        color: newAlert.type === 'destination' 
                          ? 'white' 
                          : isDark ? '#a4b0be' : '#7f8c8d' 
                      }
                    ]}
                  >
                    목적지
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>일회성 알림:</Text>
              <Switch
                value={newAlert.oneTime}
                onValueChange={(value) => setNewAlert(prev => ({ ...prev, oneTime: value }))}
                trackColor={{ false: '#767577', true: colors.primaryLight }}
                thumbColor={newAlert.oneTime ? colors.primary : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: isDark ? '#2c3e50' : '#ecf0f1' }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: isDark ? '#a4b0be' : '#7f8c8d' }}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={addNewAlert}
              >
                <Text style={{ color: 'white' }}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 알림 편집 모달 */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>위치 알림 편집</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2c3e50' : '#f1f2f6',
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="알림 이름"
              placeholderTextColor={isDark ? '#a4b0be' : '#95a5a6'}
              value={newAlert.name}
              onChangeText={text => setNewAlert(prev => ({ ...prev, name: text }))}
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2c3e50' : '#f1f2f6',
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="설명 (선택사항)"
              placeholderTextColor={isDark ? '#a4b0be' : '#95a5a6'}
              value={newAlert.description}
              onChangeText={text => setNewAlert(prev => ({ ...prev, description: text }))}
            />
            
            <TouchableOpacity 
              style={[styles.locationButton, { backgroundColor: colors.primaryLight }]}
              onPress={() => setShowMapModal(true)}
            >
              <Ionicons name="location" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.locationButtonText}>
                {newAlert.location?.latitude ? 
                  `위치: ${newAlert.location.latitude.toFixed(5)}, ${newAlert.location.longitude.toFixed(5)}` : 
                  '지도에서 위치 선택'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>카테고리:</Text>
              <View style={styles.pickerContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPickerScrollView}
                >
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        { 
                          backgroundColor: newAlert.category === category 
                            ? colors.primary 
                            : isDark ? '#2c3e50' : '#ecf0f1' 
                        }
                      ]}
                      onPress={() => setNewAlert(prev => ({ ...prev, category }))}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          { 
                            color: newAlert.category === category 
                              ? 'white' 
                              : isDark ? '#a4b0be' : '#7f8c8d' 
                          }
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>반경 (미터):</Text>
              <TextInput
                style={[styles.numberInput, { 
                  backgroundColor: isDark ? '#2c3e50' : '#f1f2f6',
                  color: colors.text,
                  borderColor: colors.border
                }]}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor={isDark ? '#a4b0be' : '#95a5a6'}
                value={newAlert.radius?.toString()}
                onChangeText={text => setNewAlert(prev => ({ 
                  ...prev, 
                  radius: text ? parseInt(text) : 100 
                }))}
              />
            </View>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>알림 유형:</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: newAlert.type === 'proximity' 
                        ? colors.primary 
                        : isDark ? '#2c3e50' : '#ecf0f1' 
                    }
                  ]}
                  onPress={() => setNewAlert(prev => ({ ...prev, type: 'proximity' }))}
                >
                  <Ionicons 
                    name="navigate-circle" 
                    size={16} 
                    color={newAlert.type === 'proximity' ? 'white' : isDark ? '#a4b0be' : '#7f8c8d'} 
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      { 
                        color: newAlert.type === 'proximity' 
                          ? 'white' 
                          : isDark ? '#a4b0be' : '#7f8c8d' 
                      }
                    ]}
                  >
                    근접
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: newAlert.type === 'geofence' 
                        ? colors.primary 
                        : isDark ? '#2c3e50' : '#ecf0f1' 
                    }
                  ]}
                  onPress={() => setNewAlert(prev => ({ ...prev, type: 'geofence' }))}
                >
                  <Ionicons 
                    name="map" 
                    size={16} 
                    color={newAlert.type === 'geofence' ? 'white' : isDark ? '#a4b0be' : '#7f8c8d'} 
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      { 
                        color: newAlert.type === 'geofence' 
                          ? 'white' 
                          : isDark ? '#a4b0be' : '#7f8c8d' 
                      }
                    ]}
                  >
                    영역
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: newAlert.type === 'destination' 
                        ? colors.primary 
                        : isDark ? '#2c3e50' : '#ecf0f1' 
                    }
                  ]}
                  onPress={() => setNewAlert(prev => ({ ...prev, type: 'destination' }))}
                >
                  <Ionicons 
                    name="flag" 
                    size={16} 
                    color={newAlert.type === 'destination' ? 'white' : isDark ? '#a4b0be' : '#7f8c8d'} 
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      { 
                        color: newAlert.type === 'destination' 
                          ? 'white' 
                          : isDark ? '#a4b0be' : '#7f8c8d' 
                      }
                    ]}
                  >
                    목적지
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>일회성 알림:</Text>
              <Switch
                value={newAlert.oneTime}
                onValueChange={(value) => setNewAlert(prev => ({ ...prev, oneTime: value }))}
                trackColor={{ false: '#767577', true: colors.primaryLight }}
                thumbColor={newAlert.oneTime ? colors.primary : '#f4f3f4'}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>알림 초기화:</Text>
              <TouchableOpacity 
                style={[styles.resetButton, { backgroundColor: colors.primaryLight }]}
                onPress={() => {
                  if (editingAlert) {
                    LocationAlertService.resetAlert(editingAlert);
                  }
                }}
              >
                <Text style={{ color: 'white' }}>알림 상태 초기화</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: isDark ? '#2c3e50' : '#ecf0f1' }]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingAlert(null);
                  setNewAlert({
                    name: '',
                    description: '',
                    radius: 100,
                    active: true,
                    oneTime: false,
                    type: 'proximity',
                    category: '기타',
                    location: { latitude: 37.5665, longitude: 126.9780 }
                  });
                }}
              >
                <Text style={{ color: isDark ? '#a4b0be' : '#7f8c8d' }}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={saveEditedAlert}
              >
                <Text style={{ color: 'white' }}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 지도 선택 모달 */}
      <Modal
        visible={showMapModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: newAlert.location?.latitude || 37.5665,
              longitude: newAlert.location?.longitude || 126.9780,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e) => selectLocationOnMap(e.nativeEvent.coordinate)}
          >
            {newAlert.location && (
              <>
                <Marker coordinate={newAlert.location} />
                <Circle
                  center={newAlert.location}
                  radius={newAlert.radius || 100}
                  fillColor="rgba(100, 150, 255, 0.3)"
                  strokeColor="rgba(100, 150, 255, 0.5)"
                />
              </>
            )}
          </MapView>
          
          <View style={styles.mapControls}>
            <TouchableOpacity 
              style={[styles.mapControlButton, { backgroundColor: 'white' }]}
              onPress={() => setShowMapModal(false)}
            >
              <Text style={{ color: '#333' }}>취소</Text>
            </TouchableOpacity>
            
            <Text style={styles.mapInstructions}>지도를 탭하여 위치를 선택하세요</Text>
            
            <TouchableOpacity 
              style={[styles.mapControlButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (newAlert.location) {
                  setShowMapModal(false);
                }
              }}
            >
              <Text style={{ color: 'white' }}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 카테고리 관리 모달 */}
      <Modal
        visible={showCategoriesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoriesModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>카테고리 관리</Text>
              <TouchableOpacity
                onPress={() => setShowCategoriesModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.categoryInputContainer}>
              <TextInput
                style={[styles.categoryInput, { 
                  backgroundColor: isDark ? '#2c3e50' : '#f1f2f6',
                  color: colors.text,
                  borderColor: colors.border
                }]}
                placeholder="새 카테고리 이름"
                placeholderTextColor={isDark ? '#a4b0be' : '#95a5a6'}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity 
                style={[styles.categoryAddButton, { backgroundColor: colors.primary }]}
                onPress={addNewCategory}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={categories}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <View style={[styles.categoryItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.categoryItemContent}>
                    <Text style={[styles.categoryItemText, { color: colors.text }]}>{item}</Text>
                    <Text style={[styles.categoryCount, { color: isDark ? '#a4b0be' : '#7f8c8d' }]}>
                      알림 {alerts.filter(alert => alert.category === item).length}개
                    </Text>
                  </View>
                  
                  {/* 기본 카테고리가 아닌 경우에만 삭제 버튼 표시 */}
                  {!DEFAULT_CATEGORIES.includes(item) && (
                    <TouchableOpacity
                      style={[styles.categoryDeleteButton, { backgroundColor: '#ff3b30' }]}
                      onPress={() => deleteCategory(item)}
                    >
                      <Ionicons name="trash-outline" size={20} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              style={styles.categoriesList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesScrollView: {
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  alertItem: {
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 5,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  alertContent: {
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIcon: {
    marginRight: 10,
  },
  alertTitles: {
    flex: 1,
  },
  alertName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertDescription: {
    fontSize: 14,
  },
  alertDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  alertDetailText: {
    fontSize: 12,
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    right: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    width: '40%',
    textAlign: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  resetButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapModalContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
  },
  mapControlButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  mapInstructions: {
    fontSize: 14,
    color: '#333',
  },
  pickerContainer: {
    flex: 1,
  },
  categoryPickerScrollView: {
    paddingVertical: 4,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '75%',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  categoryAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  categoryItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 12,
    marginRight: 8,
  },
  categoryDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});