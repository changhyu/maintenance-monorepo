import { GeoPoint, Node, RoadSegment } from '../types';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 오프라인 지도 캐시 상태 타입
export type OfflineMapStatus = 'none' | 'downloading' | 'available' | 'outdated' | 'error';

// 오프라인 지도 지역 정보
export interface OfflineRegion {
  id: string;
  name: string;
  bounds: {
    northeast: GeoPoint;
    southwest: GeoPoint;
  };
  sizeInMB: number;
  status: OfflineMapStatus;
  downloadProgress?: number;
  lastUpdated?: number;
}

// 자동 업데이트 설정 타입
export interface AutoUpdateSettings {
  enabled: boolean;
  wifiOnly: boolean;
  updateInterval: 'daily' | 'weekly' | 'monthly' | 'never';
  timeOfDay: string; // HH:MM 형식
  lastAutoCheck: number; // 마지막 자동 체크 시간 (타임스탬프)
}

// 지도 타일 정보
export interface MapTile {
  z: number;  // 줌 레벨
  x: number;  // X 좌표
  y: number;  // Y 좌표
  url: string; // 타일 URL
  path?: string; // 로컬 저장 경로
}

// 다운로드 진행 리스너
export type DownloadProgressListener = (regionId: string, progress: number) => void;

/**
 * 지도 데이터의 캐시 정보
 */
export interface MapCacheInfo {
  timestamp: number;
  size: number;
  name: string;
  nodeCount: number;
  roadSegmentCount: number;
}

/**
 * 오프라인 지도 관리 서비스
 */
class OfflineMapService {
  private readonly regions: Map<string, OfflineRegion> = new Map();
  private readonly storage: Storage = localStorage;
  private readonly storageKey = 'offline_map_regions';
  private readonly tileStorageKey = 'offline_map_tiles';
  private progressListeners: DownloadProgressListener[] = [];
  private downloadQueue: string[] = [];
  private isDownloading: boolean = false;
  private readonly maxConcurrentDownloads: number = 1;
  private maxCacheSize: number = 2000; // 기본 2GB 제한
  private readonly tileServerUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  private readonly maxZoom = 18;
  private readonly minZoom = 10;
  private readonly tileBasePath = FileSystem.documentDirectory + 'map_tiles/';
  
  // 자동 업데이트 관련 설정
  private autoUpdateSettings: AutoUpdateSettings = {
    enabled: false,
    wifiOnly: true,
    updateInterval: 'weekly',
    timeOfDay: '02:00', // 기본값: 새벽 2시
    lastAutoCheck: 0
  };
  private readonly autoUpdateSettingsKey = 'offline_map_autoupdate';
  private autoUpdateCheckInterval: any = null;

  // 캐시 키 상수
  private readonly MAP_DATA_KEY = '@navigation_app/map_data';
  private readonly MAP_INFO_KEY = '@navigation_app/map_info';
  private readonly MAP_CACHE_LIST_KEY = '@navigation_app/map_cache_list';

  /**
   * 서비스 초기화 시 저장된 지역 정보와 자동 업데이트 설정을 로드
   */
  constructor() {
    this.loadStoredRegions();
    this.loadAutoUpdateSettings();
    this.setupAutoUpdateChecker();
  }

  /**
   * 타일 저장 디렉토리 확인 및 생성
   */
  public async initializeFileSystem(): Promise<void> {
    await this.ensureTileDirectoryExists();
  }
  
  /**
   * 저장된 지역 목록 로드
   */
  private loadStoredRegions(): void {
    try {
      const storedRegions = this.storage.getItem(this.storageKey);
      if (storedRegions) {
        const regions: OfflineRegion[] = JSON.parse(storedRegions);
        regions.forEach(region => {
          this.regions.set(region.id, region);
        });
      }
    } catch (error) {
      console.error('오프라인 지도 지역 로드 실패:', error);
    }
  }
  
  /**
   * 지역 목록 저장
   */
  private saveRegions(): void {
    try {
      const regionsArray = Array.from(this.regions.values());
      this.storage.setItem(this.storageKey, JSON.stringify(regionsArray));
    } catch (error) {
      console.error('오프라인 지도 지역 저장 실패:', error);
    }
  }
  
