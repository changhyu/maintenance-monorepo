import React, { createContext, useContext, useState } from 'react';
import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaintenanceReservation } from '../types/maintenance';
import { useReservation } from './ReservationContext';
import { generatePDF, generateSummaryPDF, generateTechnicianPDF } from '../utils/pdfGenerator';
import { generateExcel, generateSummaryExcel, generateTechnicianExcel } from '../utils/excelGenerator';

export interface ReportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  includeFields: {
    status: boolean;
    serviceType: boolean;
    priority: boolean;
    duration: boolean;
    cost: boolean;
    location: boolean;
    notes: boolean;
    parts: boolean;
  };
  groupBy: 'none' | 'status' | 'serviceType' | 'priority' | 'technician';
}

interface ReportContextType {
  generating: boolean;
  error: string | null;
  generateReport: (options: ReportOptions) => Promise<string>;
  generateSummaryReport: () => Promise<string>;
  generateTechnicianReport: (technicianId: string) => Promise<void>;
  generateCustomReport: (reservations: MaintenanceReservation[], options: ReportOptions) => Promise<void>;
}

const defaultReportOptions: ReportOptions = {
  format: 'pdf',
  dateRange: {
    startDate: null,
    endDate: null,
  },
  includeFields: {
    status: true,
    serviceType: true,
    priority: true,
    duration: true,
    cost: true,
    location: true,
    notes: false,
    parts: false,
  },
  groupBy: 'none',
};

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reservations } = useReservation();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatReservationData = (
    data: MaintenanceReservation[],
    options: ReportOptions
  ) => {
    const statusText = {
      pending: '대기',
      confirmed: '확정',
      in_progress: '진행',
      completed: '완료',
      cancelled: '취소',
    };

    const serviceTypeText = {
      regular: '정기',
      emergency: '긴급',
      inspection: '점검',
      repair: '수리',
    };

    const priorityText = {
      high: '높음',
      medium: '중간',
      low: '낮음',
    };

    let formattedData = data.map(reservation => {
      const base = {
        '예약 ID': reservation.id,
        '차량 ID': reservation.vehicleId,
        '고객 ID': reservation.customerId,
        '예약 일시': new Date(reservation.scheduledDate).toLocaleString(),
      };

      if (options.includeFields.status) {
        base['상태'] = statusText[reservation.status];
      }
      if (options.includeFields.serviceType) {
        base['서비스 유형'] = serviceTypeText[reservation.serviceType];
      }
      if (options.includeFields.priority) {
        base['우선순위'] = priorityText[reservation.priority];
      }
      if (options.includeFields.duration) {
        base['예상 소요시간'] = `${reservation.estimatedDuration}분`;
        if (reservation.actualDuration) {
          base['실제 소요시간'] = `${reservation.actualDuration}분`;
        }
      }
      if (options.includeFields.cost && reservation.cost) {
        base['비용'] = `${reservation.cost.toLocaleString()}원`;
      }
      if (options.includeFields.location && reservation.location) {
        base['위치'] = `${reservation.location.name} (${reservation.location.address})`;
      }
      if (options.includeFields.notes && reservation.notes) {
        base['메모'] = reservation.notes;
      }
      if (options.includeFields.parts && reservation.parts) {
        base['부품'] = reservation.parts
          .map(part => `${part.name} ${part.quantity}개 (${part.unitPrice.toLocaleString()}원)`)
          .join(', ');
      }

      return base;
    });

    if (options.groupBy !== 'none') {
      const grouped: { [key: string]: any[] } = {};
      formattedData.forEach(item => {
        let key = '';
        switch (options.groupBy) {
          case 'status':
            key = item['상태'];
            break;
          case 'serviceType':
            key = item['서비스 유형'];
            break;
          case 'priority':
            key = item['우선순위'];
            break;
          case 'technician':
            key = item['기술자 ID'] || '미배정';
            break;
        }
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });
      formattedData = Object.entries(grouped).flatMap(([group, items]) => [
        { group },
        ...items,
      ]);
    }

    return formattedData;
  };

  const generateCSV = (data: any[]) => {
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');
    return csv;
  };

  const saveAndShare = async (content: string, filename: string) => {
    try {
      const path = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, content);

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path);
        } else {
          await Share.share({ url: path });
        }
      }
    } catch (err) {
      throw new Error('보고서 저장 및 공유 중 오류가 발생했습니다.');
    }
  };

  const generateReport = async (options: ReportOptions): Promise<string> => {
    try {
      setGenerating(true);
      setError(null);

      let filteredReservations = [...reservations];
      if (options.dateRange.startDate && options.dateRange.endDate) {
        filteredReservations = reservations.filter(reservation => {
          const date = new Date(reservation.scheduledDate);
          return (
            date >= options.dateRange.startDate! &&
            date <= options.dateRange.endDate!
          );
        });
      }

      const formattedData = formatReservationData(filteredReservations, options);

      if (options.format === 'pdf') {
        const filePath = await generatePDF(formattedData, {
          title: '정비 예약 보고서',
          subtitle: options.dateRange.startDate
            ? `${options.dateRange.startDate.toLocaleDateString()} ~ ${options.dateRange.endDate?.toLocaleDateString()}`
            : undefined,
        }, options.groupBy);
        await Sharing.shareAsync(filePath);
      } else if (options.format === 'csv') {
        const csv = generateCSV(formattedData);
        const filename = `maintenance_report_${new Date().toISOString()}.csv`;
        await saveAndShare(csv, filename);
      } else if (options.format === 'excel') {
        const filePath = await generateExcel(formattedData, {
          title: '정비 예약 보고서',
          subtitle: options.dateRange.startDate
            ? `${options.dateRange.startDate.toLocaleDateString()} ~ ${options.dateRange.endDate?.toLocaleDateString()}`
            : undefined,
        }, options.groupBy);
        await Sharing.shareAsync(filePath);
      }

      return '보고서 생성 완료';
    } catch (err) {
      setError(err instanceof Error ? err.message : '보고서 생성 중 오류가 발생했습니다.');
      console.error('보고서 생성 오류:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  const generateSummaryReport = async (): Promise<string> => {
    try {
      setGenerating(true);
      setError(null);

      const summary = {
        총_예약_수: reservations.length,
        상태별_통계: {
          대기: reservations.filter(r => r.status === 'pending').length,
          확정: reservations.filter(r => r.status === 'confirmed').length,
          진행: reservations.filter(r => r.status === 'in_progress').length,
          완료: reservations.filter(r => r.status === 'completed').length,
          취소: reservations.filter(r => r.status === 'cancelled').length,
        },
        서비스_유형별_통계: {
          정기: reservations.filter(r => r.serviceType === 'regular').length,
          긴급: reservations.filter(r => r.serviceType === 'emergency').length,
          점검: reservations.filter(r => r.serviceType === 'inspection').length,
          수리: reservations.filter(r => r.serviceType === 'repair').length,
        },
        우선순위별_통계: {
          높음: reservations.filter(r => r.priority === 'high').length,
          중간: reservations.filter(r => r.priority === 'medium').length,
          낮음: reservations.filter(r => r.priority === 'low').length,
        },
        평균_소요시간: reservations
          .filter(r => r.actualDuration)
          .reduce((acc, cur) => acc + (cur.actualDuration || 0), 0) /
          reservations.filter(r => r.actualDuration).length,
        총_비용: reservations
          .filter(r => r.cost)
          .reduce((acc, cur) => acc + (cur.cost || 0), 0),
      };

      if (options.format === 'pdf') {
        const filePath = await generateSummaryPDF(summary);
        await Sharing.shareAsync(filePath);
      } else if (options.format === 'excel') {
        const filePath = await generateSummaryExcel(summary);
        await Sharing.shareAsync(filePath);
      }

      return '요약 보고서 생성 완료';
    } catch (err) {
      setError(err instanceof Error ? err.message : '요약 보고서 생성 중 오류가 발생했습니다.');
      console.error('요약 보고서 생성 오류:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  const generateTechnicianReport = async (technicianId: string) => {
    try {
      setGenerating(true);
      setError(null);

      const technicianReservations = reservations.filter(
        r => r.technicianId === technicianId
      );

      const report = {
        기술자_ID: technicianId,
        총_예약_수: technicianReservations.length,
        완료_예약_수: technicianReservations.filter(r => r.status === 'completed').length,
        평균_소요시간: technicianReservations
          .filter(r => r.actualDuration)
          .reduce((acc, cur) => acc + (cur.actualDuration || 0), 0) /
          technicianReservations.filter(r => r.actualDuration).length,
        서비스_유형별_통계: {
          정기: technicianReservations.filter(r => r.serviceType === 'regular').length,
          긴급: technicianReservations.filter(r => r.serviceType === 'emergency').length,
          점검: technicianReservations.filter(r => r.serviceType === 'inspection').length,
          수리: technicianReservations.filter(r => r.serviceType === 'repair').length,
        },
        예약_목록: formatReservationData(
          technicianReservations,
          defaultReportOptions
        ),
      };

      if (options.format === 'pdf') {
        const filePath = await generateTechnicianPDF(report);
        await Sharing.shareAsync(filePath);
      } else if (options.format === 'excel') {
        const filePath = await generateTechnicianExcel(report);
        await Sharing.shareAsync(filePath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '기술자 보고서 생성 중 오류가 발생했습니다.');
      console.error('기술자 보고서 생성 오류:', err);
    } finally {
      setGenerating(false);
    }
  };

  const generateCustomReport = async (
    customReservations: MaintenanceReservation[],
    options: ReportOptions
  ) => {
    try {
      setGenerating(true);
      setError(null);

      const formattedData = formatReservationData(customReservations, options);

      if (options.format === 'pdf') {
        const filePath = await generatePDF(formattedData, {
          title: '맞춤 보고서',
          subtitle: options.dateRange.startDate
            ? `${options.dateRange.startDate.toLocaleDateString()} ~ ${options.dateRange.endDate?.toLocaleDateString()}`
            : undefined,
        }, options.groupBy);
        await Sharing.shareAsync(filePath);
      } else if (options.format === 'csv') {
        const csv = generateCSV(formattedData);
        const filename = `custom_report_${new Date().toISOString()}.csv`;
        await saveAndShare(csv, filename);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '맞춤 보고서 생성 중 오류가 발생했습니다.');
      console.error('맞춤 보고서 생성 오류:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ReportContext.Provider
      value={{
        generating,
        error,
        generateReport,
        generateSummaryReport,
        generateTechnicianReport,
        generateCustomReport,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
};

export const useReport = () => {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
}; 