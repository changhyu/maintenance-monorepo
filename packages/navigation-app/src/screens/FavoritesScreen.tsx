import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import favoritesService, { FavoriteLocation } from '../services/FavoritesService';
import navigationService from '../services/NavigationService';

export const FavoritesScreen: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState<FavoriteLocation | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');

  // 즐겨찾기 목록 로드
  useEffect(() => {
    const unsubscribe = favoritesService.addListener((updatedFavorites) => {
      setFavorites(updatedFavorites);
    });

    return unsubscribe;
  }, []);

  // 즐겨찾기 열기 (내비게이션 시작)
  const handleNavigateToFavorite = (favorite: FavoriteLocation) => {
    navigationService.startNavigation({
      latitude: favorite.latitude,
      longitude: favorite.longitude,
      name: favorite.name,
      address: favorite.address
    });
  };

  // 즐겨찾기 편집
  const handleEditFavorite = (favorite: FavoriteLocation) => {
    setEditingFavorite(favorite);
    setName(favorite.name);
    setDescription(favorite.description || '');
    setCategory(favorite.category || '');
    setAddress(favorite.address || '');
    setModalVisible(true);
  };

  // 즐겨찾기 삭제
  const handleDeleteFavorite = (favorite: FavoriteLocation) => {
    Alert.alert(
      '즐겨찾기 삭제',
      `"${favorite.name}" 즐겨찾기를 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive', 
          onPress: async () => {
            await favoritesService.deleteFavorite(favorite.id);
          } 
        }
      ]
    );
  };

  // 새 즐겨찾기 추가 또는 기존 즐겨찾기 수정
  const handleSaveFavorite = async () => {
    if (!name.trim()) {
      Alert.alert('오류', '이름은 필수 입력 항목입니다.');
      return;
    }

    try {
      if (editingFavorite) {
        // 기존 즐겨찾기 수정
        await favoritesService.updateFavorite({
          ...editingFavorite,
          name,
          description,
          category,
          address
        });
      } else {
        // 현재 위치 정보 가져오기 (실제로는 위치 서비스에서 가져와야 함)
        const currentLocation = await navigationService.getCurrentLocation();
        
        // 새 즐겨찾기 추가
        await favoritesService.addFavorite({
          name,
          description,
          category,
          address,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        });
      }

      // 모달 닫고 입력 폼 초기화
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('즐겨찾기 저장 중 오류 발생:', error);
      Alert.alert('오류', '즐겨찾기를 저장하는 중 문제가 발생했습니다.');
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setAddress('');
    setEditingFavorite(null);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  // 새 즐겨찾기 추가 모달 열기
  const handleAddNewFavorite = () => {
    resetForm();
    setModalVisible(true);
  };

  // 카테고리 아이콘 매핑
  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'home': return 'home';
      case 'work': return 'work';
      case 'restaurant': return 'restaurant';
      case 'shopping': return 'shopping-cart';
      case 'entertainment': return 'local-movies';
      default: return 'star';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>즐겨찾기</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNewFavorite}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 즐겨찾기 목록 */}
      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.favoriteItem}
              onPress={() => handleNavigateToFavorite(item)}
            >
              <Icon 
                name={getCategoryIcon(item.category)} 
                size={24} 
                color="#4285F4" 
                style={styles.favoriteIcon} 
              />
              <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteName}>{item.name}</Text>
                {item.address && (
                  <Text style={styles.favoriteAddress} numberOfLines={1}>{item.address}</Text>
                )}
                {item.description && (
                  <Text style={styles.favoriteDescription} numberOfLines={1}>{item.description}</Text>
                )}
              </View>
              <View style={styles.favoriteActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditFavorite(item)}
                >
                  <Icon name="edit" size={20} color="#757575" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteFavorite(item)}
                >
                  <Icon name="delete" size={20} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="bookmark-border" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>즐겨찾기가 없습니다.</Text>
          <Text style={styles.emptySubText}>
            자주 방문하는 장소를 즐겨찾기로 추가하세요.
          </Text>
        </View>
      )}

      {/* 즐겨찾기 추가/수정 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFavorite ? '즐겨찾기 수정' : '새 즐겨찾기 추가'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Icon name="close" size={24} color="#757575" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="이름 (필수)"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="설명 (선택)"
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="카테고리 (예: 집, 회사, 식당)"
              value={category}
              onChangeText={setCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="주소 (선택)"
              value={address}
              onChangeText={setAddress}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveFavorite}
            >
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  addButton: {
    backgroundColor: '#4285F4',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  favoriteIcon: {
    marginRight: 16,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  favoriteAddress: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 2,
  },
  favoriteDescription: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  favoriteActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FavoritesScreen;