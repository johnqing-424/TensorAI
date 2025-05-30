import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import { ChatSession } from '../../types';

const SessionList: React.FC = () => {
    const {
        chatSessions,
        currentSession,
        selectedChatAssistant,
        selectSession,
        createChatSession,
        loadingSessions
    } = useChatContext();

    // 格式化日期
    const formatDate = (dateStr: string): string => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateStr;
        }
    };

    // 创建一个新会话
    const handleCreateSession = () => {
        if (selectedChatAssistant) {
            createChatSession(selectedChatAssistant.id, '新对话');
        }
    };

    // 选择一个会话
    const handleSelectSession = (session: ChatSession) => {
        selectSession(session);
    };

    if (!selectedChatAssistant) {
        return (
            <div className="session-list-container empty-state">
                <p>请先选择一个聊天助手</p>
            </div>
        );
    }

    return (
        <div className="session-list-container">
            <div className="session-list-header">
                <h3>对话历史</h3>
                <button
                    className="new-session-button"
                    onClick={handleCreateSession}
                    title="新建会话"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>

            <div className="session-list">
                {loadingSessions ? (
                    <div className="loading-indicator">加载中...</div>
                ) : chatSessions.length === 0 ? (
                    <div className="empty-sessions">
                        <p>没有历史会话</p>
                        <button onClick={handleCreateSession}>开始新对话</button>
                    </div>
                ) : (
                    chatSessions.map((session) => (
                        <div
                            key={session.id}
                            className={`session-item ${currentSession?.id === session.id ? 'active' : ''
                                }`}
                            onClick={() => handleSelectSession(session)}
                        >
                            <div className="session-item-content">
                                <div className="session-name">
                                    {session.name || '未命名会话'}
                                </div>
                                <div className="session-date">
                                    {formatDate(session.update_date)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SessionList; 