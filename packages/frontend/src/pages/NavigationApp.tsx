import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Map from '../components/Map';
import NavigationPanel from '../components/NavigationPanel';
import NavigationAlertComponent from '../components/NavigationAlert';
import DestinationSearch from '../components/DestinationSearch';
import CCTVViewer from '../components/CCTVViewer';
import useNavigation from '../hooks/useNavigation';
import { NavigationAlert } from '../services/navigationService';
import { CCTVData } from '../services/uticService';
import { Fab, Tooltip } from '@mui/material';
import { Videocam, VideocamOff } from '@mui/icons-material';

/**
 * Navigation App
 * 내비게이션 앱
 * 
 * Main application component that integrates all navigation features
 * 모든 내비게이션 기능을 통합하는 주요 애플리케이션 컴포넌트
 */
const NavigationApp: React.FC = () => {
  const { t } = useTranslation();
  const [showSearch, setShowSearch] = useState<boolean>(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  
  // CCTV 관련 상태
  const [showCCTV, setShowCCTV] = useState<boolean>(false);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVData | null>(null);
  
  // Use our custom navigation hook
  const {
    currentLocation,
    destination,
    route,
    alerts,
    isNavigating,
    isLoading,
    error,
    startNavigation,
    stopNavigation,
    recalculateRoute,
    getETA,
    formatDistance,
    formatDuration
  } = useNavigation({
    alertRadius: 5000, // 5km
    trafficUpdateInterval: 60000, // 1 minute
    sidoCode: '11' // Seoul
  });
  
  // Handle destination selection
  const handleSelectDestination = (selectedDestination: { latitude: number; longitude: number }) => {
    startNavigation(selectedDestination);
    setShowSearch(false);
  };
  
  // Handle map click
  const handleMapClick = (location: { latitude: number; longitude: number }) => {
    if (!isNavigating) {
      handleSelectDestination(location);
    }
  };
  
  // Handle stopping navigation
  const handleStopNavigation = () => {
    stopNavigation();
    setShowSearch(true);
    setDismissedAlerts(new Set());
  };
  
  // Handle dismissing an alert
  const handleDismissAlert = (alert: NavigationAlert) => {
    const alertKey = `${alert.type}-${alert.location}-${alert.timestamp.getTime()}`;
    setDismissedAlerts(prev => {
      const updated = new Set(prev);
      updated.add(alertKey);
      return updated;
    });
  };
  
  // Handle CCTV click
  const handleCCTVClick = (cctv: CCTVData) => {
    setSelectedCCTV(cctv);
  };
  
  // Filter out dismissed alerts
  const filteredAlerts = alerts.filter(alert => {
    const alertKey = `${alert.type}-${alert.location}-${alert.timestamp.getTime()}`;
    return !dismissedAlerts.has(alertKey);
  });
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">
            {isNavigating ? '내비게이션 진행 중' : '도시 교통 내비게이션'}
          </h1>
          {!showSearch && !isNavigating && (
            <button
              onClick={() => setShowSearch(true)}
              className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100"
            >
              목적지 검색
            </button>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Map Area - Always visible */}
        <div className="flex-1 relative">
          <Map
            currentLocation={currentLocation}
            destination={destination}
            route={route}
            alerts={alerts}
            showCCTV={showCCTV}
            onClick={handleMapClick}
            onCCTVClick={handleCCTVClick}
          />
          
          {/* CCTV 뷰어 */}
          <CCTVViewer
            cctv={selectedCCTV}
            onClose={() => setSelectedCCTV(null)}
          />
          
          {/* CCTV 토글 버튼 */}
          <div className="absolute bottom-6 right-6">
            <Tooltip title={showCCTV ? "CCTV 숨기기" : "CCTV 표시"}>
              <Fab
                color={showCCTV ? "primary" : "default"}
                aria-label="CCTV 표시 여부"
                onClick={() => setShowCCTV(!showCCTV)}
                sx={{ ml: 1 }}
              >
                {showCCTV ? <VideocamOff /> : <Videocam />}
              </Fab>
            </Tooltip>
          </div>
          
          {/* Error message overlay */}
          {error && (
            <div className="absolute top-4 left-0 right-0 mx-auto w-max bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-md">
              <p>{error}</p>
            </div>
          )}
        </div>
        
        {/* Side Panel - Search or Navigation */}
        <div className="w-full md:w-96 bg-gray-50 p-4 overflow-y-auto">
          {/* Show search when not navigating */}
          {showSearch && !isNavigating && (
            <DestinationSearch
              onSelectDestination={handleSelectDestination}
              isLoading={isLoading}
            />
          )}
          
          {/* Show navigation panel when navigating */}
          {isNavigating && (
            <>
              <NavigationPanel
                isNavigating={isNavigating}
                route={route}
                isLoading={isLoading}
                onStopNavigation={handleStopNavigation}
                onRecalculateRoute={recalculateRoute}
                etaMinutes={getETA()}
                formatDistance={formatDistance}
                formatDuration={formatDuration}
              />
              
              {/* CCTV 표시 설정 */}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="font-medium">도로 CCTV 표시</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={showCCTV} 
                    onChange={() => setShowCCTV(!showCCTV)} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              {/* Alert section */}
              {filteredAlerts.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-lg font-bold mb-2">알림</h2>
                  <div className="space-y-2">
                    {filteredAlerts.slice(0, 5).map((alert, index) => (
                      <NavigationAlertComponent
                        key={`${alert.type}-${alert.location}-${index}`}
                        alert={alert}
                        onDismiss={handleDismissAlert}
                      />
                    ))}
                    
                    {filteredAlerts.length > 5 && (
                      <div className="text-center text-sm text-gray-500 mt-2">
                        외 {filteredAlerts.length - 5}개의 알림이 있습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Location status */}
          <div className="mt-4 text-sm text-gray-500">
            {currentLocation ? (
              <p>현재 위치: {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}</p>
            ) : (
              <p>위치를 가져오는 중...</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white p-2 text-center text-sm">
        © 2025 도시교통 내비게이션 - UTIC 데이터 활용
      </footer>
    </div>
  );
};

export default NavigationApp;