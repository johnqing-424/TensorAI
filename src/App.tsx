import React, { useState, useEffect, useRef } from 'react';
import { ChatProvider } from './context/ChatContext';
import { useNavigate, useLocation } from 'react-router-dom';
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

// 使用React.memo优化AppContent组件，避免不必要的重渲染
const AppContent = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  // 认证状态检查
  const [token, setToken] = useState<string | null>(null);
  const [debug, setDebug] = useState<string[]>([]);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态
  const [showMenu, setShowMenu] = useState(false); // 控制菜单显示
  const menuRef = useRef<HTMLDivElement>(null); // 菜单引用

  const addDebug = (message: string) => {
    console.log(`[App] ${message}`);
    setDebug(prev => [...prev, message]);
  };

  // 初始化时检查Token是否有效
  useEffect(() => {
    addDebug('初始化检查API密钥...');
    const storedToken = localStorage.getItem('ragflow_api_key');

    // 验证Token是否存在
    if (storedToken && storedToken.trim() !== '') {
      addDebug(`找到存储的Token: ${storedToken.substring(0, 5)}...`);
      setToken(storedToken);
      addDebug('Token已加载');

      // 同时加载AppID（如果有）
      const storedAppId = localStorage.getItem('ragflow_appid');
      if (storedAppId && storedAppId.trim() !== '') {
        apiClient.setAppId(storedAppId);
        addDebug(`找到存储的AppID: ${storedAppId}`);
      }

      // 不再自动导航到特定功能页面，让用户从首页开始
      // 登录成功后仅确保不在登录页
      if (location.pathname === '/login') {
        navigate('/');
      }
    } else {
      // 如果Token无效，则清除它
      addDebug('没有找到有效的Token，清除认证状态');
      localStorage.removeItem('ragflow_api_key');
      apiClient.clearApiKey();
      setToken(null);
    }

    // 完成初始检查后，设置加载状态为false
    setIsLoading(false);
  }, [navigate, location.pathname, hasNavigated]);

  // 当localStorage中的token变化时更新状态
  useEffect(() => {
    addDebug('设置localStorage变化监听器');

    const handleStorageChange = () => {
      const currentToken = localStorage.getItem('ragflow_api_key');
      addDebug(`监测到localStorage变化: ${currentToken ? 'Token存在' : 'Token不存在'}`);
      setToken(currentToken);
    };

    window.addEventListener('storage', handleStorageChange);

    // 还需要监听直接的localStorage变化（在同一窗口中）
    const checkTokenInterval = setInterval(() => {
      const currentToken = localStorage.getItem('ragflow_api_key');
      if ((currentToken && !token) || (!currentToken && token)) {
        addDebug(`检测到直接localStorage变化: ${currentToken ? 'Token存在' : 'Token不存在'}`);
        setToken(currentToken);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkTokenInterval);
    };
  }, [token]);

  // 显示当前认证状态
  useEffect(() => {
    addDebug(`认证状态: ${token ? '已认证' : '未认证'}`);
  }, [token]);

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

  // 导航到设置页面
  const goToSettings = () => {
    navigate('/profile-setting');
    setShowMenu(false);
  };

  // 切换菜单显示状态
  const toggleMenu = () => {
    setShowMenu(prev => !prev);
  };

  // 如果正在加载，显示空白内容
  if (isLoading) {
    return <div className="app-loading"></div>;
  }

  return (
    <ChatProvider>
      <div className="app-container">
        {token ? <ChatLayout /> : <ApiKeyForm />}

        {/* 用户头像和下拉菜单 */}
        {token && (
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
        )}
      </div>
    </ChatProvider>
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

  return <AppContent />;
}

export default App;
