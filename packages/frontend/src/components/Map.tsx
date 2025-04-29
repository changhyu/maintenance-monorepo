import React, { useRef, useEffect, useState } from 'react';
import { Coordinates, Route, RouteSegment } from '../services/navigationService';
import { CCTVData, getCCTVData, CCTVRequestParams } from '../services/uticService';

interface MapProps {
  currentLocation: Coordinates | null;
  route: Route | null;
  destination: Coordinates | null;
  alerts?: {
    type: string;
    coordinates: Coordinates;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  showCCTV?: boolean; // 새로운 속성 - CCTV 표시 여부
  onClick?: (location: Coordinates) => void;
  onCCTVClick?: (cctv: CCTVData) => void; // 새로운 속성 - CCTV 클릭 이벤트
}

/**
 * Map Component using Google Maps
 * Google Maps를 사용한 지도 컴포넌트
 */
const Map: React.FC<MapProps> = ({ 
  currentLocation, 
  route, 
  destination, 
  alerts = [],
  showCCTV = false,
  onClick,
  onCCTVClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [cctvMarkers, setCCTVMarkers] = useState<google.maps.Marker[]>([]);
  const [cctvData, setCCTVData] = useState<CCTVData[]>([]);
  const [mapBounds, setMapBounds] = useState<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null>(null);
  
  // Initialize the map
  useEffect(() => {
    if (mapRef.current && !map) {
      // Initialize with default location (Seoul) if no current location
      const center = currentLocation ? 
        { lat: currentLocation.latitude, lng: currentLocation.longitude } : 
        { lat: 37.5665, lng: 126.9780 }; // Seoul
      
      const mapInstance = new google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true
      });
      
      // Add click listener to the map
      if (onClick) {
        mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const clickedLocation: Coordinates = {
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng()
            };
            onClick(clickedLocation);
          }
        });
      }
      
