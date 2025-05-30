import React, { useEffect, useRef } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { ChatAssistant } from '../../types';

const AssistantList: React.FC = () => {
    const {
        chatAssistants,
        loadingChatAssistants,
        fetchChatAssistants,
        selectChatAssistant,
        selectedChatAssistant,
        logout,
        toggleSidebar
    } = useChatContext();

    // 使用ref记录是否已经加载过数据，避免重复请求
    const hasLoaded = useRef<boolean>(false);

    // 组件加载时获取助手列表，避免无限循环
    useEffect(() => {
        // 只在组件首次加载时获取数据，避免循环请求
        if (!hasLoaded.current && !loadingChatAssistants) {
            console.log("开始获取聊天助手 (首次加载)");
            hasLoaded.current = true;
            fetchChatAssistants();
        }
    }, []); // 移除fetchChatAssistants依赖

    // 手动刷新助手列表
    const handleRefreshAssistants = () => {
        console.log("手动刷新聊天助手列表");
        fetchChatAssistants();
    };

    // 选择聊天助手
    const handleSelectAssistant = (assistant: ChatAssistant) => {
        console.log("选择聊天助手:", assistant.name);
        console.log("关联知识库:", assistant.datasets?.map(ds => ds.name).join(", ") || "无");
        selectChatAssistant(assistant);
    };

    return (
        <div className="assistant-list-container">
            <div className="assistant-list-header">
                <h2>RAGFlow 聊天</h2>
                <div className="header-buttons">
                    <button
                        className="refresh-button"
                        onClick={handleRefreshAssistants}
                        title="刷新助手列表"
                        disabled={loadingChatAssistants}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                        </svg>
                    </button>
                    <button className="logout-button" onClick={logout} title="退出登录">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </button>
                    <button
                        className="toggle-sidebar-button"
                        onClick={toggleSidebar}
                        title="收起侧边栏"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="assistant-list">
                {loadingChatAssistants ? (
                    <div className="loading-indicator">加载中...</div>
                ) : chatAssistants.length === 0 ? (
                    <div className="empty-assistants">
                        <p>没有可用的聊天助手</p>
                        <p className="help-text">请联系管理员添加聊天助手或点击刷新按钮重试</p>
                    </div>
                ) : (
                    chatAssistants.map((assistant) => (
                        <div
                            key={assistant.id}
                            className={`assistant-item ${selectedChatAssistant?.id === assistant.id ? 'active' : ''}`}
                            onClick={() => handleSelectAssistant(assistant)}
                        >
                            <div className="assistant-avatar">
                                {assistant.avatar ? (
                                    <img src={`data:image/png;base64,${assistant.avatar}`} alt={assistant.name} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {assistant.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="assistant-info">
                                <div className="assistant-name">{assistant.name}</div>
                                <div className="assistant-description">
                                    {assistant.description || '无描述'}
                                </div>
                                {assistant.datasets && assistant.datasets.length > 0 && (
                                    <div className="assistant-datasets">
                                        <small>知识库: {assistant.datasets.map(ds => ds.name).join(', ')}</small>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AssistantList; 