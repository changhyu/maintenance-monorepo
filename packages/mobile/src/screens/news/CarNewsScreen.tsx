import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  summary: string;
  imageUrl: string;
  source: string;
}

const DUMMY_NEWS: NewsItem[] = [
  {
    id: '1',
    title: '현대자동차, 새로운 전기차 모델 출시',
    date: '2023-11-10',
    summary: '현대자동차에서 새로운 전기차 모델을 발표했습니다. 이번 모델은 한 번 충전으로 600km 주행이 가능합니다.',
    imageUrl: 'https://via.placeholder.com/150',
    source: '자동차 뉴스'
  },
  {
    id: '2',
    title: '자율주행 기술의 발전, 어디까지 왔나',
    date: '2023-11-05',
    summary: '최근 자율주행 기술이 급속도로 발전하고 있습니다. 전문가들은 5년 내에 완전 자율주행이 가능할 것으로 전망합니다.',
    imageUrl: 'https://via.placeholder.com/150',
    source: '테크 인사이트'
  },
  {
    id: '3',
    title: '자동차 정비 비용, 어떻게 절약할 수 있을까',
    date: '2023-10-28',
    summary: '자동차 정비 비용을 절약하는 방법에 대해 알아봅니다. 정기적인 점검만으로도 큰 비용을 절약할 수 있습니다.',
    imageUrl: 'https://via.placeholder.com/150',
    source: '자동차 라이프'
  }
];

const CarNewsScreen = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // 실제로는 API에서 데이터를 가져오는 로직이 들어갈 자리
    loadNews();
  }, []);

  const loadNews = () => {
    // 더미 데이터로 대체, 실제로는 API 호출
    setNews(DUMMY_NEWS);
  };

  const onRefresh = () => {
    setRefreshing(true);
    // 새로고침 로직
    loadNews();
    setRefreshing(false);
  };

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity
      style={styles.newsItem}
      onPress={() => {
        // 뉴스 상세 화면으로 이동할 때 사용할 수 있음
        // navigation.navigate('NewsDetail', { id: item.id });
        alert(item.summary);
      }}
    >
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle}>{item.title}</Text>
        <Text style={styles.newsSummary} numberOfLines={2}>
          {item.summary}
        </Text>
        <View style={styles.newsFooter}>
          <Text style={styles.newsSource}>{item.source}</Text>
          <Text style={styles.newsDate}>{item.date}</Text>
        </View>
      </View>
      <Image source={{ uri: item.imageUrl }} style={styles.newsImage} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={news}
        renderItem={renderNewsItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>뉴스 정보가 없습니다.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  newsItem: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    flexDirection: 'row',
  },
  newsContent: {
    flex: 1,
    marginRight: 10,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  newsSummary: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  newsDate: {
    fontSize: 12,
    color: '#888',
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default CarNewsScreen; 