      // Add bounds_changed listener to update mapBounds
      mapInstance.addListener('bounds_changed', () => {
        const bounds = mapInstance.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          setMapBounds({
            minX: sw.lng(),
            maxX: ne.lng(),
            minY: sw.lat(),
            maxY: ne.lat()
          });
        }
      });
      
      // Create directions renderer
      const directionsRendererInstance = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      directionsRendererInstance.setMap(mapInstance);
      
      setMap(mapInstance);
      setDirectionsRenderer(directionsRendererInstance);
    }
  }, [currentLocation, map, onClick]);
  
  // Update map center when current location changes
  useEffect(() => {
    if (map && currentLocation) {
      const center = { lat: currentLocation.latitude, lng: currentLocation.longitude };
      map.setCenter(center);
    }
  }, [currentLocation, map]);
  
  // Clear all markers
  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  };
  
  // Add current location marker
  useEffect(() => {
    if (map && currentLocation) {
      clearMarkers();
      
      const position = { 
        lat: currentLocation.latitude, 
        lng: currentLocation.longitude 
      };
      
      const userMarker = new google.maps.Marker({
        position,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2
        },
        title: '현재 위치'
      });
      
      // Add destination marker if available
      if (destination) {
        const destMarker = new google.maps.Marker({
          position: { lat: destination.latitude, lng: destination.longitude },
          map,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          },
          title: '목적지'
        });
        
        setMarkers([userMarker, destMarker]);
      } else {
        setMarkers([userMarker]);
      }
    }
  }, [currentLocation, destination, map]);
  
  // Add alert markers
  useEffect(() => {
    if (map && alerts.length > 0) {
      // Don't clear all markers here - just add alert markers
      const newMarkers = [...markers];
      
      alerts.forEach(alert => {
        const position = { 
          lat: alert.coordinates.latitude, 
          lng: alert.coordinates.longitude 
        };
        
        // Choose icon based on alert type and severity
        let iconUrl = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
        
        if (alert.type === 'INCIDENT' || alert.severity === 'HIGH') {
          iconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
        } else if (alert.type === 'CONSTRUCTION' || alert.severity === 'MEDIUM') {
          iconUrl = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
        } else if (alert.type === 'PROTECTED_AREA') {
          iconUrl = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
        }
        
        const alertMarker = new google.maps.Marker({
          position,
          map,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(30, 30)
          },
          title: alert.type
        });
        
        newMarkers.push(alertMarker);
      });
      
      setMarkers(newMarkers);
    }
  }, [alerts, map, markers]);
  
  // Display route on the map
  useEffect(() => {
    if (map && directionsRenderer && route && currentLocation && destination) {
      try {
        // Convert our custom Route to Google DirectionsResult
        const directionsResult: google.maps.DirectionsResult = {
          routes: [convertRouteToGoogleRoute(route, currentLocation, destination)],
          geocoded_waypoints: []
        };
        
        directionsRenderer.setDirections(directionsResult);
      } catch (error) {
        console.error('Error displaying route:', error);
        
        // Fallback: If conversion fails, use DirectionsService
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: { lat: currentLocation.latitude, lng: currentLocation.longitude },
            destination: { lat: destination.latitude, lng: destination.longitude },
            travelMode: google.maps.TravelMode.DRIVING
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
              directionsRenderer.setDirections(result);
            } else {
              console.error('Directions request failed:', status);
            }
          }
        );
      }
    }
  }, [route, currentLocation, destination, map, directionsRenderer]);
  
  // Fetch and display CCTV data when map bounds change and showCCTV is true
  useEffect(() => {
    const fetchCCTV = async () => {
      if (!map || !mapBounds || !showCCTV) return;
      
      try {
        // 지도 경계 내의 CCTV 데이터 요청
        const cctvParams: CCTVRequestParams = {
          minX: mapBounds.minX,
          maxX: mapBounds.maxX,
          minY: mapBounds.minY,
          maxY: mapBounds.maxY,
          type: 'all',      // 모든 도로 유형
          cctvType: '1',    // 실시간 스트리밍(HLS)
          getType: 'json'   // JSON 응답 형식
        };
        
        const cctvList = await getCCTVData(cctvParams);
        setCCTVData(cctvList);
        
        // 기존 CCTV 마커 제거
        cctvMarkers.forEach(marker => marker.setMap(null));
        
        // 새로운 CCTV 마커 생성
        const newCCTVMarkers = cctvList.map(cctv => {
          const position = { 
            lat: cctv.latitude, 
            lng: cctv.longitude 
          };
          
          const marker = new google.maps.Marker({
            position,
            map,
            icon: {
              url: '/assets/icons/cctv-icon.svg',   // CCTV 아이콘 사용
              scaledSize: new google.maps.Size(24, 24)
            },
            title: cctv.name || 'CCTV'
          });
          
          // CCTV 마커 클릭 이벤트 처리
          if (onCCTVClick) {
            marker.addListener('click', () => {
              onCCTVClick(cctv);
            });
          }
          
          // 마커에 정보창 추가
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="max-width: 200px; text-align: center;">
                <h3 style="margin: 0 0 5px 0; font-size: 14px;">${cctv.name || 'CCTV'}</h3>
                <button id="view-cctv-${cctv.id}" style="
                  background-color: #4285F4;
                  color: white;
                  border: none;
                  padding: 5px 10px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                ">영상 보기</button>
              </div>
            `
          });
          
          marker.addListener('click', () => {
            infoWindow.open(map, marker);
            
            // 브라우저에서만 작동하는 코드이므로 setTimeout으로 DOM 로딩 후 실행
            setTimeout(() => {
              const button = document.getElementById(`view-cctv-${cctv.id}`);
              if (button && onCCTVClick) {
                button.addEventListener('click', () => {
                  onCCTVClick(cctv);
                });
              }
            }, 100);
          });
          
          return marker;
        });
        
        setCCTVMarkers(newCCTVMarkers);
      } catch (error) {
        console.error('Error fetching CCTV data:', error);
      }
    };
    
    // CCTV 데이터 가져오기
    fetchCCTV();
    
  }, [map, mapBounds, showCCTV, onCCTVClick]);
  
  // Clean up CCTV markers when component unmounts or showCCTV changes
  useEffect(() => {
    return () => {
      cctvMarkers.forEach(marker => marker.setMap(null));
    };
  }, [cctvMarkers]);
  
  /**
   * Convert our custom Route to Google Maps Route
   * 사용자 정의 경로를 Google Maps 경로로 변환
   */
  const convertRouteToGoogleRoute = (
    route: Route,
    origin: Coordinates,
    destination: Coordinates
  ): google.maps.DirectionsRoute => {
    // Create path from route segments
    const path: google.maps.LatLng[] = [
      new google.maps.LatLng(origin.latitude, origin.longitude)
    ];
    
    route.segments.forEach((segment: RouteSegment) => {
      path.push(new google.maps.LatLng(
        segment.endPoint.latitude,
        segment.endPoint.longitude
      ));
    });
    
    // Create legs from segments
    const legs: google.maps.DirectionsLeg[] = route.segments.map((segment: RouteSegment) => ({
      start_location: new google.maps.LatLng(
        segment.startPoint.latitude,
        segment.startPoint.longitude
      ),
      end_location: new google.maps.LatLng(
        segment.endPoint.latitude,
        segment.endPoint.longitude
      ),
      distance: {
        text: `${(segment.distance / 1000).toFixed(1)} km`,
        value: segment.distance
      },
      duration: {
        text: formatDuration(segment.duration),
        value: segment.duration
      },
      steps: [{
        travel_mode: google.maps.TravelMode.DRIVING,
        instructions: segment.instruction,
        path: [
          new google.maps.LatLng(segment.startPoint.latitude, segment.startPoint.longitude),
          new google.maps.LatLng(segment.endPoint.latitude, segment.endPoint.longitude)
        ]
      }]
    }));
    
    return {
      summary: '경로',
      legs,
      overview_path: path,
      bounds: calculateBounds(path),
      warnings: [],
      waypoint_order: []
    };
  };
  
  /**
   * Calculate bounds for a path
   * 경로에 대한 경계 계산
   */
  const calculateBounds = (path: google.maps.LatLng[]): google.maps.LatLngBounds => {
    const bounds = new google.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    return bounds;
  };
  
  /**
   * Format duration for display
   * 표시를 위한 시간 포맷팅
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분`;
    }
  };
  
  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px' 
      }}
      className="map-container"
    />
  );
};

export default Map;