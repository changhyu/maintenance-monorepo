import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Typography, Button, Spin, Alert, Space, Tag } from 'antd';
import { ReloadOutlined, DashboardOutlined, HddOutlined, DesktopOutlined, FileOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

interface SystemInfo {
  system: string;
  node: string;
  release: string;
  version: string;
  machine: string;
  processor: string;
  python_version: string;
  current_directory: string;
  timestamp: string;
}

interface MemoryInfo {
  total: string;
  available: string;
  used: string;
  percentage: number;
  swap: {
    total: string;
    free: string;
    used: string;
    percentage: number;
  };
}

interface CpuInfo {
  physical_cores: number;
  total_cores: number;
  max_frequency: string;
  current_frequency: string;
  cpu_usage_per_core: string[];
  total_cpu_usage: string;
}

interface ProcessInfo {
  pid: number;
  name: string;
  username: string;
  memory_percent: string;
  cpu_percent: string;
  status: string;
  create_time?: string;
}

interface DiskInfo {
  path: string;
  total: string;
  used: string;
  free: string;
  percentage: number;
}

interface LogFile {
  filename: string;
  size: number;
  modified: string;
  created: string;
}

const SystemMonitor: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [cpuInfo, setCpuInfo] = useState<CpuInfo | null>(null);
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('system');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

  useEffect(() => {
    fetchData();
    // 60초마다 데이터 새로고침
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [systemResp, memoryResp, cpuResp, diskResp, processesResp, logsResp] = await Promise.all([
        axios.get(`${API_BASE_URL}/system/info`),
        axios.get(`${API_BASE_URL}/system/memory`),
        axios.get(`${API_BASE_URL}/system/cpu`),
        axios.get(`${API_BASE_URL}/system/disk`),
        axios.get(`${API_BASE_URL}/system/processes`),
        axios.get(`${API_BASE_URL}/logs/files`)
      ]);

      setSystemInfo(systemResp.data);
      setMemoryInfo(memoryResp.data);
      setCpuInfo(cpuResp.data);
      setDiskInfo(diskResp.data);
      setProcesses(processesResp.data.processes);
      setLogFiles(logsResp.data.log_files);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('시스템 정보 로드 오류:', err);
      setError('시스템 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'green';
      case 'sleeping':
        return 'blue';
      case 'stopped':
        return 'red';
      default:
        return 'gray';
    }
  };

  const processColumns = [
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      sorter: (a: ProcessInfo, b: ProcessInfo) => a.pid - b.pid,
    },
    {
      title: '프로세스명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '사용자',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'CPU 사용량',
      dataIndex: 'cpu_percent',
      key: 'cpu_percent',
      sorter: (a: ProcessInfo, b: ProcessInfo) => 
        parseFloat(a.cpu_percent.replace('%', '')) - 
        parseFloat(b.cpu_percent.replace('%', '')),
      render: (text: string) => {
        const value = parseFloat(text.replace('%', ''));
        let color = 'green';
        if (value > 50) color = 'orange';
        if (value > 80) color = 'red';
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '메모리 사용량',
      dataIndex: 'memory_percent',
      key: 'memory_percent',
      sorter: (a: ProcessInfo, b: ProcessInfo) => 
        parseFloat(a.memory_percent.replace('%', '')) - 
        parseFloat(b.memory_percent.replace('%', '')),
      render: (text: string) => {
        const value = parseFloat(text.replace('%', ''));
        let color = 'green';
        if (value > 15) color = 'orange';
        if (value > 30) color = 'red';
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
  ];

  const logFileColumns = [
    {
      title: '파일명',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => (
        <Button 
          type="link" 
          onClick={() => window.open(`${API_BASE_URL}/logs/content/${text}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '크기',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatBytes(size),
      sorter: (a: LogFile, b: LogFile) => a.size - b.size,
    },
    {
      title: '수정일',
      dataIndex: 'modified',
      key: 'modified',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: LogFile, b: LogFile) => new Date(a.modified).getTime() - new Date(b.modified).getTime(),
    },
  ];

  if (loading && !systemInfo) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="시스템 정보를 불러오는 중..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="오류"
        description={error}
        action={
          <Button onClick={fetchData} type="primary">
            다시 시도
          </Button>
        }
      />
    );
  }

  return (
    <div className="system-monitor">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>
          <DashboardOutlined /> 시스템 모니터링 대시보드
        </Title>
        <Space>
          <Text type="secondary">
            마지막 업데이트: {lastUpdated.toLocaleString()}
          </Text>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchData}
            type="primary"
          >
            새로고침
          </Button>
        </Space>
      </div>

      {/* 시스템 정보 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title={<><HddOutlined /> 시스템 정보</>} bordered={false}>
            {systemInfo && (
              <div>
                <Statistic title="운영체제" value={systemInfo.system} />
                <Statistic title="호스트명" value={systemInfo.node} />
                <Statistic title="커널 버전" value={systemInfo.release} />
                <Statistic title="아키텍처" value={systemInfo.machine} />
                <Statistic title="프로세서" value={systemInfo.processor} />
              </div>
            )}
          </Card>
        </Col>

        {/* 메모리 정보 */}
        <Col span={12}>
          <Card title={<><DesktopOutlined /> 메모리 사용량</>} bordered={false}>
            {memoryInfo && (
              <div>
                <Statistic title="전체 메모리" value={memoryInfo.total} />
                <Statistic title="사용 가능한 메모리" value={memoryInfo.available} />
                <div style={{ marginTop: 20 }}>
                  <Text>메모리 사용량</Text>
                  <Progress 
                    percent={memoryInfo.percentage} 
                    status={memoryInfo.percentage > 90 ? "exception" : memoryInfo.percentage > 70 ? "active" : "normal"}
                  />
                </div>
                <div style={{ marginTop: 20 }}>
                  <Text>스왑 사용량</Text>
                  <Progress 
                    percent={memoryInfo.swap.percentage} 
                    status={memoryInfo.swap.percentage > 80 ? "exception" : "normal"}
                  />
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* CPU 정보 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={<><HddOutlined /> CPU 정보</>} bordered={false}>
            {cpuInfo && (
              <div>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic title="물리적 코어" value={cpuInfo.physical_cores} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="논리적 코어" value={cpuInfo.total_cores} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="최대 주파수" value={cpuInfo.max_frequency} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="현재 주파수" value={cpuInfo.current_frequency} />
                  </Col>
                </Row>
                <div style={{ marginTop: 20 }}>
                  <Text>전체 CPU 사용량: {cpuInfo.total_cpu_usage}</Text>
                  <Progress 
                    percent={parseFloat(cpuInfo.total_cpu_usage.replace('%', ''))} 
                    status={parseFloat(cpuInfo.total_cpu_usage.replace('%', '')) > 90 ? "exception" : "normal"}
                  />
                </div>
                <div style={{ marginTop: 20 }}>
                  <Text>코어별 사용량</Text>
                  <Row gutter={[8, 8]} style={{ marginTop: 10 }}>
                    {cpuInfo.cpu_usage_per_core.map((usage, idx) => (
                      <Col span={6} key={idx}>
                        <Text>코어 {idx + 1}: {usage}</Text>
                        <Progress 
                          percent={parseFloat(usage.replace('%', ''))} 
                          size="small"
                          status={parseFloat(usage.replace('%', '')) > 90 ? "exception" : "normal"}
                        />
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 프로세스 목록 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={<><DesktopOutlined /> 실행 중인 프로세스</>} bordered={false}>
            <Table 
              dataSource={processes} 
              columns={processColumns} 
              rowKey="pid"
              pagination={{ pageSize: 5 }}
              size="middle"
            />
          </Card>
        </Col>
      </Row>

      {/* 로그 파일 목록 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={<><FileOutlined /> 로그 파일</>} bordered={false}>
            <Table 
              dataSource={logFiles} 
              columns={logFileColumns} 
              rowKey="filename"
              pagination={{ pageSize: 5 }}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemMonitor;