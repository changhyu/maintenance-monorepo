import React, { useCallback, useState, useEffect } from 'react';
import { Button, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { loadDxfFile } from '../utils/dxfParser';
import { Node, RoadSegment } from '../types/navigation';
import { useNavigationStore } from '../stores/navigationStore';
import offlineMapService from '../services/OfflineMapService';
import { MapCacheInfo } from '../services/OfflineMapService';

type DxfMapLoaderProps = {
  onMapLoaded?: () => void;
};

export const DxfMapLoader: React.FC<DxfMapLoaderProps> = ({ onMapLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadStats, setLoadStats] = useState<{
    nodes: number;
    roadSegments: number;
  } | null>(null);
  const [cacheInfo, setCacheInfo] = useState<MapCacheInfo | null>(null);
  const [cacheList, setCacheList] = useState<Record<string, MapCacheInfo>>({});
  const [checkingCache, setCheckingCache] = useState(false);

  const { setMapData } = useNavigationStore();

  useEffect(() => {
    checkCache();
  }, []);

  const checkCache = useCallback(async () => {
    setCheckingCache(true);
    try {
      const info = await offlineMapService.getCacheInfo();
      setCacheInfo(info);

      const list = await offlineMapService.getCacheList();
      setCacheList(list);
    } catch (error) {
      console.error('캐시 확인 중 오류:', error);
    } finally {
      setCheckingCache(false);
    }
  }, []);

  const loadFromCache = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mapData = await offlineMapService.loadMapData();

      if (!mapData) {
        throw new Error('캐시된 지도 데이터가 없습니다.');
      }

      setMapData(mapData);

      setLoadStats({
        nodes: mapData.nodes.length,
        roadSegments: mapData.roadSegments.length,
      });

      if (onMapLoaded) {
        onMapLoaded();
      }
    } catch (err) {
      console.error('캐시 로드 오류:', err);
      setError((err as Error).message || '캐시 로드 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [setMapData, onMapLoaded]);

  const handleDxfFileLoad = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const fileUri = result[0].fileCopyUri || result[0].uri;
      if (!fileUri) {
        throw new Error('파일 URI를 가져올 수 없습니다.');
      }

      if (!fileUri.toLowerCase().endsWith('.dxf')) {
        throw new Error('DXF 파일만 지원합니다.');
      }

      const fileContent = await RNFS.readFile(fileUri, 'utf8');

      const { nodes, roadSegments } = await loadDxfFile(new File([fileContent], result[0].name));

      setMapData({ nodes, roadSegments });

      const filename = result[0].name.replace('.dxf', '');
      await offlineMapService.saveMapData(nodes, roadSegments, filename);

      await checkCache();

      setLoadStats({
        nodes: nodes.length,
        roadSegments: roadSegments.length,
      });

      if (onMapLoaded) {
        onMapLoaded();
      }
    } catch (err) {
      console.error('DXF 파일 로드 오류:', err);
      setError((err as Error).message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [setMapData, onMapLoaded, checkCache]);

  const handleClearCache = useCallback(async () => {
    try {
      setLoading(true);
      await offlineMapService.clearCache();
      setCacheInfo(null);
      setCacheList({});
      setLoadStats(null);
      setError(null);

      setError('캐시가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('캐시 삭제 오류:', error);
      setError('캐시 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSpecificCache = useCallback(async (name: string) => {
    try {
      setLoading(true);
      setError(null);

      const mapData = await offlineMapService.loadMapData();

      if (!mapData) {
        throw new Error(`'${name}' 지도 데이터를 로드할 수 없습니다.`);
      }

      setMapData(mapData);

      setLoadStats({
        nodes: mapData.nodes.length,
        roadSegments: mapData.roadSegments.length,
      });

      if (onMapLoaded) {
        onMapLoaded();
      }
    } catch (err) {
      console.error('캐시 로드 오류:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setMapData, onMapLoaded]);

  const renderCacheList = () => {
    if (Object.keys(cacheList).length === 0) {
      return null;
    }

    return (
      <View style={styles.cacheListContainer}>
        <Text style={styles.cacheListTitle}>캐시된 지도 목록</Text>
        {Object.entries(cacheList).map(([name, info]) => (
          <TouchableOpacity
            key={name}
            style={styles.cacheItem}
            onPress={() => loadSpecificCache(name)}
          >
            <Text style={styles.cacheItemName}>{name}</Text>
            <Text style={styles.cacheItemInfo}>
              {`${info.nodeCount}개 노드, ${info.roadSegmentCount}개 도로`}
            </Text>
            <Text style={styles.cacheItemDate}>
              {new Date(info.timestamp).toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DXF 지도 로더</Text>

      {cacheInfo && (
        <View style={styles.cacheInfoContainer}>
          <Text style={styles.cacheInfoText}>
            캐시된 지도: {cacheInfo.name} ({new Date(cacheInfo.timestamp).toLocaleDateString()})
          </Text>
          <Button
            title="캐시에서 로드"
            onPress={loadFromCache}
            disabled={loading || !cacheInfo}
          />
        </View>
      )}

      <View style={styles.buttonGroup}>
        <View style={styles.buttonContainer}>
          <Button
            title="DXF 파일 불러오기"
            onPress={handleDxfFileLoad}
            disabled={loading}
          />
        </View>

        {(cacheInfo || Object.keys(cacheList).length > 0) && (
          <View style={styles.buttonContainer}>
            <Button
              title="캐시 삭제"
              onPress={handleClearCache}
              disabled={loading || (!cacheInfo && Object.keys(cacheList).length === 0)}
              color="#FF6666"
            />
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>
            {checkingCache ? "캐시 확인 중..." : "DXF 파일 로드 중..."}
          </Text>
        </View>
      )}

      {error && (
        <View style={[styles.errorContainer, error.includes('성공') ? styles.successContainer : null]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loadStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            불러온 데이터: {loadStats.nodes}개의 노드, {loadStats.roadSegments}개의 도로 세그먼트
          </Text>
        </View>
      )}

      {renderCacheList()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#0000ff',
  },
  errorContainer: {
    marginTop: 16,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#ffeeee',
  },
  successContainer: {
    backgroundColor: '#eeffee',
  },
  errorText: {
    color: '#cc0000',
  },
  statsContainer: {
    marginTop: 16,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#eeeeff',
  },
  statsText: {
    color: '#000088',
  },
  cacheInfoContainer: {
    marginBottom: 16,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#e0f0ff',
  },
  cacheInfoText: {
    marginBottom: 8,
    color: '#0066cc',
  },
  cacheListContainer: {
    marginTop: 16,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  cacheListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cacheItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  cacheItemName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cacheItemInfo: {
    fontSize: 13,
    color: '#666',
  },
  cacheItemDate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  }
});