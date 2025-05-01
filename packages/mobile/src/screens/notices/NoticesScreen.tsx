import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface Notice {
  id: string;
  title: string;
  date: string;
  content: string;
}

const DUMMY_NOTICES: Notice[] = [
  {
    id: '1',
    title: '시스템 업데이트 안내',
    date: '2023-11-01',
    content: '새로운 기능이 추가되었습니다. 앱을 최신 버전으로 업데이트해 주세요.'
  },
  {
    id: '2',
    title: '정비 예약 서비스 오픈',
    date: '2023-10-15',
    content: '이제 앱에서 정비 예약을 할 수 있습니다. 더 편리한 서비스를 이용해보세요.'
  },
  {
    id: '3',
    title: '연말 정비 할인 이벤트',
    date: '2023-12-01',
    content: '연말을 맞아 정비 서비스 10% 할인 이벤트를 진행합니다.'
  }
];

const NoticesScreen = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // 실제로는 API에서 데이터를 가져오는 로직이 들어갈 자리
    loadNotices();
  }, []);

  const loadNotices = () => {
    // 더미 데이터로 대체, 실제로는 API 호출
    setNotices(DUMMY_NOTICES);
  };

  const onRefresh = () => {
    setRefreshing(true);
    // 새로고침 로직
    loadNotices();
    setRefreshing(false);
  };

  const renderNoticeItem = ({ item }: { item: Notice }) => (
    <TouchableOpacity
      style={styles.noticeItem}
      onPress={() => {
        // 공지사항 상세 화면으로 이동할 때 사용할 수 있음
        // navigation.navigate('NoticeDetail', { id: item.id });
        alert(item.content);
      }}
    >
      <Text style={styles.noticeTitle}>{item.title}</Text>
      <Text style={styles.noticeDate}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notices}
        renderItem={renderNoticeItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>공지사항이 없습니다.</Text>
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
  noticeItem: {
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
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noticeDate: {
    fontSize: 12,
    color: '#666',
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

export default NoticesScreen; 