import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Table, Typography, Button, Spin, Alert, Space, Tag, Tabs, List, Timeline, Collapse, Statistic } from 'antd';
import { ReloadOutlined, BranchesOutlined, CodeOutlined, HistoryOutlined, FileOutlined, DiffOutlined, UserOutlined } from '@ant-design/icons';
import axios, { AxiosError } from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface Branch {
  name: string;
  commit: string;
  is_active: boolean;
}

interface Commit {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  short_hash: string;
}

interface Status {
  untracked_files: string[];
  unstaged_changes: string[];
  staged_changes: string[];
  branch: string;
  clean: boolean;
}

interface DiffInfo {
  file: string;
  changes: string;
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface ApiErrorResponse {
  error: string;
}

const GitMonitor: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [diffs, setDiffs] = useState<DiffInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const API_BASE_URL = process.env.REACT_APP_MONITOR_API_URL || 'http://127.0.0.1:8000/api/v1';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchesResp, commitsResp, statusResp] = await Promise.all([
        axios.get<ApiResponse<{ branches: Branch[] }>>(`${API_BASE_URL}/git/branches`),
        axios.get<ApiResponse<{ commits: Commit[] }>>(`${API_BASE_URL}/git/commits`),
        axios.get<ApiResponse<Status>>(`${API_BASE_URL}/git/status`)
      ]);

      if (branchesResp.data.error || commitsResp.data.error || statusResp.data.error) {
        throw new Error('API 응답에 오류가 포함되어 있습니다.');
      }

      setBranches(branchesResp.data.data.branches);
      setCommits(commitsResp.data.data.commits);
      setStatus(statusResp.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      console.error('Git 정보 로드 오류:', error);
      setError(error.response?.data?.error || 'Git 저장소 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchDiff = useCallback(async (file: string) => {
    try {
      const response = await axios.get<ApiResponse<{ diff: string }>>(`${API_BASE_URL}/git/diff?file=${file}`);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setDiffs(prevDiffs => {
        const existingDiffIndex = prevDiffs.findIndex(diff => diff.file === file);
        if (existingDiffIndex >= 0) {
          const newDiffs = [...prevDiffs];
          newDiffs[existingDiffIndex] = { file, changes: response.data.data.diff };
          return newDiffs;
        }
        return [...prevDiffs, { file, changes: response.data.data.diff }];
      });
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      console.error(`${file}의 diff 정보를 가져오는 중 오류가 발생했습니다:`, error);
    }
  }, [API_BASE_URL]);

  const branchColumns = useMemo(() => [
    {
      title: '브랜치명',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Branch) => (
        <Space>
          {text}
          {record.is_active && <Tag color="green">활성</Tag>}
        </Space>
      ),
    },
    {
      title: '최신 커밋',
      dataIndex: 'commit',
      key: 'commit',
      render: (text: string) => <Text code>{text.substring(0, 7)}</Text>,
    },
  ], []);

  const commitColumns = useMemo(() => [
    {
      title: '커밋 해시',
      dataIndex: 'short_hash',
      key: 'hash',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '작성자',
      dataIndex: 'author',
      key: 'author',
      render: (text: string, record: Commit) => (
        <Space>
          <UserOutlined />
          {text} ({record.email})
        </Space>
      ),
    },
    {
      title: '날짜',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '메시지',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ], []);

  if (loading && branches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Git 저장소 정보를 불러오는 중..." />
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
    <div className="git-monitor" role="main" aria-label="Git 저장소 모니터링">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>
          <CodeOutlined /> Git 저장소 모니터링
        </Title>
        <Space>
          <Text type="secondary">
            마지막 업데이트: {lastUpdated.toLocaleString()}
          </Text>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchData}
            type="primary"
            aria-label="새로고침"
          >
            새로고침
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="status" accessibilityLabel="Git 정보 탭">
        <TabPane 
          tab={
            <span>
              <DiffOutlined />
              저장소 상태
            </span>
          } 
          key="status"
        >
          {status && (
            <div>
              <Card bordered={false}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Statistic 
                    title="현재 브랜치" 
                    value={status.branch} 
                    prefix={<BranchesOutlined />} 
                  />
                  
                  <Statistic 
                    title="저장소 상태" 
                    value={status.clean ? "깨끗함" : "변경사항 있음"} 
                    valueStyle={{ color: status.clean ? '#3f8600' : '#cf1322' }}
                  />

                  <Collapse ghost>
                    {status.untracked_files.length > 0 && (
                      <Panel header={`추적되지 않는 파일 (${status.untracked_files.length})`} key="untracked">
                        <List
                          size="small"
                          dataSource={status.untracked_files}
                          renderItem={file => (
                            <List.Item>
                              <FileOutlined /> {file}
                            </List.Item>
                          )}
                        />
                      </Panel>
                    )}

                    {status.unstaged_changes.length > 0 && (
                      <Panel header={`스테이징되지 않은 변경사항 (${status.unstaged_changes.length})`} key="unstaged">
                        <List
                          size="small"
                          dataSource={status.unstaged_changes}
                          renderItem={file => (
                            <List.Item actions={[
                              <Button 
                                type="link" 
                                onClick={() => fetchDiff(file)}
                                size="small"
                                aria-label={`${file} 변경사항 보기`}
                              >
                                변경사항 보기
                              </Button>
                            ]}>
                              <FileOutlined /> {file}
                            </List.Item>
                          )}
                        />
                        
                        {diffs.filter(diff => status.unstaged_changes.includes(diff.file)).map(diff => (
                          <div key={diff.file} style={{ marginTop: 10 }}>
                            <Text strong>{diff.file} 변경사항:</Text>
                            <pre style={{ 
                              backgroundColor: '#f5f5f5', 
                              padding: 10, 
                              borderRadius: 4,
                              maxHeight: 300,
                              overflow: 'auto' 
                            }}>
                              {diff.changes}
                            </pre>
                          </div>
                        ))}
                      </Panel>
                    )}

                    {status.staged_changes.length > 0 && (
                      <Panel header={`스테이징된 변경사항 (${status.staged_changes.length})`} key="staged">
                        <List
                          size="small"
                          dataSource={status.staged_changes}
                          renderItem={file => (
                            <List.Item actions={[
                              <Button 
                                type="link" 
                                onClick={() => fetchDiff(file)}
                                size="small"
                                aria-label={`${file} 변경사항 보기`}
                              >
                                변경사항 보기
                              </Button>
                            ]}>
                              <FileOutlined /> {file}
                            </List.Item>
                          )}
                        />
                        
                        {diffs.filter(diff => status.staged_changes.includes(diff.file)).map(diff => (
                          <div key={diff.file} style={{ marginTop: 10 }}>
                            <Text strong>{diff.file} 변경사항:</Text>
                            <pre style={{ 
                              backgroundColor: '#f5f5f5', 
                              padding: 10, 
                              borderRadius: 4,
                              maxHeight: 300,
                              overflow: 'auto' 
                            }}>
                              {diff.changes}
                            </pre>
                          </div>
                        ))}
                      </Panel>
                    )}
                  </Collapse>
                </Space>
              </Card>
            </div>
          )}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BranchesOutlined />
              브랜치
            </span>
          } 
          key="branches"
        >
          <Card bordered={false}>
            <Table 
              dataSource={branches} 
              columns={branchColumns} 
              rowKey="name"
              pagination={false}
              size="middle"
              aria-label="브랜치 목록"
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <HistoryOutlined />
              커밋 히스토리
            </span>
          } 
          key="commits"
        >
          <Card bordered={false}>
            <Table 
              dataSource={commits} 
              columns={commitColumns} 
              rowKey="hash"
              pagination={{ pageSize: 10 }}
              size="middle"
              aria-label="커밋 목록"
            />
          </Card>
          
          <Card style={{ marginTop: 16 }} bordered={false} title="커밋 타임라인">
            <Timeline mode="left">
              {commits.slice(0, 10).map(commit => (
                <Timeline.Item 
                  key={commit.hash}
                  label={new Date(commit.date).toLocaleString()}
                >
                  <Text code>{commit.short_hash}</Text> - {commit.message}
                  <br />
                  <Text type="secondary">{commit.author} ({commit.email})</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default GitMonitor;