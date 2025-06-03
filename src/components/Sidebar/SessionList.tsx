import React, { useState, useRef, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { ChatSession } from '../../types';

const SessionList: React.FC = () => {
    const {
        chatSessions,
        currentSession,
        selectedChatAssistant,
        selectSession,
        createChatSession,
        deleteSession,
        renameSession,
        loadingSessions
    } = useChatContext();

    // 状态管理
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isRenaming, setIsRenaming] = useState<boolean>(false);
    const [newSessionName, setNewSessionName] = useState<string>('');
    const [dropdownMenuId, setDropdownMenuId] = useState<string | null>(null);

    // 引用
    const renameInputRef = useRef<HTMLInputElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
                setDropdownMenuId(null);
            }
        };

        if (dropdownMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownMenuId]);

    // 重命名输入框自动聚焦
    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
        }
    }, [isRenaming]);

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

    // 显示下拉菜单
    const handleToggleDropdown = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setDropdownMenuId(dropdownMenuId === sessionId ? null : sessionId);
        setActiveSessionId(sessionId);
    };

    // 开始重命名会话
    const handleStartRename = (sessionId: string) => {
        const session = chatSessions.find(s => s.id === sessionId);
        if (session) {
            setNewSessionName(session.name || '未命名会话');
            setIsRenaming(true);
            setActiveSessionId(sessionId);
        }
        setDropdownMenuId(null);
    };

    // 提交重命名
    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (activeSessionId && newSessionName.trim()) {
            await renameSession(activeSessionId, newSessionName.trim());
            setIsRenaming(false);
        }
    };

    // 取消重命名
    const handleRenameCancel = () => {
        setIsRenaming(false);
    };

    // 删除会话
    const handleDeleteSession = async (sessionId: string) => {
        if (window.confirm('确定要删除这个会话吗？')) {
            await deleteSession(sessionId);
        }
        setDropdownMenuId(null);
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
                            className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                            onClick={() => handleSelectSession(session)}
                        >
                            {isRenaming && activeSessionId === session.id ? (
                                <form onSubmit={handleRenameSubmit} className="rename-form">
                                    <input
                                        ref={renameInputRef}
                                        type="text"
                                        value={newSessionName}
                                        onChange={(e) => setNewSessionName(e.target.value)}
                                        onBlur={handleRenameCancel}
                                        className="rename-input"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button type="submit" className="rename-submit" onClick={(e) => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </button>
                                </form>
                            ) : (
                                <div className="session-item-content">
                                    <div className="session-name">
                                        {session.name || '未命名会话'}
                                    </div>
                                    <div className="session-date">
                                        {formatDate(session.update_date)}
                                    </div>
                                    <div className="session-actions">
                                        <button
                                            className="session-action-button"
                                            onClick={(e) => handleToggleDropdown(e, session.id)}
                                            title="会话操作"
                                        >
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="1"></circle>
                                                <circle cx="12" cy="5" r="1"></circle>
                                                <circle cx="12" cy="19" r="1"></circle>
                                            </svg>
                                        </button>
                                        {dropdownMenuId === session.id && (
                                            <div className="dropdown-menu" ref={dropdownMenuRef}>
                                                <div className="dropdown-item" onClick={() => handleStartRename(session.id)}>
                                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                    重命名
                                                </div>
                                                <div className="dropdown-item delete" onClick={() => handleDeleteSession(session.id)}>
                                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                    删除
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .session-item-content {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    width: 100%;
                    position: relative;
                }
                
                .session-name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .session-date {
                    font-size: 12px;
                    color: #888;
                    margin-right: 8px;
                }
                
                .session-actions {
                    position: relative;
                }
                
                .session-action-button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                
                .session-action-button:hover {
                    opacity: 1;
                }
                
                .dropdown-menu {
                    position: absolute;
                    right: 0;
                    top: 100%;
                    background: white;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                    min-width: 120px;
                    overflow: hidden;
                }
                
                .dropdown-item {
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .dropdown-item:hover {
                    background-color: #f5f5f5;
                }
                
                .dropdown-item svg {
                    margin-right: 8px;
                }
                
                .dropdown-item.delete {
                    color: #e53935;
                }
                
                .dropdown-item.delete svg {
                    stroke: #e53935;
                }
                
                .rename-form {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 4px 8px;
                }
                
                .rename-input {
                    flex: 1;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 14px;
                }
                
                .rename-submit {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #4caf50;
                    padding: 4px;
                    margin-left: 4px;
                }
                
                .rename-submit svg {
                    stroke: #4caf50;
                }
            `}</style>
        </div>
    );
};

export default SessionList;