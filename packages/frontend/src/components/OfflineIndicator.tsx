import React, { useState, useEffect } from 'react';
import { useApiStatus } from '@maintenance/api-client';
import { apiClient } from '../services/api';

interface OfflineIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 오프라인 모드 상태를 표시하는 컴포넌트
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '', style = {} }) => {
  const { status, checkConnection } = useApiStatus(apiClient);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // 오프라인 상태에 따른 표시/숨김 처리
  useEffect(() => {
    if (status.isOffline) {
      setIsVisible(true);
    } else {
      // 온라인 상태로 변경 시 2초 후 숨김 처리
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [status.isOffline]);

  // 오프라인 상태가 아니면 렌더링하지 않음
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={`offline-indicator ${className}`} 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: status.isOffline ? '#f44336' : '#4caf50',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.3s ease',
        ...style
      }}
    >
      <span className="offline-indicator-icon" style={{ 
        width: '10px', 
        height: '10px', 
        borderRadius: '50%', 
        backgroundColor: status.isOffline ? 'white' : 'white',
        animation: status.isOffline ? 'pulse 1.5s infinite' : 'none'
      }} />
      
      <span className="offline-indicator-text">
        {status.isOffline 
          ? '오프라인 모드' 
          : '온라인 모드로 전환됨'}
      </span>
      
      {status.isOffline && (
        <button
          onClick={() => checkConnection()}
          style={{
            background: 'transparent',
            border: '1px solid white',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 8px',
            marginLeft: '8px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          재연결
        </button>
      )}
      
      {status.isOffline && status.pendingRequestsCount > 0 && (
        <span className="offline-indicator-badge" style={{
          backgroundColor: 'white',
          color: '#f44336',
          borderRadius: '20px',
          padding: '2px 6px',
          fontSize: '12px',
          fontWeight: 'bold',
          marginLeft: '4px'
        }}>
          {status.pendingRequestsCount}
        </span>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}; 