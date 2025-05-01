import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import SearchService, { SearchResult, RecentSearch } from '../services/SearchService';
import { useTheme } from '../themes/ThemeContext';
import { getCurrentLocation } from '../services/LocationService';
import { GeoPoint } from '../types';

const CATEGORIES = [
  { id: 'all', name: '전체', icon: 'apps' },
  { id: '교통', name: '교통', icon: 'subway' },
  { id: '관광', name: '관광', icon: 'earth' },
  { id: '쇼핑', name: '쇼핑', icon: 'cart' },
  { id: '자연', name: '자연', icon: 'leaf' },
  { id: '여가', name: '여가', icon: 'cafe' },
];

const SearchScreen = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);

  useEffect(() => {
    loadRecentSearches();
    initLocation();
  }, []);

  useEffect(() => {
    if (query.trim()) {
      const getSuggestions = setTimeout(() => {
        setSuggestions(SearchService.getSuggestions(query));
      }, 300);

      return () => clearTimeout(getSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const initLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.error('위치를 가져오는데 실패했습니다:', error);
    }
  };

  const loadRecentSearches = () => {
    const searches = SearchService.getRecentSearches();
    setRecentSearches(searches);
  };

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    Keyboard.dismiss();

    try {
      const filter = selectedCategory !== 'all' ? { category: selectedCategory } : undefined;
      const searchResults = await SearchService.search(searchQuery, currentLocation, filter);
      setResults(searchResults);
      loadRecentSearches(); // 최근 검색어 목록 갱신
    } catch (error) {
      console.error('검색 중 오류 발생:', error);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
  };

  const removeRecentSearch = async (id: string) => {
    await SearchService.removeRecentSearch(id);
    loadRecentSearches();
  };

  const clearAllRecentSearches = async () => {
    await SearchService.clearRecentSearches();
    loadRecentSearches();
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (query.trim()) {
      handleSearch();
    }
  };

  const handleResultPress = (item: SearchResult) => {
    navigation.navigate('SearchResultDetail', { item });
  };

  // 카테고리 렌더링
  const renderCategories = () => (
    <FlatList
      data={CATEGORIES}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      style={styles.categoriesList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.categoryItem,
            selectedCategory === item.id && { 
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => handleCategorySelect(item.id)}
        >
          <Ionicons
            name={item.icon as any}
            size={20}
            color={selectedCategory === item.id ? colors.white : colors.text}
          />
          <Text
            style={[
              styles.categoryName,
              { color: selectedCategory === item.id ? colors.white : colors.text },
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  // 검색 결과 렌더링
  const renderSearchResults = () => {
    if (searching) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (results.length === 0 && query.trim()) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textLight} />
          <Text style={[styles.noResultsText, { color: colors.textLight }]}>
            검색 결과가 없습니다
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultItem}
            onPress={() => handleResultPress(item)}
          >
            <View style={styles.resultIconContainer}>
              <Ionicons
                name={getCategoryIcon(item.category)}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.resultContent}>
              <Text style={[styles.resultName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.resultAddress, { color: colors.textLight }]}>
                {item.address}
              </Text>
              {item.distance !== undefined && (
                <Text style={[styles.resultDistance, { color: colors.textLight }]}>
                  {formatDistance(item.distance)}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      />
    );
  };

  // 최근 검색어 렌더링
  const renderRecentSearches = () => {
    if (recentSearches.length === 0) {
      return (
        <View style={styles.emptyRecentContainer}>
          <Text style={[styles.emptyRecentText, { color: colors.textLight }]}>
            최근 검색 기록이 없습니다
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.recentSearchesContainer}>
        <View style={styles.recentSearchesHeader}>
          <Text style={[styles.recentSearchesTitle, { color: colors.text }]}>
            최근 검색어
          </Text>
          <TouchableOpacity onPress={clearAllRecentSearches}>
            <Text style={[styles.clearAllText, { color: colors.primary }]}>
              모두 지우기
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={recentSearches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recentSearchItem}>
              <TouchableOpacity
                style={styles.recentSearchTextContainer}
                onPress={() => {
                  setQuery(item.query);
                  handleSearch(item.query);
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.textLight}
                  style={styles.recentSearchIcon}
                />
                <Text style={[styles.recentSearchText, { color: colors.text }]}>
                  {item.query}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeRecentSearch(item.id)}
                style={styles.removeIconContainer}
              >
                <Ionicons name="close" size={18} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    );
  };

  // 검색어 제안 렌더링
  const renderSuggestions = () => {
    if (suggestions.length === 0 || !query.trim()) {
      return null;
    }

    return (
      <View style={[styles.suggestionsContainer, { backgroundColor: colors.card }]}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionItem}
            onPress={() => {
              setQuery(suggestion);
              handleSearch(suggestion);
            }}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.primary}
              style={styles.suggestionIcon}
            />
            <Text style={[styles.suggestionText, { color: colors.text }]}>
              {suggestion}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBarContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="장소, 주소 검색"
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderCategories()}
      {renderSuggestions()}

      {query.trim() && results.length > 0 ? (
        renderSearchResults()
      ) : !query.trim() ? (
        renderRecentSearches()
      ) : (
        renderSearchResults()
      )}
    </View>
  );
};

// 카테고리에 따른 아이콘 반환
const getCategoryIcon = (category?: string): string => {
  switch (category) {
    case '교통':
      return 'subway-outline';
    case '관광':
      return 'earth-outline';
    case '쇼핑':
      return 'cart-outline';
    case '자연':
      return 'leaf-outline';
    case '여가':
      return 'cafe-outline';
    default:
      return 'location-outline';
  }
};

// 거리 포맷팅 (미터 -> km 또는 m)
const formatDistance = (distance: number): string => {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`;
  }
  return `${Math.round(distance)}m`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 6,
  },
  categoriesList: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryName: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14,
    marginBottom: 2,
  },
  resultDistance: {
    fontSize: 13,
  },
  recentSearchesContainer: {
    flex: 1,
    padding: 10,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  recentSearchTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentSearchIcon: {
    marginRight: 10,
  },
  recentSearchText: {
    fontSize: 15,
  },
  removeIconContainer: {
    padding: 5,
  },
  emptyRecentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyRecentText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default SearchScreen;