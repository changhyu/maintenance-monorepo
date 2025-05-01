import React, { useCallback, useState } from 'react';
import { Button, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { loadShapefile, loadMultipleShapefiles } from '../utils/shpParser';
import { Node, RoadSegment } from '../types/navigation';
import { useNavigationStore } from '../stores/navigationStore';

type ShpMapLoaderProps = {
  onMapLoaded?: () => void;
};

export const ShpMapLoader: React.FC<ShpMapLoaderProps> = ({ onMapLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadStats, setLoadStats] = useState<{
    nodes: number;
    roadSegments: number;
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{
    [fileName: string]: { name: string; uri: string; type: string };
  }>({});

  const { setMapData } = useNavigationStore();

  // 파일 선택 처리
  const handleFileSelect = useCallback(async () => {
    try {
      // 파일 선택기 호출
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
        copyTo: 'cachesDirectory',
      });

      const newSelectedFiles = { ...selectedFiles };
      for (const result of results) {
        // .shp, .dbf, .shx 파일만 선택
        if (
          result.name.toLowerCase().endsWith('.shp') ||
          result.name.toLowerCase().endsWith('.dbf') ||
          result.name.toLowerCase().endsWith('.shx') ||
          result.name.toLowerCase().endsWith('.zip')
        ) {
          newSelectedFiles[result.name] = {
            name: result.name,
            uri: result.fileCopyUri || result.uri,
            type: result.type || 'application/octet-stream',
          };
        }
      }

      setSelectedFiles(newSelectedFiles);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // 사용자가 취소한 경우
        console.log('사용자가 파일 선택을 취소했습니다.');
      } else {
        console.error('파일 선택 오류:', err);
        setError((err as Error).message || '파일을 선택하는 중 오류가 발생했습니다.');
      }
    }
  }, [selectedFiles]);

  // ZIP 파일 로드 처리
  const handleLoadZipFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ZIP 파일 찾기
      const zipFile = Object.values(selectedFiles).find(
        (file) => file.name.toLowerCase().endsWith('.zip')
      );

      if (!zipFile) {
        throw new Error('ZIP 파일을 찾을 수 없습니다.');
      }

      // 파일 URI 가져오기
      const fileUri = zipFile.uri;
      if (!fileUri) {
        throw new Error('파일 URI를 가져올 수 없습니다.');
      }

      // ZIP 파일 내용 읽기
      const fileContent = await RNFS.readFile(fileUri, 'base64');

      // Shapefile 파싱
      const { nodes, roadSegments } = await loadShapefile(fileContent, zipFile.name);

      // 네비게이션 스토어에 데이터 저장
      setMapData({ nodes, roadSegments });

      // 통계 업데이트
      setLoadStats({
        nodes: nodes.length,
        roadSegments: roadSegments.length,
      });

      // 콜백 호출
      if (onMapLoaded) {
        onMapLoaded();
      }
    } catch (err) {
      console.error('ZIP 파일 로드 오류:', err);
      setError((err as Error).message || 'ZIP 파일을 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedFiles, setMapData, onMapLoaded]);

  // 개별 SHP/DBF 파일 로드 처리
  const handleLoadShpFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // SHP, DBF 파일 찾기
      const shpFiles = Object.values(selectedFiles).filter(
        (file) => file.name.toLowerCase().endsWith('.shp')
      );

      if (shpFiles.length === 0) {
        throw new Error('SHP 파일을 찾을 수 없습니다.');
      }

      // 모든 파일을 로드하여 처리
      const files = await Promise.all(
        Object.values(selectedFiles).map(async (file) => {
          const content = await RNFS.readFile(file.uri, 'base64');
          return { content, name: file.name };
        })
      );

      // 여러 파일을 함께 처리
      const { nodes, roadSegments } = await loadMultipleShapefiles(files);

      // 네비게이션 스토어에 데이터 저장
      setMapData({ nodes, roadSegments });

      // 통계 업데이트
      setLoadStats({
        nodes: nodes.length,
        roadSegments: roadSegments.length,
      });

      // 콜백 호출
      if (onMapLoaded) {
        onMapLoaded();
      }
    } catch (err) {
      console.error('SHP 파일 로드 오류:', err);
      setError((err as Error).message || 'SHP 파일을 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedFiles, setMapData, onMapLoaded]);

  // 한국 도로 지도 로드
  const handleLoadKoreanRoadMap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 폴더 지정
      const folderPath = RNFS.DocumentDirectoryPath + '/kmap_2024_120_korean_shp';
      
      // 폴더 체크
      const folderExists = await RNFS.exists(folderPath);
      if (!folderExists) {
        throw new Error('한국 지도 데이터 폴더(kmap_2024_120_korean_shp)를 찾을 수 없습니다.');
      }

      // 주요 파일 경로
      const roadShpPath = folderPath + '/KOR_ROAD_LS_국문.shp';
      const roadDbfPath = folderPath + '/KOR_ROAD_LS_국문.dbf';
      const railShpPath = folderPath + '/KOR_RAILW_LS_국문.shp';
      const railDbfPath = folderPath + '/KOR_RAILW_LS_국문.dbf';
      const poiShpPath = folderPath + '/KOR_PREMI_PS_국문.shp';
      const poiDbfPath = folderPath + '/KOR_PREMI_PS_국문.dbf';

      // 필수 파일 체크
      const roadShpExists = await RNFS.exists(roadShpPath);
      const roadDbfExists = await RNFS.exists(roadDbfPath);

      if (!roadShpExists || !roadDbfExists) {
        throw new Error('필수 도로 데이터 파일을 찾을 수 없습니다.');
      }

      // 파일 읽기
      const roadShpContent = await RNFS.readFile(roadShpPath, 'base64');
      const roadDbfContent = await RNFS.readFile(roadDbfPath, 'base64');

      // base64 디코딩 및 파일 객체 생성
      const roadShpFile = new File(
        [Buffer.from(roadShpContent, 'base64')],
        'KOR_ROAD_LS_국문.shp',
        { type: 'application/octet-stream' }
      );
      
      const roadDbfFile = new File(
        [Buffer.from(roadDbfContent, 'base64')],
        'KOR_ROAD_LS_국문.dbf',
        { type: 'application/octet-stream' }
      );

      // 도로 데이터 파싱
      const { nodes, roadSegments } = await loadMultipleShapefiles(roadShpFile, roadDbfFile);

      // 추가 파일이 있는 경우 처리
      let allNodes = [...nodes];
      let allRoadSegments = [...roadSegments];

      // 철도 데이터 처리
      const railShpExists = await RNFS.exists(railShpPath);
      const railDbfExists = await RNFS.exists(railDbfPath);

      if (railShpExists && railDbfExists) {
        const railShpContent = await RNFS.readFile(railShpPath, 'base64');
        const railDbfContent = await RNFS.readFile(railDbfPath, 'base64');
        
        const railShpFile = new File(
          [Buffer.from(railShpContent, 'base64')],
          'KOR_RAILW_LS_국문.shp',
          { type: 'application/octet-stream' }
        );
        
        const railDbfFile = new File(
          [Buffer.from(railDbfContent, 'base64')],
          'KOR_RAILW_LS_국문.dbf',
          { type: 'application/octet-stream' }
        );

        const railData = await loadMultipleShapefiles(railShpFile, railDbfFile);
        allNodes.push(...railData.nodes);
        allRoadSegments.push(...railData.roadSegments);
      }

      // POI 데이터 처리
      const poiShpExists = await RNFS.exists(poiShpPath);
      const poiDbfExists = await RNFS.exists(poiDbfPath);

      if (poiShpExists && poiDbfExists) {
        const poiShpContent = await RNFS.readFile(poiShpPath, 'base64');
        const poiDbfContent = await RNFS.readFile(poiDbfPath, 'base64');
        
        const poiShpFile = new File(
          [Buffer.from(poiShpContent, 'base64')],
          'KOR_PREMI_PS_국문.shp',
          { type: 'application/octet-stream' }
        );
        
        const poiDbfFile = new File(
          [Buffer.from(poiDbfContent, 'base64')],
          'KOR_PREMI_PS_국문.dbf',
          { type: 'application/octet-stream' }
        );

        const poiData = await loadMultipleShapefiles(poiShpFile, poiDbfFile);
        allNodes.push(...poiData.nodes);
      }

      // 네비게이션 스토어에 데이터 저장
      setMapData({ nodes: allNodes, roadSegments: allRoadSegments });

      // 통계 업데이트
      setLoadStats({
        nodes: allNodes.length,
        roadSegments: allRoadSegments.length,
      });

      // 콜백 호출
      if (onMapLoaded) {
        onMapLoaded();
      }
    } catch (err) {
      console.error('한국 도로 지도 로드 오류:', err);
      setError((err as Error).message || '한국 도로 지도를 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [setMapData, onMapLoaded]);

  // 선택된 파일 삭제 처리
  const handleRemoveFile = useCallback(
    (fileName: string) => {
      const newSelectedFiles = { ...selectedFiles };
      delete newSelectedFiles[fileName];
      setSelectedFiles(newSelectedFiles);
    },
    [selectedFiles]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shapefile 지도 로더</Text>

      <Button title="파일 선택" onPress={handleFileSelect} disabled={loading} />

      {Object.keys(selectedFiles).length > 0 && (
        <ScrollView style={styles.fileList}>
          {Object.values(selectedFiles).map((file) => (
            <View key={file.name} style={styles.fileItem}>
              <Text style={styles.fileName}>{file.name}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveFile(file.name)}
                disabled={loading}
              >
                <Text style={styles.removeButton}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.loadButton, Object.keys(selectedFiles).length === 0 && styles.disabledButton]}
          onPress={handleLoadShpFiles}
          disabled={loading || Object.keys(selectedFiles).length === 0}
        >
          <Text style={styles.buttonText}>SHP 파일 로드</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loadButton, !Object.values(selectedFiles).some(file => file.name.toLowerCase().endsWith('.zip')) && styles.disabledButton]}
          onPress={handleLoadZipFile}
          disabled={loading || !Object.values(selectedFiles).some(file => file.name.toLowerCase().endsWith('.zip'))}
        >
          <Text style={styles.buttonText}>ZIP 파일 로드</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.koreanMapButton, loading && styles.disabledButton]}
        onPress={handleLoadKoreanRoadMap}
        disabled={loading}
      >
        <Text style={styles.buttonText}>한국 도로 지도 로드</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>지도 데이터 로드 중...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>오류: {error}</Text>
        </View>
      )}

      {loadStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            불러온 데이터: {loadStats.nodes}개의 노드, {loadStats.roadSegments}개의 도로 세그먼트
          </Text>
        </View>
      )}
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
  fileList: {
    maxHeight: 150,
    marginTop: 12,
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    marginVertical: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
  },
  removeButton: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  loadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    flex: 0.48,
    alignItems: 'center',
  },
  koreanMapButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
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
    backgroundColor: '#ffeeee',
    borderRadius: 4,
  },
  errorText: {
    color: '#ff0000',
  },
  statsContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#eeffee',
    borderRadius: 4,
  },
  statsText: {
    color: '#007700',
  },
}); 