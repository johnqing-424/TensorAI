import React, { useState, useEffect, useRef } from 'react';
import { ChatProvider } from './context/ChatContext';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ApiKeyForm from './components/Auth/ApiKeyForm';
import ChatLayout from './components/Layout/ChatLayout';
import './App.css';
import { apiClient } from './services';

// 清除所有存储的数据，重新登录
const clearAllData = () => {
  console.log('清除所有本地存储数据');
  localStorage.removeItem('ragflow_api_key');
  localStorage.removeItem('ragflow_appid');
  apiClient.clearApiKey();
  // 刷新页面，重新加载应用
  window.location.reload();
};

// 受保护的路由组件
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('ragflow_api_key');
  const location = useLocation();

  if (!token) {
    // 如果没有token，重定向到登录页面，并保存原来要去的路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// 登录页面组件
const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  // 当登录成功时的回调
  const onLoginSuccess = () => {
    navigate(from, { replace: true });
  };

  return <ApiKeyForm onSuccess={onLoginSuccess} />;
};

// 应用内容组件
const AppContent = React.memo(() => {
  const [debug, setDebug] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false); // 控制菜单显示
  const menuRef = useRef<HTMLDivElement>(null); // 菜单引用

  const addDebug = (message: string) => {
    console.log(`[App] ${message}`);
    setDebug(prev => [...prev, message]);
  };

  // 添加点击外部关闭菜单的处理函数
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigate = useNavigate();

  // 导航到设置页面
  const goToSettings = () => {
    navigate('/profile-setting');
    setShowMenu(false);
  };

  // 切换菜单显示状态
  const toggleMenu = () => {
    setShowMenu(prev => !prev);
  };

  return (
    <div className="app-container">
      <ChatLayout />

      {/* 用户头像和下拉菜单 */}
      <div className="user-avatar-container" ref={menuRef}>
        <button
          className="user-avatar-button"
          onClick={toggleMenu}
          title="用户菜单"
        >
          <div className="user-avatar">
            {/* 这里可以放用户头像，暂时使用文字 */}
            <span>用户</span>
          </div>
        </button>

        {showMenu && (
          <div className="user-menu">
            <div className="user-menu-item" onClick={goToSettings}>
              <span className="menu-icon">⚙️</span>
              <span>设置</span>
            </div>
            <div className="user-menu-item" onClick={clearAllData}>
              <span className="menu-icon">🚪</span>
              <span>退出登录</span>
            </div>
            {/* 后期可以在这里添加更多菜单项 */}
          </div>
        )}
      </div>
    </div>
  );
});

// 应用主入口
function App() {
  // 应用初始化前强制清除API密钥（如果URL参数中包含clear=true）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear') === 'true') {
      clearAllData();
    }
  }, []);

  return (
    <ChatProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        } />
      </Routes>
    </ChatProvider>
  );
}

export default App;
