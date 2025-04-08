import React from 'react';
import { formatDate, getRelativeTime } from '../../utils/dateUtils';
import { MaintenanceRecord } from '../../types/vehicle';

interface MaintenanceCardProps {
  maintenance: MaintenanceRecord;
  onClick?: () => void;
  className?: string;
}

export const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
  maintenance,
  onClick,
  className = '',
}) => {
  // 정비 타입에 따른 배지 색상 결정
  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'routine':
        return 'bg-blue-100 text-blue-800';
      case 'repair':
        return 'bg-yellow-100 text-yellow-800';
      case 'emergency':
        return 'bg-red-100 text-red-800';
      case 'recall':
        return 'bg-purple-100 text-purple-800';
      case 'inspection':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 총 비용 계산 (부품이 있는 경우)
  const totalCost = maintenance.cost + (maintenance.parts?.reduce((sum, part) => sum + (part.totalCost || 0), 0) || 0);
  
  return (
    <div 
      className={`bg-white shadow rounded-lg p-4 mb-4 cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(maintenance.type)}`}>
            {maintenance.type}
          </span>
          <h3 className="text-lg font-medium mt-1">{maintenance.description}</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{getRelativeTime(maintenance.date)}</p>
          <p className="font-medium text-lg">{totalCost.toLocaleString()}원</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p className="text-sm text-gray-500">정비일</p>
          <p className="font-medium">{formatDate(maintenance.date)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">주행거리</p>
          <p className="font-medium">{maintenance.mileage.toLocaleString()} km</p>
        </div>
      </div>
      
      <div className="mb-2">
        <p className="text-sm text-gray-500">정비소</p>
        <p className="font-medium">{maintenance.provider}</p>
      </div>
      
      {maintenance.parts && maintenance.parts.length > 0 && (
        <div className="mb-2">
          <p className="text-sm text-gray-500">교체 부품</p>
          <p className="font-medium">{maintenance.parts.map(part => part.name).join(', ')}</p>
        </div>
      )}
      
      {maintenance.notes && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-600">{maintenance.notes}</p>
        </div>
      )}
      
      {maintenance.documents && maintenance.documents.length > 0 && (
        <div className="mt-2 flex items-center">
          <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <p className="text-sm text-gray-500">{maintenance.documents.length}개 문서 첨부됨</p>
        </div>
      )}
    </div>
  );
}; 