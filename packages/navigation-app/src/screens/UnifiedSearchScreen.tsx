import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import unifiedSearchService, { 
  SearchResult, 
  CategoryType, 
  SearchResultType,
  SearchFilter 
} from '../services/UnifiedSearchService';
import { useNavigation } from '@react-navigation/native';
import { useNavigationStore } from '../stores/navigationStore';
import { GeoPoint } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// 네비게이션 타입 정의
type RootStackParamList = {
  SearchResultDetail: { item: SearchResult };
  MultiRoute: { origin: any; destination: any };
  // 필요한 다른 화면 타입 정의
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 카테고리 버튼 아이템 인터페이스
interface CategoryItem {
  id: CategoryType;
  name: string;
  icon: string;
}

// 카테고리 목록
const CATEGORIES: CategoryItem[] = [
  { id: CategoryType.RESTAURANT, name: '맛집', icon: 'restaurant' },
  { id: CategoryType.CAFE, name: '카페', icon: 'local-cafe' },
  { id: CategoryType.HOSPITAL, name: '병원', icon: 'local-hospital' },
  { id: CategoryType.HOTEL, name: '호텔', icon: 'hotel' },
  { id: CategoryType.PARKING, name: '주차장', icon: 'local-parking' },
  { id: CategoryType.GAS_STATION, name: '주유소', icon: 'local-gas-station' },
  { id: CategoryType.CONVENIENCE_STORE, name: '편의점', icon: 'local-convenience-store' },
  { id: CategoryType.SHOPPING_MALL, name: '쇼핑', icon: 'local-mall' },
  { id: CategoryType.BANK, name: '은행', icon: 'account-balance' },
  { id: CategoryType.PHARMACY, name: '약국', icon: 'local-pharmacy' },
];

const UnifiedSearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  // 네비게이션 스토어에서 현재 위치 가져오기 (currentLocation → navigationState.currentPosition으로 수정)
  const currentPosition = useNavigationStore(state => state.navigationState.currentPosition);
  
  // 기본 위치 설정 (currentPosition이 없을 경우 사용)
  const defaultLocation: GeoPoint = { latitude: 37.566, longitude: 126.9784 }; // 서울시청
  
  // 상태 관리
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favoriteSearches, setFavoriteSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>({
    sortBy: 'distance',
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // 컴포넌트 마운트 시 최근 검색어 및 즐겨찾기 로드
  useEffect(() => {
    const loadSavedSearches = async () => {
      const recent = unifiedSearchService.getRecentSearches();
      const favorites = unifiedSearchService.getFavoriteSearches();
      
      setRecentSearches(recent);
      setFavoriteSearches(favorites);
    };
    
    loadSavedSearches();
  }, []);

  // 검색어 변경 시 자동완성 요청
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (query.trim()) {
      setShowSuggestions(true);
      searchTimeout.current = setTimeout(async () => {
        try {
          const suggestionResults = await unifiedSearchService.getSuggestions(query);
          setSuggestions(suggestionResults);
        } catch (error) {
          console.error('자동완성 요청 오류:', error);
          setSuggestions([]);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  // 검색 수행
  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);
    Keyboard.dismiss();

    try {
      // currentPosition이 없는 경우 defaultLocation 사용
      const userLocation = currentPosition || defaultLocation;
      const results = await unifiedSearchService.search(searchQuery, activeFilter, userLocation);
      setSearchResults(results);
      
      // 최근 검색어 업데이트
      const updatedRecent = unifiedSearchService.getRecentSearches();
      setRecentSearches(updatedRecent);
    } catch (error) {
      console.error('검색 오류:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 카테고리 검색
  const handleCategorySearch = async (category: CategoryType) => {
    setSelectedCategory(category);
    setIsLoading(true);
    setQuery(''); // 검색어 초기화
    setShowSuggestions(false);
    Keyboard.dismiss();

    try {
      // currentPosition이 없는 경우 defaultLocation 사용
      const userLocation = currentPosition || defaultLocation;
      const results = await unifiedSearchService.searchByCategory(category, userLocation);
      setSearchResults(results);
    } catch (error) {
      console.error('카테고리 검색 오류:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 즐겨찾기 추가/제거
  const toggleFavorite = (searchQuery: string) => {
    const isFavorite = favoriteSearches.includes(searchQuery);
    
    if (isFavorite) {
      unifiedSearchService.removeFromFavorites(searchQuery);
    } else {
      unifiedSearchService.addToFavorites(searchQuery);
    }
    
    // 즐겨찾기 목록 업데이트
    const updatedFavorites = unifiedSearchService.getFavoriteSearches();
    setFavoriteSearches(updatedFavorites);
  };

  // 결과 항목 선택
  const handleResultSelect = (result: SearchResult) => {
    // 상세 정보 화면으로 이동
    navigation.navigate('SearchResultDetail', { item: result });
  };
  
  // 결과 항목에서 경로 찾기 처리
  const handleFindRoute = (result: SearchResult) => {
    // 현재 위치를 출발지로, 검색 결과를 목적지로 설정
    const origin = {
      latitude: (currentPosition || defaultLocation).latitude,
      longitude: (currentPosition || defaultLocation).longitude,
      name: '현재 위치'
    };
    
    const destination = {
      latitude: result.location.latitude,
      longitude: result.location.longitude,
      name: result.name
    };
    
    // 다중 경로 계획 화면으로 이동
    navigation.navigate('MultiRoute', { origin, destination });
  };

  // 정렬 방식 변경
  const changeSortMethod = (sortBy: 'distance' | 'rating' | 'relevance') => {
    setActiveFilter({
      ...activeFilter,
      sortBy,
    });
    
    // 현재 검색 결과가 있으면 새로운 정렬 방식으로 다시 검색
    if (searchResults.length > 0) {
      handleSearch();
    }
  };

  // 검색 결과 렌더링
  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const isFavorite = favoriteSearches.includes(item.name);
    
    return (
      <TouchableOpacity
        style={[
          styles.resultItem, 
          isDarkMode ? styles.resultItemDark : null
        ]}
        onPress={() => handleResultSelect(item)}
      >
        <View style={styles.resultIconContainer}>
          {item.type === SearchResultType.POI && (
            <Icon 
              name={getCategoryIcon(item.category)} 
              size={24} 
              color={isDarkMode ? '#ffffff' : '#333333'} 
            />
          )}
          {item.type === SearchResultType.ADDRESS && (
            <Icon 
              name="location-on" 
              size={24} 
              color={isDarkMode ? '#ffffff' : '#333333'} 
            />
          )}
          {item.type === SearchResultType.COORDINATE && (
            <Icon 
              name="gps-fixed" 
              size={24} 
              color={isDarkMode ? '#ffffff' : '#333333'} 
            />
          )}
        </View>
        
        <View style={styles.resultContent}>
          <Text style={[
            styles.resultTitle,
            isDarkMode ? styles.textWhite : null
          ]}>
            {item.name}
          </Text>
          
          {item.address && (
            <Text style={[
              styles.resultSubtitle,
              isDarkMode ? styles.textLightGray : null
            ]}>
              {item.address}
            </Text>
          )}
          
          <View style={styles.resultMetaContainer}>
            {item.distance !== undefined && (
              <Text style={[
                styles.resultMeta,
                isDarkMode ? styles.textLightGray : null
              ]}>
                {item.distance.toFixed(1)}km
              </Text>
            )}
            
            {item.rating !== undefined && (
              <View style={styles.ratingContainer}>
                <Icon name="star" size={14} color="#FFD700" />
                <Text style={[
                  styles.resultMeta,
                  isDarkMode ? styles.textLightGray : null
                ]}>
                  {item.rating.toFixed(1)}
                </Text>
              </View>
            )}
            
            {item.category && (
              <Text style={[
                styles.resultCategory,
                isDarkMode ? styles.textLightGray : null
              ]}>
                {getCategoryName(item.category)}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.resultActions}>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.name)}
          >
            <Icon 
              name={isFavorite ? 'star' : 'star-border'} 
              size={24} 
              color={isFavorite ? '#FFD700' : isDarkMode ? '#ffffff' : '#333333'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.routeButton}
            onPress={() => handleFindRoute(item)}
          >
            <Icon 
              name="directions" 
              size={24} 
              color={isDarkMode ? '#2196F3' : '#1976D2'} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // 자동완성 항목 렌더링
  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        isDarkMode ? styles.suggestionItemDark : null
      ]}
      onPress={() => {
        setQuery(item);
        handleSearch(item);
      }}
    >
      <Icon name="search" size={18} color={isDarkMode ? '#ffffff' : '#333333'} />
      <Text style={[
        styles.suggestionText,
        isDarkMode ? styles.textWhite : null
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  // 최근 검색어 렌더링
  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.recentItem,
        isDarkMode ? styles.recentItemDark : null
      ]}
      onPress={() => {
        setQuery(item);
        handleSearch(item);
      }}
    >
      <Icon name="history" size={18} color={isDarkMode ? '#ffffff' : '#333333'} />
      <Text style={[
        styles.recentText,
        isDarkMode ? styles.textWhite : null
      ]}>
        {item}
      </Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => {
          const filtered = recentSearches.filter(search => search !== item);
          setRecentSearches(filtered);
        }}
      >
        <Icon name="close" size={16} color={isDarkMode ? '#ffffff' : '#333333'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // 카테고리 아이콘 버튼 렌더링
  const renderCategoryButton = ({ item }: { item: CategoryItem }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.id ? styles.selectedCategoryButton : null,
        isDarkMode ? styles.categoryButtonDark : null
      ]}
      onPress={() => handleCategorySearch(item.id)}
    >
      <Icon 
        name={item.icon} 
        size={24} 
        color={
          selectedCategory === item.id
            ? '#ffffff'
            : isDarkMode ? '#ffffff' : '#333333'
        } 
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id ? styles.selectedCategoryText : null,
          isDarkMode ? styles.textWhite : null
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // 카테고리 이름 가져오기
  const getCategoryName = (category?: CategoryType): string => {
    if (!category) return '';
    const categoryItem = CATEGORIES.find(c => c.id === category);
    return categoryItem ? categoryItem.name : '';
  };

  // 카테고리 아이콘 가져오기
  const getCategoryIcon = (category?: CategoryType): string => {
    if (!category) return 'place';
    const categoryItem = CATEGORIES.find(c => c.id === category);
    return categoryItem ? categoryItem.icon : 'place';
  };

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode ? styles.containerDark : null
    ]}>
      {/* 헤더 영역 */}
      <View style={[
        styles.header,
        isDarkMode ? styles.headerDark : null
      ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon 
            name="arrow-back" 
            size={24} 
            color={isDarkMode ? '#ffffff' : '#333333'} 
          />
        </TouchableOpacity>
        
        <View style={[
          styles.searchInputContainer,
          isDarkMode ? styles.searchInputContainerDark : null
        ]}>
          <Icon 
            name="search" 
            size={24} 
            color={isDarkMode ? '#ffffff' : '#333333'} 
          />
          <TextInput
            ref={searchInputRef}
            style={[
              styles.searchInput,
              isDarkMode ? styles.searchInputDark : null
            ]}
            placeholder="장소 검색"
            placeholderTextColor={isDarkMode ? '#A0A0A0' : '#888888'}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            autoFocus={false}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <Icon 
                name="cancel" 
                size={18} 
                color={isDarkMode ? '#A0A0A0' : '#888888'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* 카테고리 버튼 영역 */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryButton}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>
      
      {/* 정렬 옵션 영역 */}
      {searchResults.length > 0 && (
        <View style={[
          styles.sortOptionsContainer,
          isDarkMode ? styles.sortOptionsContainerDark : null
        ]}>
          <TouchableOpacity
            style={[
              styles.sortOption,
              activeFilter.sortBy === 'relevance' ? styles.activeSortOption : null
            ]}
            onPress={() => changeSortMethod('relevance')}
          >
            <Text style={[
              styles.sortText,
              activeFilter.sortBy === 'relevance' ? styles.activeSortText : null,
              isDarkMode ? styles.textWhite : null
            ]}>
              관련성순
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortOption,
              activeFilter.sortBy === 'distance' ? styles.activeSortOption : null
            ]}
            onPress={() => changeSortMethod('distance')}
          >
            <Text style={[
              styles.sortText,
              activeFilter.sortBy === 'distance' ? styles.activeSortText : null,
              isDarkMode ? styles.textWhite : null
            ]}>
              거리순
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sortOption,
              activeFilter.sortBy === 'rating' ? styles.activeSortOption : null
            ]}
            onPress={() => changeSortMethod('rating')}
          >
            <Text style={[
              styles.sortText,
              activeFilter.sortBy === 'rating' ? styles.activeSortText : null,
              isDarkMode ? styles.textWhite : null
            ]}>
              평점순
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 콘텐츠 영역 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={[
            styles.loadingText,
            isDarkMode ? styles.textWhite : null
          ]}>
            검색 중...
          </Text>
        </View>
      ) : (
        <>
          {/* 자동완성 영역 */}
          {showSuggestions && suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `suggestion-${index}`}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
            />
          )}
          
          {/* 검색 결과 없음 */}
          {!showSuggestions && searchResults.length === 0 && query.trim() !== '' && (
            <View style={styles.noResultsContainer}>
              <Icon name="search-off" size={64} color="#BDBDBD" />
              <Text style={[
                styles.noResultsText,
                isDarkMode ? styles.textWhite : null
              ]}>
                검색 결과가 없습니다
              </Text>
              <Text style={[
                styles.noResultsSubText,
                isDarkMode ? styles.textLightGray : null
              ]}>
                다른 검색어로 시도해보세요
              </Text>
            </View>
          )}
          
          {/* 검색 결과 영역 */}
          {!showSuggestions && searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={item => item.id}
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContainer}
            />
          )}
          
          {/* 최근 검색어 영역 */}
          {!showSuggestions && searchResults.length === 0 && query.trim() === '' && (
            <View style={styles.initialStateContainer}>
              {recentSearches.length > 0 && (
                <View style={[
                  styles.recentSearchesSection,
                  isDarkMode ? styles.sectionDark : null
                ]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[
                      styles.sectionTitle,
                      isDarkMode ? styles.textWhite : null
                    ]}>
                      최근 검색어
                    </Text>
                    <TouchableOpacity
                      onPress={() => setRecentSearches([])}
                    >
                      <Text style={styles.clearAllText}>전체 삭제</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={recentSearches}
                    renderItem={renderRecentSearch}
                    keyExtractor={(item, index) => `recent-${index}`}
                    style={styles.recentSearchesList}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}
              
              {favoriteSearches.length > 0 && (
                <View style={[
                  styles.favoritesSection,
                  isDarkMode ? styles.sectionDark : null
                ]}>
                  <Text style={[
                    styles.sectionTitle,
                    isDarkMode ? styles.textWhite : null
                  ]}>
                    즐겨찾기
                  </Text>
                  <View style={styles.favoritesList}>
                    {favoriteSearches.map((favorite, index) => (
                      <TouchableOpacity 
                        key={`favorite-${index}`}
                        style={[
                          styles.favoriteChip,
                          isDarkMode ? styles.favoriteChipDark : null
                        ]}
                        onPress={() => {
                          setQuery(favorite);
                          handleSearch(favorite);
                        }}
                      >
                        <Icon name="star" size={14} color="#FFD700" />
                        <Text style={[
                          styles.favoriteChipText,
                          isDarkMode ? styles.textWhite : null
                        ]}>
                          {favorite}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

// 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerDark: {
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    padding: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginLeft: 8,
    paddingHorizontal: 12,
  },
  searchInputContainerDark: {
    backgroundColor: '#2C2C2C',
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    color: '#333333',
    fontSize: 16,
  },
  searchInputDark: {
    color: '#FFFFFF',
  },
  clearButton: {
    padding: 4,
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    zIndex: 5,
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    minWidth: 72,
  },
  categoryButtonDark: {
    backgroundColor: '#2C2C2C',
  },
  selectedCategoryButton: {
    backgroundColor: '#2196F3',
  },
  categoryText: {
    fontSize: 12,
    marginTop: 4,
    color: '#333333',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 5,
  },
  sortOptionsContainerDark: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333333',
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
  },
  activeSortOption: {
    backgroundColor: '#2196F3',
  },
  sortText: {
    fontSize: 14,
    color: '#333333',
  },
  activeSortText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
  },
  suggestionsList: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: '50%',
    zIndex: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionItemDark: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333333',
  },
  suggestionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333333',
  },
  resultsList: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  resultsContainer: {
    paddingVertical: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultItemDark: {
    backgroundColor: '#1E1E1E',
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  resultMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resultMeta: {
    fontSize: 12,
    color: '#757575',
    marginRight: 12,
  },
  resultCategory: {
    fontSize: 12,
    color: '#757575',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  favoriteButton: {
    padding: 6,
  },
  routeButton: {
    padding: 6,
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
  },
  noResultsSubText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  initialStateContainer: {
    flex: 1,
  },
  recentSearchesSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  sectionDark: {
    backgroundColor: '#1E1E1E',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  clearAllText: {
    fontSize: 14,
    color: '#2196F3',
  },
  recentSearchesList: {
    maxHeight: 200,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentItemDark: {
    borderBottomColor: '#333333',
  },
  recentText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333333',
  },
  removeButton: {
    padding: 6,
  },
  favoritesSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  favoritesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    margin: 4,
  },
  favoriteChipDark: {
    backgroundColor: '#2C2C2C',
  },
  favoriteChipText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333333',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textLightGray: {
    color: '#BDBDBD',
  },
});

export default UnifiedSearchScreen;