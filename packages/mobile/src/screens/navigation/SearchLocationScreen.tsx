import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LocationPoint, searchLocationByText, getSavedLocations, getRecentLocations } from '../../services/LocationService';

type SearchLocationRouteProp = RouteProp<RootStackParamList, 'SearchLocation'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SearchLocation'>;

const SearchLocationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SearchLocationRouteProp>();
  const { purpose } = route.params;
  
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<LocationPoint[]>([]);
  const [savedLocations, setSavedLocations] = useState<LocationPoint[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 저장된 위치와 최근 방문 위치 가져오기
    setSavedLocations(getSavedLocations());
    setRecentLocations(getRecentLocations());
  }, []);

  // 검색 처리
  const handleSearch = async () => {
    if (searchText.trim().length === 0) {
      return;
    }

    setLoading(true);
    try {
      const results = await searchLocationByText(searchText);
      setSearchResults(results);
    } catch (error) {
      console.error('위치 검색 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };

  // 위치 선택 처리
  const handleSelectLocation = (location: LocationPoint) => {
    // 이전 화면으로 돌아가면서 선택한 위치 전달
    if (purpose === 'origin') {
      navigation.navigate('NavigationRoute', { origin: location });
    } else {
      navigation.navigate('NavigationRoute', { destination: location });
    }
  };

  return (
    <View style={styles.container}>
      {/* 검색 입력 영역 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={purpose === 'origin' ? '출발지 검색' : '목적지 검색'}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <MaterialIcons name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* 로딩 표시 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
        </View>
      )}

      {/* 검색 결과 목록 */}
      {searchResults.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>검색 결과</Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => `search-${index}-${item.latitude}-${item.longitude}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.locationItem}
                onPress={() => handleSelectLocation(item)}
              >
                <MaterialIcons name="place" size={24} color="#0066FF" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{item.name}</Text>
                  <Text style={styles.locationAddress}>
                    {`위도: ${item.latitude.toFixed(4)}, 경도: ${item.longitude.toFixed(4)}`}
                  </Text>
                </View>
                <MaterialIcons name="navigate-next" size={24} color="#999" />
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <View style={styles.listContainer}>
          {/* 저장된 장소 목록 */}
          {savedLocations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>저장된 장소</Text>
              <FlatList
                data={savedLocations}
                keyExtractor={(item, index) => `saved-${index}-${item.latitude}-${item.longitude}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.locationItem}
                    onPress={() => handleSelectLocation(item)}
                  >
                    <MaterialIcons name="star" size={24} color="#FFB400" />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{item.name}</Text>
                      <Text style={styles.locationAddress}>
                        {`위도: ${item.latitude.toFixed(4)}, 경도: ${item.longitude.toFixed(4)}`}
                      </Text>
                    </View>
                    <MaterialIcons name="navigate-next" size={24} color="#999" />
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {/* 최근 방문 장소 목록 */}
          {recentLocations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>최근 방문 장소</Text>
              <FlatList
                data={recentLocations}
                keyExtractor={(item, index) => `recent-${index}-${item.latitude}-${item.longitude}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.locationItem}
                    onPress={() => handleSelectLocation(item)}
                  >
                    <MaterialIcons name="history" size={24} color="#888" />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{item.name}</Text>
                      <Text style={styles.locationAddress}>
                        {`위도: ${item.latitude.toFixed(4)}, 경도: ${item.longitude.toFixed(4)}`}
                      </Text>
                    </View>
                    <MaterialIcons name="navigate-next" size={24} color="#999" />
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {/* 검색 안내 메시지 */}
          {!loading && searchText.length === 0 && (
            <Text style={styles.searchHint}>
              장소 이름이나 주소를 입력하여 검색하세요.
            </Text>
          )}

          {/* 검색 결과 없음 표시 */}
          {!loading && searchText.length > 0 && searchResults.length === 0 && (
            <View style={styles.noResultsContainer}>
              <MaterialIcons name="search-off" size={48} color="#ccc" />
              <Text style={styles.noResultsText}>검색 결과가 없습니다.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#0066FF',
    marginLeft: 8,
    borderRadius: 8,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  listContainer: {
    flex: 1,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchHint: {
    fontSize: 16,
    color: '#888',
    marginHorizontal: 16,
    marginTop: 24,
    textAlign: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default SearchLocationScreen; 