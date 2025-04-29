import React from 'react';
import { NavigationAlert } from '../services/navigationService';

interface NavigationAlertProps {
  alert: NavigationAlert;
  onDismiss?: (alert: NavigationAlert) => void;
}

/**
 * Navigation Alert Component
 * 내비게이션 알림 컴포넌트
 */
const NavigationAlertComponent: React.FC<NavigationAlertProps> = ({ alert, onDismiss }) => {
  // Icons for different alert types
  const getAlertIcon = (type: string, severity: string) => {
    switch (type) {
      case 'INCIDENT':
        return '🚨';
      case 'CONSTRUCTION':
        return '🚧';
      case 'HAZARD':
        return '⚠️';
      case 'PROTECTED_AREA':
        return '🏫';
      case 'CONGESTION':
        return severity === 'HIGH' ? '🔴' : '🟠';
      default:
        return 'ℹ️';
    }
  };
  
  // Background color based on severity
  const getBgColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100';
      case 'MEDIUM':
        return 'bg-yellow-100';
      case 'LOW':
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  };
  
  // Border color based on severity
  const getBorderColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'border-red-500';
      case 'MEDIUM':
        return 'border-yellow-500';
      case 'LOW':
        return 'border-blue-500';
      default:
        return 'border-gray-500';
    }
  };
  
  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };
  
  return (
    <div 
      className={`flex items-center p-3 mb-2 rounded-lg border ${getBgColor(alert.severity)} ${getBorderColor(alert.severity)}`}
      role="alert"
    >
      <div className="text-2xl mr-3">
        {getAlertIcon(alert.type, alert.severity)}
      </div>
      
      <div className="flex-1">
        <div className="font-bold">
          {alert.location} ({formatDistance(alert.distance)} 앞)
        </div>
        <div className="text-sm">
          {alert.description}
        </div>
      </div>
      
      {onDismiss && (
        <button 
          type="button"
          className="p-1 ml-2 rounded-full text-gray-500 hover:bg-gray-200" 
          onClick={() => onDismiss(alert)}
        >
          <span className="sr-only">닫기</span>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

export default NavigationAlertComponent;