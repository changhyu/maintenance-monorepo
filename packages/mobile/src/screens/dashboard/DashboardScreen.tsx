import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>안녕하세요!</Text>
          <Text style={styles.nameText}>홍길동님</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 주행 요약 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>주행 요약</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12,345km</Text>
              <Text style={styles.statLabel}>총 주행거리</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>125km</Text>
              <Text style={styles.statLabel}>이번 달 주행</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>9.8L</Text>
              <Text style={styles.statLabel}>평균 연비</Text>
            </View>
          </View>
        </View>

        {/* 바로가기 버튼 */}
        <View style={styles.shortcutsContainer}>
          <TouchableOpacity 
            style={styles.shortcutButton}
            onPress={() => navigation.navigate('VehicleList')}
          >
            <Ionicons name="car-outline" size={28} color="#4285F4" />
            <Text style={styles.shortcutText}>내 차량</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shortcutButton}
            onPress={() => navigation.navigate('MaintenanceList')}
          >
            <Ionicons name="construct-outline" size={28} color="#DB4437" />
            <Text style={styles.shortcutText}>정비 기록</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shortcutButton}
            onPress={() => navigation.navigate('Navigation')}
          >
            <Ionicons name="navigate-outline" size={28} color="#0F9D58" />
            <Text style={styles.shortcutText}>네비게이션</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shortcutButton}
            onPress={() => navigation.navigate('CachePerformance')}
          >
            <Ionicons name="speedometer-outline" size={28} color="#F4B400" />
            <Text style={styles.shortcutText}>캐시 분석</Text>
          </TouchableOpacity>
        </View>

        {/* 알림 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>알림</Text>
          <TouchableOpacity style={styles.notificationItem}>
            <Ionicons name="alert-circle-outline" size={24} color="#DB4437" />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>정기 점검 예정</Text>
              <Text style={styles.notificationText}>3일 후에 정기 점검이 예정되어 있습니다.</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.notificationItem}>
            <Ionicons name="information-circle-outline" size={24} color="#4285F4" />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>오일 교체 필요</Text>
              <Text style={styles.notificationText}>엔진 오일 교체를 권장합니다.</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 뉴스 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>자동차 뉴스</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CarNews')}>
              <Text style={styles.seeMoreText}>더보기</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.newsItem}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100' }}
              style={styles.newsImage}
            />
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle}>전기차 보조금 정책 변경</Text>
              <Text style={styles.newsDescription}>2023년 전기차 보조금 지급 정책이 변경되었습니다.</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  seeMoreText: {
    fontSize: 14,
    color: '#4285F4',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  shortcutsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginTop: 12,
  },
  shortcutButton: {
    backgroundColor: 'white',
    width: '48%',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shortcutText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationContent: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  notificationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  newsContent: {
    marginLeft: 12,
    flex: 1,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  newsDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default DashboardScreen; 