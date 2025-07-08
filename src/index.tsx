import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router } from 'react-router-dom';

// 为window对象添加自定义属性的类型声明
declare global {
  interface Window {
    __TENSORAI_VERSION__: {
      version: string;
      branch: string;
      description: string;
      buildTime: string;
    };
  }
}

// 版本信息
const VERSION_INFO = {
  version: '1.0.0',
  branch: 'noref',
  description: 'TensorAI 无引用版本 ',
  buildTime: new Date().toISOString(),
};

// 在控制台输出版本信息
console.log(
  `%c TensorAI ${VERSION_INFO.version} (${VERSION_INFO.branch}) %c ${VERSION_INFO.description} `,
  'background:rgb(7, 153, 250); color: white; font-weight: bold; padding: 4px 0;',
  'background: #f6f6f6; color: #333; font-weight: normal; padding: 4px 0;'
);

// 防止页面刷新白屏问题
document.addEventListener('DOMContentLoaded', () => {
  // 在window对象上添加版本信息，方便在任何地方获取
  window.__TENSORAI_VERSION__ = VERSION_INFO;

  const rootElement = document.getElementById('root');

  // 确保root元素存在，若不存在则创建一个
  if (!rootElement) {
    console.error('Root element not found, creating one');
    const newRoot = document.createElement('div');
    newRoot.id = 'root';
    document.body.appendChild(newRoot);
  }

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  // 设置加载状态
  const loadingElement = document.createElement('div');
  loadingElement.id = 'app-loading';
  loadingElement.innerHTML = `
    <style>
      #app-loading {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #f5f5f5;
        z-index: 9999;
        transition: opacity 0.3s ease-out;
      }
      .app-loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #e0e0e0;
        border-top-color: #1890ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      .app-loading-text {
        margin-top: 20px;
        font-size: 16px;
        color: #333;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
    <div class="app-loading-spinner"></div>
    <div class="app-loading-text">正在加载应用...</div>
  `;

  // 添加加载指示器到DOM
  document.body.appendChild(loadingElement);

  // 渲染React应用
  root.render(
    <React.StrictMode>
      <Router>
        <App />
      </Router>
    </React.StrictMode>
  );

  // 应用加载完成后移除加载指示器
  window.addEventListener('load', () => {
    const loader = document.getElementById('app-loading');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.remove();
      }, 300);
    }
  });
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
