import React, { useState, useLayoutEffect, useEffect } from 'react';
import { ChatProvider } from './context/ChatContext';
import ApiKeyForm from './components/Auth/ApiKeyForm';
import ChatLayout from './components/Layout/ChatLayout';
import './App.css';
import { apiClient } from './api/client';

// 清除所有存储的数据，强制重新登录
const clearAllData = () => {
  console.log('强制清除所有本地存储数据');
  localStorage.removeItem('ragflow_api_key');
  apiClient.clearApiKey();
  // 刷新页面，强制重新加载应用
  window.location.reload();
};

// 使用React.memo优化AppContent组件，避免不必要的重渲染
const AppContent = React.memo(() => {
  // 认证状态检查
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [debug, setDebug] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log(`[App] ${message}`);
    setDebug(prev => [...prev, message]);
  };

  // 初始化时检查API密钥是否有效
  useEffect(() => {
    addDebug('初始化检查API密钥...');
    const storedApiKey = localStorage.getItem('ragflow_api_key');

    // 验证API密钥是否存在
    if (storedApiKey && storedApiKey.trim() !== '') {
      addDebug(`找到存储的API密钥: ${storedApiKey.substring(0, 5)}...`);

      // 移除严格的格式检查，允许任何非空密钥
      setApiKey(storedApiKey);
      addDebug('API密钥已加载');
    } else {
      // 如果API密钥无效，则清除它
      addDebug('没有找到有效的API密钥，清除认证状态');
      localStorage.removeItem('ragflow_api_key');
      apiClient.clearApiKey();
      setApiKey(null);
    }
  }, []);

  // 当localStorage中的apiKey变化时更新状态
  useEffect(() => {
    addDebug('设置localStorage变化监听器');

    const handleStorageChange = () => {
      const currentApiKey = localStorage.getItem('ragflow_api_key');
      addDebug(`监测到localStorage变化: ${currentApiKey ? '密钥存在' : '密钥不存在'}`);
      setApiKey(currentApiKey);
    };

    window.addEventListener('storage', handleStorageChange);

    // 还需要监听直接的localStorage变化（在同一窗口中）
    const checkApiKeyInterval = setInterval(() => {
      const currentApiKey = localStorage.getItem('ragflow_api_key');
      if ((currentApiKey && !apiKey) || (!currentApiKey && apiKey)) {
        addDebug(`检测到直接localStorage变化: ${currentApiKey ? '密钥存在' : '密钥不存在'}`);
        setApiKey(currentApiKey);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkApiKeyInterval);
    };
  }, [apiKey]);

  // 显示当前认证状态
  useEffect(() => {
    addDebug(`认证状态: ${apiKey ? '已认证' : '未认证'}`);
  }, [apiKey]);

  return (
    <ChatProvider>
      <div className="app-container">
        {apiKey ? <ChatLayout /> : <ApiKeyForm />}

        {/* 强制注销按钮 */}
        <div className="force-logout-container">
          <button
            className="force-logout-button"
            onClick={clearAllData}
            title="强制注销并清除所有数据"
          >
            强制注销
          </button>
        </div>
      </div>
    </ChatProvider>
  );
});

// 应用包装器，控制渲染阶段
function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // 应用初始化前强制清除API密钥（如果URL参数中包含clear=true）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear') === 'true') {
      clearAllData();
    }
    setInitializing(false);
  }, []);

  // 使用useLayoutEffect避免闪烁
  useLayoutEffect(() => {
    if (initializing) return;

    // 先隐藏整个文档
    document.documentElement.style.visibility = 'hidden';

    // 设置一个短暂延迟，确保所有DOM操作在可见之前完成
    const timer = setTimeout(() => {
      setIsVisible(true);
      // 显示文档
      document.documentElement.style.visibility = 'visible';
    }, 300); // 略微增加延迟时间，确保DOM完全准备好

    return () => {
      clearTimeout(timer);
      document.documentElement.style.visibility = 'visible';
    };
  }, [initializing]);

  if (initializing || !isVisible) {
    return (
      <div className="initial-loading">
        <div className="loading-spinner"></div>
        <p>正在准备界面...</p>
      </div>
    );
  }

  return <AppContent />;
}

export default App;
