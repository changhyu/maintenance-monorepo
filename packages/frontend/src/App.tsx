import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout as AntdLayout } from 'antd';
import TodoDashboard from './components/TodoDashboard';
import { TodoProvider } from './context/TodoContext';
import './App.css';

const { Content, Header } = AntdLayout;

function App() {
  return (
    <TodoProvider>
      <Router>
        <AntdLayout className="min-h-screen">
          <Header className="bg-white shadow">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">정비 관리 시스템</h1>
            </div>
          </Header>
          <Content className="container mx-auto p-4">
            <Routes>
              <Route path="/" element={<TodoDashboard />} />
              {/* 추가 라우트는 이곳에 정의 */}
            </Routes>
          </Content>
        </AntdLayout>
      </Router>
    </TodoProvider>
  );
}

export default App; 