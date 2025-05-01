import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Share,
  Platform,
  Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../themes/ThemeContext';
import { SearchResult } from '../services/SearchService';
import FavoritesService from '../services/FavoritesService';
import NavigationService from '../services/NavigationService';

const { width } = Dimensions.get('window');

// 액션 버튼 타입
interface ActionButton {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

export const SearchResultDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const { item }: { item: SearchResult } = route.params;
  
  const [isFavorite, setIsFavorite] = useState(item.isFavorite || false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 즐겨찾기 상태 업데이트
  const toggleFavorite = async () => {
    try {
      const newState = !isFavorite;
      await FavoritesService.toggleFavorite({
        id: item.id,
        name: item.name,
        address: item.address,
        location: item.location,
        category: item.category
      });
      setIsFavorite(newState);
    } catch (error) {
      console.error('즐겨찾기 업데이트 오류:', error);
    }
  };
  
  // 공유 기능
  const shareLocation = async () => {
    try {
      await Share.share({
        message: `${item.name}\n${item.address}\nhttps://maps.google.com/?q=${item.location.latitude},${item.location.longitude}`,
        title: `${item.name} 위치 공유`,
      });
    } catch (error) {
      console.error('공유 중 오류:', error);
    }
  };
  
  // 네비게이션 시작
  const startNavigation = () => {
    navigation.navigate('Navigation', {
      destination: {
        latitude: item.location.latitude,
        longitude: item.location.longitude,
        name: item.name,
        address: item.address,
      }
    });
  };
  
  // 외부 지도 앱 열기
  const openInMaps = () => {
    const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
    const url = `${scheme}${item.location.latitude},${item.location.longitude}?q=${encodeURIComponent(item.name)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.error("외부 지도 앱을 열 수 없습니다.");
      }
    });
  };
  
  // 검색 결과 장소를 경로 계획의 출발지/목적지로 설정
  const useAsRoutePoint = (type: 'start' | 'destination') => {
    navigation.navigate('RouteOptions', {
      [type]: {
        latitude: item.location.latitude,
        longitude: item.location.longitude,
        name: item.name,
        address: item.address,
      }
    });
  };
  
  // 위치 알림 설정 화면으로 이동
  const setLocationAlert = () => {
    navigation.navigate('LocationAlert', {
      location: {
        latitude: item.location.latitude,
        longitude: item.location.longitude,
        name: item.name,
        address: item.address,
      }
    });
  };
  
  // 액션 버튼 구성
  const actionButtons: ActionButton[] = [
    {
      icon: 'navigate-outline',
      label: '길 안내',
      onPress: startNavigation,
      color: '#4285F4'
    },
    {
      icon: isFavorite ? 'star' : 'star-outline',
      label: '즐겨찾기',
      onPress: toggleFavorite,
      color: isFavorite ? '#FFD700' : colors.text
    },
    {
      icon: 'share-social-outline',
      label: '공유',
      onPress: shareLocation
    },
    {
      icon: 'map-outline',
      label: '지도에서 보기',
      onPress: openInMaps
    },
    {
      icon: 'notifications-outline',
      label: '위치 알림',
      onPress: setLocationAlert
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? '#444' : '#eee' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ width: 32 }} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* 지도 미리보기 */}
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: item.location.latitude,
              longitude: item.location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            <Marker
              coordinate={{
                latitude: item.location.latitude,
                longitude: item.location.longitude,
              }}
              title={item.name}
              description={item.address}
            />
          </MapView>
        </View>
        
        {/* 장소 정보 */}
        <View style={styles.infoContainer}>
          <Text style={[styles.placeName, { color: colors.text }]}>
            {item.name}
          </Text>
          
          {item.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryText}>
                {item.category}
              </Text>
            </View>
          )}
          
          <View style={[styles.infoItem, { borderBottomColor: isDark ? '#444' : '#eee' }]}>
            <Ionicons name="location-outline" size={20} color={isDark ? '#a0a0a0' : '#666'} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {item.address}
            </Text>
          </View>
          
          {item.distance !== undefined && (
            <View style={[styles.infoItem, { borderBottomColor: isDark ? '#444' : '#eee' }]}>
              <Ionicons name="navigate-outline" size={20} color={isDark ? '#a0a0a0' : '#666'} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                현재 위치에서 {item.distance < 1000 
                  ? `${Math.round(item.distance)}m` 
                  : `${(item.distance / 1000).toFixed(1)}km`} 떨어져 있습니다.
              </Text>
            </View>
          )}
          
          {item.rating !== undefined && (
            <View style={[styles.infoItem, { borderBottomColor: isDark ? '#444' : '#eee' }]}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {item.rating.toFixed(1)} / 5.0
              </Text>
            </View>
          )}
          
          {/* 위치 활용 옵션 */}
          <View style={styles.utilityButtonsContainer}>
            <TouchableOpacity 
              style={[styles.utilityButton, { backgroundColor: isDark ? '#444' : '#f0f0f0' }]}
              onPress={() => useAsRoutePoint('start')}
            >
              <Text style={[styles.utilityButtonText, { color: colors.text }]}>
                출발지로 설정
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.utilityButton, { backgroundColor: isDark ? '#444' : '#f0f0f0' }]}
              onPress={() => useAsRoutePoint('destination')}
            >
              <Text style={[styles.utilityButtonText, { color: colors.text }]}>
                목적지로 설정
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 주변 정보 섹션 - 추후 구현 */}
        <View style={[styles.nearbyContainer, { backgroundColor: isDark ? '#1e1e1e' : '#f9f9f9' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            주변 정보
          </Text>
          <Text style={{ color: colors.text, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
            주변 정보 기능이 준비 중입니다.
          </Text>
        </View>
      </ScrollView>
      
      {/* 액션 버튼 */}
      <View style={[styles.actionButtonsContainer, { backgroundColor: isDark ? '#1e1e1e' : '#fff', borderTopColor: isDark ? '#444' : '#eee' }]}>
        {actionButtons.map((button, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.actionButton}
            onPress={button.onPress}
          >
            <Ionicons name={button.icon as any} size={24} color={button.color || colors.text} />
            <Text style={[styles.actionButtonText, { color: button.color || colors.text }]}>
              {button.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  infoContainer: {
    padding: 16,
  },
  placeName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  categoryContainer: {
    backgroundColor: 'rgba(0, 120, 255, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  utilityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  utilityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nearbyContainer: {
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchResultDetailScreen;