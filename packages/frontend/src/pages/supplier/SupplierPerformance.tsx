import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Select, Row, Col, Typography, Tag, Tooltip, Button, Space, Statistic } from 'antd';
import type { TableColumnsType } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import SupplierServiceImpl from '../../services/SupplierService';
import { SupplierPerformance, SupplierPerformanceFilter } from '../../types/supplier';
import { Helmet } from 'react-helmet';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const SupplierPerformancePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [performanceData, setPerformanceData] = useState<SupplierPerformance[]>([]);
  const [filters, setFilters] = useState<SupplierPerformanceFilter>({});
  const [statistics, setStatistics] = useState({
    averageDeliveryRate: 0,
    averageQualityScore: 0,
    averageResponseTime: 0,
    averageTotalScore: 0,
  });

  const supplierService = SupplierServiceImpl.getInstance();

  const columns: TableColumnsType<SupplierPerformance> = [
    {
      title: '공급업체명',
      dataIndex: 'supplierName',
      key: 'supplierName',
      sorter: (a, b) => a.supplierName.localeCompare(b.supplierName),
      render: (text, record) => (
        <Tooltip title={record.comments}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '납기 준수율',
      dataIndex: 'deliveryRate',
      key: 'deliveryRate',
      render: (value) => (
        <Tag color={value >= 95 ? 'success' : value >= 90 ? 'warning' : 'error'}>
          {value.toFixed(1)}%
        </Tag>
      ),
      sorter: (a, b) => a.deliveryRate - b.deliveryRate,
    },
    {
      title: '품질 점수',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      render: (value) => (
        <Tag color={value >= 4.5 ? 'success' : value >= 4.0 ? 'warning' : 'error'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.qualityScore - b.qualityScore,
    },
    {
      title: '응답 시간',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (value) => (
        <Tag color={value <= 24 ? 'success' : value <= 48 ? 'warning' : 'error'}>
          {value}시간
        </Tag>
      ),
      sorter: (a, b) => a.responseTime - b.responseTime,
    },
    {
      title: '비용 효율성',
      dataIndex: 'costEfficiency',
      key: 'costEfficiency',
      render: (value) => (
        <Tag color={value >= 4.5 ? 'success' : value >= 4.0 ? 'warning' : 'error'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.costEfficiency - b.costEfficiency,
    },
    {
      title: '총점',
      dataIndex: 'totalScore',
      key: 'totalScore',
      render: (value) => (
        <Tag color={value >= 4.5 ? 'success' : value >= 4.0 ? 'warning' : 'error'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.totalScore - b.totalScore,
    },
    {
      title: '평가 기간',
      dataIndex: 'evaluationPeriod',
      key: 'evaluationPeriod',
    },
    {
      title: '평가자',
      dataIndex: 'evaluatedBy',
      key: 'evaluatedBy',
    },
  ];

  useEffect(() => {
    fetchPerformanceData();
  }, [filters]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      // 개발 단계에서는 목업 데이터 사용
      const data = supplierService.getMockPerformanceData();
      setPerformanceData(data);
      
      // 통계 계산
      calculateStatistics(data);
    } catch (error) {
      console.error('성과 데이터 조회 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (data: SupplierPerformance[]) => {
    if (data.length === 0) return;

    const stats = data.reduce(
      (acc, curr) => ({
        averageDeliveryRate: acc.averageDeliveryRate + curr.deliveryRate,
        averageQualityScore: acc.averageQualityScore + curr.qualityScore,
        averageResponseTime: acc.averageResponseTime + curr.responseTime,
        averageTotalScore: acc.averageTotalScore + curr.totalScore,
      }),
      {
        averageDeliveryRate: 0,
        averageQualityScore: 0,
        averageResponseTime: 0,
        averageTotalScore: 0,
      }
    );

    const count = data.length;
    setStatistics({
      averageDeliveryRate: Number((stats.averageDeliveryRate / count).toFixed(1)),
      averageQualityScore: Number((stats.averageQualityScore / count).toFixed(1)),
      averageResponseTime: Number((stats.averageResponseTime / count).toFixed(1)),
      averageTotalScore: Number((stats.averageTotalScore / count).toFixed(1)),
    });
  };

  const handlePeriodChange = (dates: any) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: undefined,
        endDate: undefined,
      }));
    }
  };

  const handleSupplierChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      supplierId: value === 'all' ? undefined : value,
    }));
  };

  const handleExportData = () => {
    // TODO: 데이터 내보내기 구현
    console.log('데이터 내보내기');
  };

  return (
    <>
      <Helmet>
        <title>공급업체 성과 관리 - 차량 정비 관리 시스템</title>
      </Helmet>

      <div style={{ padding: '24px' }}>
        <Space style={{ marginBottom: '24px', width: '100%', justifyContent: 'space-between' }}>
          <Title level={2}>공급업체 성과 관리</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchPerformanceData}
              loading={loading}
            >
              새로고침
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportData}
            >
              내보내기
            </Button>
          </Space>
        </Space>

        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="평균 납기 준수율"
                value={statistics.averageDeliveryRate}
                suffix="%"
                precision={1}
                valueStyle={{ color: statistics.averageDeliveryRate >= 95 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="평균 품질 점수"
                value={statistics.averageQualityScore}
                precision={1}
                valueStyle={{ color: statistics.averageQualityScore >= 4.5 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="평균 응답 시간"
                value={statistics.averageResponseTime}
                suffix="시간"
                precision={1}
                valueStyle={{ color: statistics.averageResponseTime <= 24 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="평균 총점"
                value={statistics.averageTotalScore}
                precision={1}
                valueStyle={{ color: statistics.averageTotalScore >= 4.5 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>
        
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={handlePeriodChange}
                placeholder={['시작일', '종료일']}
              />
            </Col>
            <Col span={12}>
              <Select
                style={{ width: '100%' }}
                placeholder="공급업체 선택"
                onChange={handleSupplierChange}
                allowClear
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'SUP001', label: '현대모비스' },
                  { value: 'SUP002', label: '만도' },
                  { value: 'SUP003', label: '한온시스템' },
                ]}
              />
            </Col>
          </Row>
        </Card>

        <Card>
          <Table
            columns={columns}
            dataSource={performanceData}
            loading={loading}
            rowKey="id"
            pagination={{
              total: performanceData.length,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `총 ${total}개 항목`,
            }}
          />
        </Card>
      </div>
    </>
  );
};

export default SupplierPerformancePage; 