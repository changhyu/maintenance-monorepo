import { Routes, Route } from 'react-router-dom';

// 임시 페이지 컴포넌트
const DashboardPage = () => <div>대시보드 페이지</div>;
const VehiclesPage = () => <div>차량 관리 페이지</div>;
const MaintenancePage = () => <div>정비 기록 페이지</div>;
const SettingsPage = () => <div>설정 페이지</div>;
const NotFoundPage = () => <div>페이지를 찾을 수 없습니다.</div>;

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>차량 정비 관리 시스템</h1>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>&copy; 2023 차량 정비 관리 시스템</p>
      </footer>
    </div>
  );
}

export default App; 