import React from 'react';
import { Route } from '../services/navigationService';

interface NavigationPanelProps {
  isNavigating: boolean;
  route: Route | null;
  isLoading: boolean;
  onStopNavigation: () => void;
  onRecalculateRoute: () => void;
  etaMinutes: number | null;
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
}

/**
 * Navigation Panel Component
 * 내비게이션 패널 컴포넌트
 */
const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  route,
  isLoading,
  onStopNavigation,
  onRecalculateRoute,
  etaMinutes,
  formatDistance,
  formatDuration
}) => {
  if (!isNavigating || !route) {
    return null;
  }

  // Calculate next instruction from route
  const getNextInstruction = () => {
    if (!route || route.segments.length === 0) return '경로 안내 준비 중...';
    
    // In a real implementation, we would find the next segment based on current location
    // For now, just return the first segment's instruction
    return route.segments[0].instruction;
  };
  
  // Get traffic congestion level description
  const getTrafficDescription = () => {
    if (!route) return '교통 정보 없음';
    
    // Calculate average traffic level
    const totalSegments = route.segments.length;
    if (totalSegments === 0) return '교통 정보 없음';
    
    const avgTrafficLevel = route.segments.reduce(
      (sum, segment) => sum + segment.trafficLevel, 
      0
    ) / totalSegments;
    
    if (avgTrafficLevel >= 3.5) return '심각한 정체';
    if (avgTrafficLevel >= 2.5) return '정체';
    if (avgTrafficLevel >= 1.5) return '서행';
    return '원활';
  };
  
  // Get color based on traffic condition
  const getTrafficColor = () => {
    const trafficDesc = getTrafficDescription();
    switch (trafficDesc) {
      case '심각한 정체': return 'text-red-600';
      case '정체': return 'text-orange-600';
      case '서행': return 'text-yellow-600';
      case '원활': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 w-full max-w-md">
      {/* ETA and Distance */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-sm text-gray-500">예상 도착 시간</div>
          <div className="text-xl font-bold">
            {etaMinutes !== null ? `${etaMinutes}분 후` : '계산 중...'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">총 거리</div>
          <div className="text-xl font-bold">
            {route ? formatDistance(route.totalDistance) : '계산 중...'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">예상 소요 시간</div>
          <div className="text-xl font-bold">
            {route ? formatDuration(route.totalDuration) : '계산 중...'}
          </div>
        </div>
      </div>
      
      {/* Traffic Info */}
      <div className="flex items-center mb-4">
        <div className="mr-2">🚦</div>
        <div>
          <div className="text-sm text-gray-500">교통 상황</div>
          <div className={`text-md font-bold ${getTrafficColor()}`}>
            {getTrafficDescription()}
            {route && route.trafficDelayTime > 60 && (
              <span className="text-red-500 ml-2">
                (+{formatDuration(route.trafficDelayTime)} 지연)
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Next Instruction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-sm text-blue-700 font-bold mb-1">다음 안내</div>
        <div className="text-lg">
          {getNextInstruction()}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex justify-between">
        <button
          onClick={onStopNavigation}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          disabled={isLoading}
        >
          내비게이션 종료
        </button>
        
        <button
          onClick={onRecalculateRoute}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={isLoading}
        >
          {isLoading ? '계산 중...' : '경로 재계산'}
        </button>
      </div>
    </div>
  );
};

export default NavigationPanel;