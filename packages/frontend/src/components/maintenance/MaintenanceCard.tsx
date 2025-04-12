import React from 'react';

// 업데이트된 MaintenanceRecord 타입 정의
interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  date: string;
  cost: number;
  status: string; // scheduled, in_progress, completed, cancelled
  technician?: string;
  performedBy?: string; // 기술자 정보
  provider?: string;    // 정비소
  mileage?: number;
  notes?: string;
  completionDate?: string;
  parts?: {
    id: string;
    name: string;
    partNumber?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    condition?: string;
  }[];
  documents?: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    uploadedAt?: string;
    description?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

interface MaintenanceCardProps {
  maintenance: MaintenanceRecord;
  onClick?: () => void;
  className?: string;
  showDetails?: boolean;
}

// 날짜 포맷 함수
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ko-KR');
};

// 상대적 시간 표시 함수
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}분 전`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  } else if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
  } else {
    return formatDate(dateString);
  }
};

// 상태에 따른 표시 함수
const getStatusDisplay = (status: string): { text: string; color: string } => {
  switch (status.toLowerCase()) {
    case 'scheduled':
      return { text: '예약됨', color: 'bg-blue-100 text-blue-800' };
    case 'in_progress':
      return { text: '진행 중', color: 'bg-yellow-100 text-yellow-800' };
    case 'completed':
      return { text: '완료됨', color: 'bg-green-100 text-green-800' };
    case 'cancelled':
      return { text: '취소됨', color: 'bg-red-100 text-red-800' };
    default:
      return { text: status, color: 'bg-gray-100 text-gray-800' };
  }
};

export const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
  maintenance,
  onClick,
  className = '',
  showDetails = false
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
      case 'oil_change':
        return 'bg-indigo-100 text-indigo-800';
      case 'seasonal':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 총 비용 계산 (부품이 있는 경우)
  const totalCost =
    maintenance.cost +
    (maintenance.parts?.reduce((sum, part) => sum + (part.totalCost || 0), 0) || 0);

  // 상태 정보
  const statusInfo = getStatusDisplay(maintenance.status);

  return (
    <div
      className={`bg-white shadow rounded-lg p-4 mb-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(maintenance.type)}`}
            >
              {maintenance.type}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
            >
              {statusInfo.text}
            </span>
          </div>
          <h3 className="text-lg font-medium mt-1">{maintenance.description}</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{maintenance.updatedAt ? getRelativeTime(maintenance.updatedAt) : getRelativeTime(maintenance.date)}</p>
          <p className="font-medium text-lg">{totalCost.toLocaleString()}원</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p className="text-sm text-gray-500">정비 예정일</p>
          <p className="font-medium">{formatDate(maintenance.date)}</p>
        </div>
        {maintenance.completionDate && (
          <div>
            <p className="text-sm text-gray-500">완료일</p>
            <p className="font-medium">{formatDate(maintenance.completionDate)}</p>
          </div>
        )}
        {maintenance.mileage && (
          <div>
            <p className="text-sm text-gray-500">주행거리</p>
            <p className="font-medium">{maintenance.mileage.toLocaleString()} km</p>
          </div>
        )}
      </div>

      {(maintenance.provider || maintenance.performedBy) && (
        <div className="mb-2">
          <p className="text-sm text-gray-500">{maintenance.provider ? '정비소' : '담당자'}</p>
          <p className="font-medium">{maintenance.provider || maintenance.performedBy}</p>
        </div>
      )}

      {showDetails && maintenance.parts && maintenance.parts.length > 0 && (
        <div className="mb-2">
          <p className="text-sm text-gray-500 mb-1">교체 부품</p>
          <div className="space-y-1">
            {maintenance.parts.map(part => (
              <div key={part.id} className="flex justify-between items-center text-sm">
                <span>{part.name} {part.quantity > 1 ? `(${part.quantity}개)` : ''}</span>
                <span className="font-medium">{part.totalCost.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!showDetails && maintenance.parts && maintenance.parts.length > 0 && (
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
          <svg
            className="h-4 w-4 text-gray-400 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          <p className="text-sm text-gray-500">{maintenance.documents.length}개 문서 첨부됨</p>
        </div>
      )}
      
      {showDetails && maintenance.documents && maintenance.documents.length > 0 && (
        <div className="mt-2 space-y-1">
          {maintenance.documents.map(doc => (
            <a 
              key={doc.id} 
              href={doc.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-sm text-blue-600 hover:underline"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              {doc.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceCard;
