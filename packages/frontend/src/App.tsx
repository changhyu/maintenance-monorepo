import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TodoProvider } from './context/TodoContext';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/header/Header';
import ConvexProvider from './components/ConvexProvider';
import routes from './routes';

/**
 * 애플리케이션 메인 컴포넌트
 */
function App() {
  return (
    <ConvexProvider>
      <ThemeProvider>
        <TodoProvider>
          <BrowserRouter>
            <div className="app">
              <Header />
              <main className="app-main">
                <Routes>
                  {routes.map((route) => (
                    <Route 
                      key={route.id || route.path} 
                      path={route.path} 
                      element={route.element} 
                    />
                  ))}
                </Routes>
              </main>
              <footer className="app-footer">
                <p>&copy; 2023 차량 정비 관리 시스템</p>
              </footer>
            </div>
          </BrowserRouter>
        </TodoProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}

export default App; 