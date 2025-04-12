import React from 'react';

import { FileTextOutlined, HomeOutlined } from '@ant-design/icons';
import { Typography, Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

import ReportDashboard from '../components/reports/ReportDashboard';
import '../components/reports/styles.css';

const { Title } = Typography;

/**
 * 정비 보고서 페이지
 */
const ReportPage: React.FC = () => {
  return (
    <div className="report-page">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/">
            <HomeOutlined />
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <FileTextOutlined />
          <span style={{ marginLeft: 8 }}>보고서</span>
        </Breadcrumb.Item>
      </Breadcrumb>

      <Title level={2} style={{ marginBottom: 24 }}>
        정비 보고서
      </Title>

      <ReportDashboard />
    </div>
  );
};

export default ReportPage;
