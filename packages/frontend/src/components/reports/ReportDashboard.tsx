import React, { useState, useEffect } from 'react';

import { Card, Button, Table, Space, Typography } from 'antd';
import moment from 'moment';
import 'moment/locale/ko';

import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  Legend,
  Bar
} from 'recharts';

import ReportChart from './ReportChart';
import { reportService, ReportType } from '../../services/reportService';

// 날짜 로케일 설정
moment.locale('ko');

// 단축 변수
const { Title } = Typography;

// 저장된 보고서 인터페이스
interface LocalReport {
  id: string;
  name: string;
  type: ReportType;
  createdAt: string;
  data: any;
}

/**
 * 보고서 대시보드 컴포넌트
 */
const ReportDashboard: React.FC = () => {
  // 보고서 인스턴스 생성
  const reportInstance = reportService;

  // 전체 보고서 데이터
  const [reports, setReports] = useState<LocalReport[]>([]);

  // 요약 데이터
  const [summary, setSummary] = useState<any>(null);

  // 로딩 상태
  const [loading, setLoading] = useState<boolean>(false);

  // 초기 데이터 로드
  useEffect(() => {
    // 저장된 보고서 로드
    const loadReports = async () => {
      setLoading(true);
      try {
        const loadedReports = await reportInstance.getReports();
        // Report[] 타입을 LocalReport[] 타입으로 변환
        const formattedReports = loadedReports.map(report => ({
          id: report.id,
          name: report.title, // title을 name으로 매핑
          type: report.type,
          createdAt: report.createdAt,
          data: report.data
        }));
        setReports(formattedReports);

        // 요약 데이터 로드
        const summaryData = await reportInstance.getReportSummary();
        setSummary(summaryData);
      } catch (error) {
        console.error('보고서 로드 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  return (
    <div className="report-dashboard">
      <Card title="보고서 대시보드" className="mb-4">
        <div className="summary-section">
          <div className="row">
            {/* 보고서 통계 */}
            <div className="col-md-6">
              <Card title="보고서 통계" loading={loading}>
                {summary && (
                  <div>
                    <p>
                      <strong>총 보고서:</strong> {summary.totalReports}개
                    </p>
                    <p>
                      <strong>최근 생성:</strong> {moment(summary.lastReportDate).fromNow()}
                    </p>
                    <p>
                      <strong>완료율 보고서:</strong> {summary.reportsByType.completionRate}개
                    </p>
                    <p>
                      <strong>비용 보고서:</strong> {summary.reportsByType.costAnalysis}개
                    </p>
                    <p>
                      <strong>정비 예측 보고서:</strong> {summary.reportsByType.maintenanceForecast}
                      개
                    </p>
                  </div>
                )}
              </Card>
            </div>

            {/* 보고서 유형 분포 */}
            <div className="col-md-6">
              <Card title="보고서 유형 분포" loading={loading}>
                {summary && (
                  <BarChart
                    width={300}
                    height={200}
                    data={[
                      { name: '완료율', value: summary.reportsByType.completionRate },
                      { name: '비용 분석', value: summary.reportsByType.costAnalysis },
                      { name: '정비 예측', value: summary.reportsByType.maintenanceForecast },
                      { name: '차량 이력', value: summary.reportsByType.vehicleHistory }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartTooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                )}
              </Card>
            </div>
          </div>
        </div>
      </Card>

      {/* 최근 보고서 */}
      <Card title="최근 보고서" className="mb-4">
        <Table
          dataSource={reports}
          rowKey="id"
          loading={loading}
          columns={[
            {
              title: '보고서 이름',
              dataIndex: 'name',
              key: 'name'
            },
            {
              title: '유형',
              dataIndex: 'type',
              key: 'type',
              render: (type: ReportType) => {
                switch (type) {
                  case ReportType.COMPLETION_RATE:
                    return '완료율 보고서';
                  case ReportType.COST_ANALYSIS:
                    return '비용 분석 보고서';
                  case ReportType.MAINTENANCE_FORECAST:
                    return '정비 예측 보고서';
                  case ReportType.VEHICLE_HISTORY:
                    return '차량 이력 보고서';
                  default:
                    return '기타 보고서';
                }
              }
            },
            {
              title: '생성일',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (date: string) => moment(date).format('YYYY-MM-DD HH:mm')
            },
            {
              title: '액션',
              key: 'action',
              render: (_, record: LocalReport) => (
                <Space size="middle">
                  <Button size="small" onClick={() => console.log('보고서 보기', record.id)}>
                    보기
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* 차트 섹션 */}
      <Card title="보고서 차트" className="mb-4">
        {summary && <ReportChart data={summary.chartData} type={ReportType.MAINTENANCE_SUMMARY} chartType="line" />}
      </Card>
    </div>
  );
};

export default ReportDashboard;
