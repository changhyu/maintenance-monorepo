import React, { useState, useEffect } from 'react';
import { Breadcrumb, Layout } from 'antd';
import { HomeOutlined, MessageOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import InquiryManagement from '../../components/inquiry/InquiryManagement';
import { Helmet } from 'react-helmet';

const { Content } = Layout;

const InquiryList: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>문의 관리 - 차량 정비 관리 시스템</title>
      </Helmet>
      
      <Layout style={{ padding: '0 24px 24px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>
            <Link to="/">
              <HomeOutlined /> 홈
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <MessageOutlined /> 문의 관리
          </Breadcrumb.Item>
        </Breadcrumb>
        
        <Content
          style={{
            background: '#fff',
            padding: 24,
            margin: 0,
            minHeight: 280,
            borderRadius: 4
          }}
        >
          <InquiryManagement />
        </Content>
      </Layout>
    </>
  );
};

export default InquiryList;