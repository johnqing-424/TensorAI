import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import AssistantList from '../Sidebar/AssistantList';
import SessionList from '../Sidebar/SessionList';
import ChatHistory from '../Chat/ChatHistory';
import ChatInput from '../Chat/ChatInput';
import ReferencePanel from '../Chat/ReferencePanel';

// 使用React.memo优化渲染性能
const ChatLayout: React.FC = () => {
    const {
        apiError,
        clearApiError,
        fetchChatAssistants,
        selectedChatAssistant,
        reconnecting,
        isSidebarVisible,
        toggleSidebar
    } = useChatContext();

    // 动态样式，根据API错误状态调整页面位置
    const layoutStyle = {
        marginTop: apiError ? '40px' : '0',
        transition: 'margin-top 0.3s ease-out'
    };

    // 重试连接的处理函数
    const handleRetry = () => {
        console.log("手动重试连接...");
        clearApiError();
        fetchChatAssistants();
    };

    // 聊天头部样式，在侧边栏折叠时添加左侧内边距
    const chatHeaderStyle = {
        paddingLeft: !isSidebarVisible ? '70px' : '20px',
        display: 'flex',
        alignItems: 'center',
        maxWidth: '80%',
        gap: '15px'
    };

    // 聊天描述样式
    const chatDescriptionStyle = {
        margin: 0,
        padding: 0
    };

    return (
        <div className="chat-layout" style={layoutStyle}>
            {/* API错误提示条 */}
            {apiError && (
                <div className="api-error-banner">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <span className="error-message">{apiError}</span>
                    </div>
                    <button className="error-close" onClick={clearApiError}>×</button>
                </div>
            )}

            {/* 重连状态提示条 */}
            {reconnecting && (
                <div className="reconnecting-banner">
                    <div className="spinner"></div>
                    <span>正在连接到API服务器...</span>
                    <button className="retry-button" onClick={handleRetry}>立即重试</button>
                </div>
            )}

            {/* 侧边栏 */}
            <div className={`sidebar ${!isSidebarVisible ? 'sidebar-collapsed' : ''}`}>
                <AssistantList />
                <SessionList />
            </div>

            {/* 主聊天区域 */}
            <div className="chat-container">
                {/* 侧边栏展开按钮 - 仅在侧边栏隐藏时显示 */}
                {!isSidebarVisible && (
                    <button
                        className="toggle-sidebar-button show-sidebar-button"
                        onClick={toggleSidebar}
                        title="展开侧边栏"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                )}

                {selectedChatAssistant ? (
                    <>
                        <div className="chat-header" style={chatHeaderStyle}>
                            <h3>{selectedChatAssistant.name}</h3>
                            <p className="chat-description" style={chatDescriptionStyle}>
                                {selectedChatAssistant.description || '没有描述'}
                            </p>
                        </div>
                        <div className="chat-main">
                            <ChatHistory />
                            <ReferencePanel />
                            <ChatInput />
                        </div>
                    </>
                ) : (
                    <div className="no-assistant-selected">
                        <div className="placeholder-content">
                            <div className="placeholder-icon">🤖</div>
                            <h2>请选择一个聊天助手</h2>
                            <p>从左侧边栏中选择一个聊天助手开始对话</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatLayout; 