  /**
   * 타일 저장 디렉토리 확인 및 생성
   */
  private async ensureTileDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.tileBasePath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.tileBasePath, { intermediates: true });
        console.log('타일 저장 디렉토리 생성 완료');
      }
    } catch (error) {
      console.error('타일 디렉토리 생성 실패:', error);
    }
  }
  
  /**
   * 가용한 모든 오프라인 지역 목록 반환
   */
  public getAllRegions(): OfflineRegion[] {
    return Array.from(this.regions.values());
  }
  
  /**
   * 특정 지역 정보 가져오기
   */
  public getRegion(regionId: string): OfflineRegion | undefined {
    return this.regions.get(regionId);
  }
  
  /**
   * 지역 다운로드 요청
   */
  public downloadRegion(region: Omit<OfflineRegion, 'status' | 'downloadProgress'>): Promise<OfflineRegion> {
    // 이미 존재하는 지역 확인
    if (this.regions.has(region.id)) {
      const existingRegion = this.regions.get(region.id)!;
      if (existingRegion.status === 'downloading') {
        return Promise.reject(new Error('이미 다운로드 중인 지역입니다.'));
      }
      if (existingRegion.status === 'available') {
        return Promise.resolve(existingRegion);
      }
    }
    
    // 캐시 용량 확인
    const currentSize = this.getTotalCacheSize();
    if (currentSize + region.sizeInMB > this.maxCacheSize) {
      return Promise.reject(
        new Error(`캐시 용량 부족: ${this.maxCacheSize}MB 중 ${currentSize}MB 사용 중`)
      );
    }
    
    // 새 지역 추가
    const newRegion: OfflineRegion = {
      ...region,
      status: 'downloading',
      downloadProgress: 0,
    };
    
    this.regions.set(region.id, newRegion);
    this.saveRegions();
    
    // 다운로드 큐에 추가
    this.downloadQueue.push(region.id);
    this.processDownloadQueue();
    
    return new Promise((resolve, reject) => {
      // 지역 다운로드 완료 체크
      const checkInterval = setInterval(() => {
        const updatedRegion = this.regions.get(region.id);
        if (updatedRegion && updatedRegion.status === 'available') {
          clearInterval(checkInterval);
          resolve(updatedRegion);
        } else if (updatedRegion && updatedRegion.status === 'error') {
          clearInterval(checkInterval);
          reject(new Error('다운로드 실패'));
        }
      }, 1000);
      
      // 타임아웃 설정 (10분)
      setTimeout(() => {
        clearInterval(checkInterval);
        const currentRegion = this.regions.get(region.id);
        if (currentRegion && currentRegion.status === 'downloading') {
          currentRegion.status = 'error';
          this.regions.set(region.id, currentRegion);
          this.saveRegions();
          reject(new Error('다운로드 시간 초과'));
        }
      }, 10 * 60 * 1000);
    });
  }
  
  /**
   * 다운로드 큐 처리
   */
  private processDownloadQueue(): void {
    if (this.isDownloading || this.downloadQueue.length === 0) {
      return;
    }
    
    this.isDownloading = true;
    const regionId = this.downloadQueue.shift();
    if (!regionId) {
      this.isDownloading = false;
      return;
    }
    
    const region = this.regions.get(regionId);
    if (!region) {
      this.isDownloading = false;
      this.processDownloadQueue();
      return;
    }
    
    console.log(`지역 다운로드 시작: ${region.name}`);
    
    // 타일 목록 계산
    const tiles = this.calculateTilesForRegion(region);
    const totalTiles = tiles.length;
    
    if (totalTiles === 0) {
      region.status = 'error';
      this.regions.set(regionId, region);
      this.saveRegions();
      this.isDownloading = false;
      this.processDownloadQueue();
      return;
    }
    
    // 타일 다운로드 작업
    let downloadedTiles = 0;
    let failedTiles = 0;
    
    const downloadTile = async (tile: MapTile): Promise<boolean> => {
      try {
        const tileUrl = this.tileServerUrl
          .replace('{z}', tile.z.toString())
          .replace('{x}', tile.x.toString())
          .replace('{y}', tile.y.toString());
        
        const tilePath = `${this.tileBasePath}${tile.z}_${tile.x}_${tile.y}.png`;
        
        const downloadResult = await FileSystem.downloadAsync(
          tileUrl,
          tilePath,
          {
            md5: true,
            headers: {
              'User-Agent': 'NavigationApp/1.0'
            }
          }
        );
        
        if (downloadResult.status === 200) {
          tile.path = tilePath;
          return true;
        }
        return false;
      } catch (error) {
        console.error('타일 다운로드 실패:', error);
        return false;
      }
    };
    
    // 타일 다운로드 진행 상황 업데이트
    const updateProgress = () => {
      const progress = Math.floor((downloadedTiles / totalTiles) * 100);
      region.downloadProgress = progress;
      this.regions.set(regionId, region);
      this.notifyProgressListeners(regionId, progress);
    };
    
    // 다운로드 상태 확인 및 업데이트
    const checkDownloadComplete = () => {
      if (downloadedTiles + failedTiles === totalTiles) {
        if (failedTiles / totalTiles > 0.2) {
          // 20% 이상 실패시 오류로 처리
          region.status = 'error';
        } else {
          region.status = 'available';
          region.downloadProgress = 100;
          region.lastUpdated = Date.now();
        }
        
        this.regions.set(regionId, region);
        this.saveRegions();
        
        if (region.status === 'available') {
          this.saveTileData(regionId, tiles.filter(t => t.path));
        }
        
        this.isDownloading = false;
        this.processDownloadQueue();
        
        console.log(`지역 다운로드 완료: ${region.name}, 성공: ${downloadedTiles}, 실패: ${failedTiles}`);
      }
    };
    
    // 병렬 다운로드 수행 (10개씩 병렬 처리)
    const batchSize = 10;
    const downloadBatch = async (startIndex: number) => {
      const batch = tiles.slice(startIndex, startIndex + batchSize);
      if (batch.length === 0) {
        return;
      }
      
      await Promise.all(batch.map(async (tile) => {
        const success = await downloadTile(tile);
        if (success) {
          downloadedTiles++;
        } else {
          failedTiles++;
        }
        
        updateProgress();
        checkDownloadComplete();
      }));
      
      if (startIndex + batchSize < tiles.length) {
        downloadBatch(startIndex + batchSize);
      }
    };
    
    // 다운로드 시작
    downloadBatch(0);
  }
  
  /**
   * 지역 경계로부터 다운로드할 타일 목록 계산
   */
  private calculateTilesForRegion(region: OfflineRegion): MapTile[] {
    const bounds = region.bounds;
    const tiles: MapTile[] = [];
    
    // 다양한 줌 레벨에 대해 타일 계산
    for (let z = this.minZoom; z <= this.maxZoom; z++) {
      // 경계의 타일 인덱스 계산
      const minX = this.lon2tile(bounds.southwest.longitude, z);
      const maxX = this.lon2tile(bounds.northeast.longitude, z);
      const minY = this.lat2tile(bounds.northeast.latitude, z);
      const maxY = this.lat2tile(bounds.southwest.latitude, z);
      
      // 타일이 너무 많아지지 않도록 줌 레벨별 제한
      const maxTilesForZoom = 1000 / (this.maxZoom - this.minZoom + 1);
      let tilesForZoom = (maxX - minX + 1) * (maxY - minY + 1);
      
      if (tilesForZoom > maxTilesForZoom) {
        // 타일이 너무 많으면 높은 줌 레벨에서만 다운로드
        if (z < this.maxZoom - 2) {
          continue;
        }
      }
      
      // 타일 목록 추가
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({
            z, x, y,
            url: this.tileServerUrl
              .replace('{z}', z.toString())
              .replace('{x}', x.toString())
              .replace('{y}', y.toString())
          });
        }
      }
    }
    
    return tiles;
  }
  
  /**
   * 타일 데이터 저장
   */
  private saveTileData(regionId: string, tiles: MapTile[]): void {
    try {
      const tileKey = `${this.tileStorageKey}_${regionId}`;
      const tileData = JSON.stringify(tiles);
      this.storage.setItem(tileKey, tileData);
    } catch (error) {
      console.error('타일 데이터 저장 실패:', error);
    }
  }
  
  /**
   * 타일 데이터 로드
   */
  public loadTileData(regionId: string): MapTile[] {
    try {
      const tileKey = `${this.tileStorageKey}_${regionId}`;
      const tileData = this.storage.getItem(tileKey);
      if (tileData) {
        return JSON.parse(tileData);
      }
    } catch (error) {
      console.error('타일 데이터 로드 실패:', error);
    }
    return [];
  }
  
  /**
   * 지역 삭제
   */
  public async deleteRegion(regionId: string): Promise<boolean> {
    const region = this.regions.get(regionId);
    if (!region) {
      return false;
    }
    
    if (region.status === 'downloading') {
      // 다운로드 중이라면 다운로드 큐에서 제거
      this.downloadQueue = this.downloadQueue.filter(id => id !== regionId);
    }
    
    // 타일 파일 삭제
    try {
      const tiles = this.loadTileData(regionId);
      for (const tile of tiles) {
        if (tile.path) {
          await FileSystem.deleteAsync(tile.path, { idempotent: true });
        }
      }
      
      // 타일 데이터 삭제
      const tileKey = `${this.tileStorageKey}_${regionId}`;
      this.storage.removeItem(tileKey);
    } catch (error) {
      console.error('타일 파일 삭제 실패:', error);
    }
    
    this.regions.delete(regionId);
    this.saveRegions();
    
    return true;
  }
  
  /**
   * 모든 오프라인 지도 삭제
   */
  public async deleteAllRegions(): Promise<boolean> {
    try {
      // 다운로드 큐 초기화
      this.downloadQueue = [];
      
      // 각 지역별 파일 삭제
      for (const [regionId, _] of this.regions) {
        await this.deleteRegion(regionId);
      }
      
      // 지역 정보 초기화
      this.regions.clear();
      this.saveRegions();
      
      return true;
    } catch (error) {
      console.error('모든 지역 삭제 중 오류:', error);
      return false;
    }
  }
  
  /**
   * 특정 좌표가 오프라인 지도 범위에 속하는지 확인
   */
  public isPointCovered(point: GeoPoint): boolean {
    for (const region of this.regions.values()) {
      if (region.status === 'available') {
        if (this.isPointInBounds(point, region.bounds)) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * 좌표가 경계 내에 있는지 확인
   */
  private isPointInBounds(point: GeoPoint, bounds: OfflineRegion['bounds']): boolean {
    return (
      point.latitude <= bounds.northeast.latitude &&
      point.latitude >= bounds.southwest.latitude &&
      point.longitude <= bounds.northeast.longitude &&
      point.longitude >= bounds.southwest.longitude
    );
  }
  
  /**
   * 캐시된 오프라인 지도의 총 크기 계산
   */
  public getTotalCacheSize(): number {
    let total = 0;
    for (const region of this.regions.values()) {
      if (region.status === 'available' || region.status === 'outdated') {
        total += region.sizeInMB;
      }
    }
    return total;
  }
  
  /**
   * 최대 캐시 크기 설정
   */
  public setMaxCacheSize(sizeInMB: number): void {
    this.maxCacheSize = sizeInMB;
  }
  
  /**
   * 다운로드 진행 상황 리스너 등록
   */
  public addProgressListener(listener: DownloadProgressListener): void {
    if (!this.progressListeners.includes(listener)) {
      this.progressListeners.push(listener);
    }
  }
  
  /**
   * 다운로드 진행 상황 리스너 해제
   */
  public removeProgressListener(listener: DownloadProgressListener): void {
    this.progressListeners = this.progressListeners.filter(l => l !== listener);
  }
  
  /**
   * 진행 상황 리스너에게 알림
   */
  private notifyProgressListeners(regionId: string, progress: number): void {
    this.progressListeners.forEach(listener => {
      try {
        listener(regionId, progress);
      } catch (e) {
        console.error('진행 상황 리스너 호출 중 오류:', e);
      }
    });
  }
  
  /**
   * 특정 영역이 오프라인 상태에서 사용 가능한지 확인
   */
  public isRegionAvailableOffline(bounds: OfflineRegion['bounds']): boolean {
    for (const region of this.regions.values()) {
      if (region.status === 'available' && this.isRegionCovered(bounds, region.bounds)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 한 영역이 다른 영역을 포함하는지 확인
   */
  private isRegionCovered(target: OfflineRegion['bounds'], container: OfflineRegion['bounds']): boolean {
    return (
      target.southwest.latitude >= container.southwest.latitude &&
      target.southwest.longitude >= container.southwest.longitude &&
      target.northeast.latitude <= container.northeast.latitude &&
      target.northeast.longitude <= container.northeast.longitude
    );
  }
  
  /**
   * 지역 업데이트 확인
   */
  public checkForUpdates(): Promise<string[]> {
    // 실제 구현에서는 서버에 요청하여 업데이트가 필요한 지역 목록 확인
    return new Promise<string[]>(resolve => {
      setTimeout(() => {
        const outdatedRegions: string[] = [];
        const now = Date.now();
        const oneMonthInMs = 30 * 24 * 60 * 60 * 1000;
        
        for (const [id, region] of this.regions.entries()) {
          if (region.status === 'available' && region.lastUpdated) {
            if (now - region.lastUpdated > oneMonthInMs) {
              region.status = 'outdated';
              this.regions.set(id, region);
              outdatedRegions.push(id);
            }
          }
        }
        
        if (outdatedRegions.length > 0) {
          this.saveRegions();
        }
        
        resolve(outdatedRegions);
      }, 1000);
    });
  }
  
  /**
   * 자동 업데이트 설정 로드
   */
  private loadAutoUpdateSettings(): void {
    try {
      const settingsStr = this.storage.getItem(this.autoUpdateSettingsKey);
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        this.autoUpdateSettings = {...this.autoUpdateSettings, ...settings};
      }
    } catch (error) {
      console.error('자동 업데이트 설정 로드 실패:', error);
    }
  }

  /**
   * 자동 업데이트 설정 저장
   */
  private saveAutoUpdateSettings(): void {
    try {
      this.storage.setItem(
        this.autoUpdateSettingsKey,
        JSON.stringify(this.autoUpdateSettings)
      );
    } catch (error) {
      console.error('자동 업데이트 설정 저장 실패:', error);
    }
  }

  /**
   * 자동 업데이트 설정 업데이트
   */
  public updateAutoUpdateSettings(settings: Partial<AutoUpdateSettings>): void {
    this.autoUpdateSettings = {...this.autoUpdateSettings, ...settings};
    this.saveAutoUpdateSettings();
    
    // 설정 변경 시 업데이트 체커 재설정
    this.setupAutoUpdateChecker();
  }

  /**
   * 현재 자동 업데이트 설정 반환
   */
  public getAutoUpdateSettings(): AutoUpdateSettings {
    return {...this.autoUpdateSettings};
  }

  /**
   * 자동 업데이트 체커 설정
   */
  private setupAutoUpdateChecker(): void {
    // 이전 인터벌 정리
    if (this.autoUpdateCheckInterval) {
      clearInterval(this.autoUpdateCheckInterval);
    }
    
    // 자동 업데이트가 비활성화된 경우 종료
    if (!this.autoUpdateSettings.enabled) {
      return;
    }
    
    // 1시간마다 체크 (실제 업데이트는 조건에 맞을 때만 실행)
    this.autoUpdateCheckInterval = setInterval(() => {
      this.checkAutoUpdateCondition();
    }, 60 * 60 * 1000); // 1시간
    
    // 앱 시작 시에도 한 번 체크
    this.checkAutoUpdateCondition();
  }
  
  /**
   * 자동 업데이트 실행 조건 체크
   */
  private async checkAutoUpdateCondition(): Promise<void> {
    // 자동 업데이트가 비활성화된 경우 종료
    if (!this.autoUpdateSettings.enabled) {
      return;
    }
    
    // Wi-Fi 연결 상태 확인 (Wi-Fi 전용 설정 시)
    if (this.autoUpdateSettings.wifiOnly) {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || netInfo.type !== 'wifi') {
        console.log('Wi-Fi 연결 안됨, 자동 업데이트 건너뜀');
        return;
      }
    }
    
    // 현재 시간 확인
    const now = new Date();
    const { timeOfDay, updateInterval, lastAutoCheck } = this.autoUpdateSettings;
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const [targetHour, targetMin] = timeOfDay.split(':').map(Number);
    
    // 업데이트 간격에 따른 체크 (마지막 체크 이후 충분한 시간이 지났는지)
    let intervalMs: number;
    switch (updateInterval) {
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000; // 1일
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 7일
        break;
      case 'monthly':
        intervalMs = 30 * 24 * 60 * 60 * 1000; // 약 30일
        break;
      case 'never':
      default:
        return; // 업데이트 안함
    }
    
    // 마지막 체크 이후 간격이 안 지났으면 패스
    if (now.getTime() - lastAutoCheck < intervalMs) {
      return;
    }
    
    // 설정된 시간에 가까운지 체크 (±30분)
    const currentTimeInMinutes = currentHour * 60 + currentMin;
    const targetTimeInMinutes = targetHour * 60 + targetMin;
    const timeDiff = Math.abs(currentTimeInMinutes - targetTimeInMinutes);
    
    // 설정된 시간에서 30분 이상 차이가 나면 업데이트 안함
    if (timeDiff > 30 && timeDiff < (24 * 60 - 30)) {
      return;
    }
    
    // 마지막 체크 시간 업데이트
    this.autoUpdateSettings.lastAutoCheck = now.getTime();
    this.saveAutoUpdateSettings();
    
    // 모든 조건이 충족되면 업데이트 실행
    this.runAutoUpdate();
  }
  
  /**
   * 자동 업데이트 실행
   */
  private async runAutoUpdate(): Promise<void> {
    console.log('자동 업데이트 실행 중...');
    
    try {
      // 업데이트가 필요한 지역 확인
      const outdatedRegions = await this.checkForUpdates();
      
      // 업데이트 필요한 지역이 없으면 종료
      if (outdatedRegions.length === 0) {
        console.log('업데이트가 필요한 지역이 없습니다.');
        return;
      }
      
      console.log(`${outdatedRegions.length}개의 지역 자동 업데이트 시작`);
      
      // 각 지역별로 업데이트 진행
      for (const regionId of outdatedRegions) {
        const region = this.regions.get(regionId);
        if (region) {
          console.log(`지역 '${region.name}' 자동 업데이트 중...`);
          
          try {
            // 기존 지역 삭제 후 다시 다운로드
            await this.deleteRegion(regionId);
            await this.downloadRegion({
              id: region.id,
              name: region.name,
              bounds: region.bounds,
              sizeInMB: region.sizeInMB
            });
          } catch (error) {
            console.error(`지역 '${region.name}' 자동 업데이트 실패:`, error);
          }
        }
      }
      
      console.log('자동 업데이트 완료');
    } catch (error) {
      console.error('자동 업데이트 실행 중 오류:', error);
    }
  }
  
  /**
   * 경도를 타일 X 좌표로 변환
   */
  private lon2tile(lon: number, zoom: number): number {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  }
  
  /**
   * 위도를 타일 Y 좌표로 변환
   */
  private lat2tile(lat: number, zoom: number): number {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  }
  
  /**
   * 타일 X 좌표를 경도로 변환
   */
  private tile2lon(x: number, zoom: number): number {
    return x / Math.pow(2, zoom) * 360 - 180;
  }
  
  /**
   * 타일 Y 좌표를 위도로 변환
   */
  private tile2lat(y: number, zoom: number): number {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  /**
   * 지도 데이터를 로컬 스토리지에 저장
   * 
   * @param nodes 노드 배열
   * @param roadSegments 도로 세그먼트 배열 
   * @param name 지도 이름
   * @returns 캐시 정보
   */
  public async saveMapData(
    nodes: Node[],
    roadSegments: RoadSegment[],
    name: string = 'default_map'
  ): Promise<MapCacheInfo> {
    try {
      // 데이터를 직렬화
      const mapData = JSON.stringify({ nodes, roadSegments });
      
      // 캐시 정보 생성
      const cacheInfo: MapCacheInfo = {
        timestamp: Date.now(),
        size: mapData.length,
        name,
        nodeCount: nodes.length,
        roadSegmentCount: roadSegments.length
      };
      
      // 데이터 저장
      await AsyncStorage.setItem(this.MAP_DATA_KEY, mapData);
      await AsyncStorage.setItem(this.MAP_INFO_KEY, JSON.stringify(cacheInfo));
      
      // 캐시 목록 업데이트
      await this.updateCacheList(name, cacheInfo);
      
      console.log(`지도 데이터 캐싱 완료: ${name}, ${nodes.length}개 노드, ${roadSegments.length}개 도로 세그먼트`);
      
      return cacheInfo;
    } catch (error) {
      console.error('지도 데이터 저장 실패:', error);
      throw new Error('지도 데이터를 로컬에 저장할 수 없습니다: ' + (error as Error).message);
    }
  }
  
  /**
   * 로컬 스토리지에서 지도 데이터 로드
   * 
   * @returns 노드와 도로 세그먼트 배열
   */
  public async loadMapData(): Promise<{ nodes: Node[], roadSegments: RoadSegment[] } | null> {
    try {
      const mapDataJson = await AsyncStorage.getItem(this.MAP_DATA_KEY);
      
      if (!mapDataJson) {
        return null;
      }
      
      // JSON 파싱하여 데이터 반환
      const mapData = JSON.parse(mapDataJson);
      
      console.log(`캐시된 지도 데이터 로드 완료: ${mapData.nodes.length}개 노드, ${mapData.roadSegments.length}개 도로 세그먼트`);
      
      return mapData;
    } catch (error) {
      console.error('지도 데이터 로드 실패:', error);
      return null;
    }
  }
  
  /**
   * 캐시된 지도 정보 조회
   * 
   * @returns 지도 캐시 정보
   */
  public async getCacheInfo(): Promise<MapCacheInfo | null> {
    try {
      const mapInfoJson = await AsyncStorage.getItem(this.MAP_INFO_KEY);
      
      if (!mapInfoJson) {
        return null;
      }
      
      return JSON.parse(mapInfoJson);
    } catch (error) {
      console.error('캐시 정보 조회 실패:', error);
      return null;
    }
  }
  
  /**
   * 캐시된 지도 목록 조회
   * 
   * @returns 지도 캐시 목록
   */
  public async getCacheList(): Promise<Record<string, MapCacheInfo>> {
    try {
      const cacheListJson = await AsyncStorage.getItem(this.MAP_CACHE_LIST_KEY);
      
      if (!cacheListJson) {
        return {};
      }
      
      return JSON.parse(cacheListJson);
    } catch (error) {
      console.error('캐시 목록 조회 실패:', error);
      return {};
    }
  }
  
  /**
   * 캐시 목록 업데이트
   * 
   * @param name 지도 이름
   * @param cacheInfo 캐시 정보
   */
  private async updateCacheList(name: string, cacheInfo: MapCacheInfo): Promise<void> {
    try {
      // 기존 목록 가져오기
      const cacheList = await this.getCacheList();
      
      // 새 정보 추가
      cacheList[name] = cacheInfo;
      
      // 저장
      await AsyncStorage.setItem(this.MAP_CACHE_LIST_KEY, JSON.stringify(cacheList));
    } catch (error) {
      console.error('캐시 목록 업데이트 실패:', error);
    }
  }
  
  /**
   * 지도 데이터 캐시 삭제
   * 
   * @param name 지도 이름 (생략 시 모든 캐시 삭제)
   * @returns 삭제 성공 여부
   */
  public async clearCache(name?: string): Promise<boolean> {
    try {
      if (name) {
        // 특정 지도 캐시만 삭제
        const cacheList = await this.getCacheList();
        if (cacheList[name]) {
          delete cacheList[name];
          await AsyncStorage.setItem(this.MAP_CACHE_LIST_KEY, JSON.stringify(cacheList));
        }
        
        // 현재 로드된 맵이 삭제되는 맵인 경우
        const currentInfo = await this.getCacheInfo();
        if (currentInfo && currentInfo.name === name) {
          await AsyncStorage.removeItem(this.MAP_DATA_KEY);
          await AsyncStorage.removeItem(this.MAP_INFO_KEY);
        }
      } else {
        // 모든 캐시 삭제
        await AsyncStorage.removeItem(this.MAP_DATA_KEY);
        await AsyncStorage.removeItem(this.MAP_INFO_KEY);
        await AsyncStorage.removeItem(this.MAP_CACHE_LIST_KEY);
      }
      
      console.log(name ? `'${name}' 지도 캐시 삭제 완료` : '모든 지도 캐시 삭제 완료');
      return true;
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      return false;
    }
  }
  
  /**
   * 캐시 상태 확인
   * 
   * @returns 캐시 용량 등 상태 정보
   */
  public async getCacheStatus(): Promise<{
    totalSize: number;
    itemCount: number;
    lastUpdated: number | null;
  }> {
    try {
      const cacheList = await this.getCacheList();
      const caches = Object.values(cacheList);
      
      if (caches.length === 0) {
        return { totalSize: 0, itemCount: 0, lastUpdated: null };
      }
      
      const totalSize = caches.reduce((total, cache) => total + cache.size, 0);
      const lastUpdated = Math.max(...caches.map(cache => cache.timestamp));
      
      return {
        totalSize,
        itemCount: caches.length,
        lastUpdated
      };
    } catch (error) {
      console.error('캐시 상태 조회 실패:', error);
      return { totalSize: 0, itemCount: 0, lastUpdated: null };
    }
  }
}

// 싱글톤 인스턴스
const offlineMapService = new OfflineMapService();
export default offlineMapService;