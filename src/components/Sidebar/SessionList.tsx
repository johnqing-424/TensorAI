import React, { useState, useRef, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { ChatSession } from '../../types';
import { functionIcons } from '../Layout/NavigationBar';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();

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

    // 获取会话对应的功能ID
    const getSessionFunctionId = (session: ChatSession): string => {
        // 根据会话名称或其他特征判断功能ID
        const name = session.name.toLowerCase();

        // 调整判断逻辑，确保与后端ChatConfig.java中的定义一致
        if (name.includes('模型') || name.includes('大模型') || name.includes('知识')) {
            // 大模型专业知识查询 - 对应后端的product
            return 'product';
        } else if (name.includes('数据') || name.includes('分析')) {
            // 数据分析 - 对应后端的data
            return 'data';
        } else if (name.includes('其他') || name.includes('more')) {
            return 'more';
        } else {
            // 默认为流程制度检索 - 对应后端的process
            return 'process';
        }
    };

    // 格式化日期
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return `${date.getMonth() + 1}月${date.getDate()}日`;
        }
    };

    // 选择一个会话
    const handleSelectSession = (session: ChatSession) => {
        // 获取会话对应的应用ID
        const appId = selectedChatAssistant?.id || getSessionFunctionId(session);

        // 先选择会话
        selectSession(session);

        // 导航到具体会话的URL
        navigate(`/${appId}/${session.id}`);
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
            <div className="session-list">
                {loadingSessions ? (
                    <div className="loading-indicator">加载中...</div>
                ) : chatSessions.length === 0 ? (
                    <div className="empty-sessions">
                        <div className="empty-text">暂无历史对话</div>
                    </div>
                ) : (
                    <div className="session-groups">
                        {chatSessions.map((session) => {
                            const functionId = getSessionFunctionId(session);
                            return (
                                <div
                                    key={session.id}
                                    className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                                    onClick={() => handleSelectSession(session)}
                                >
                                    <div className="session-icon" style={{
                                        color: functionId !== 'default' ?
                                            functionIcons[functionId as keyof typeof functionIcons]?.color :
                                            '#8E8EA0'
                                    }}>
                                        {functionId !== 'default' ?
                                            functionIcons[functionId as keyof typeof functionIcons]?.icon :
                                            '💬'}
                                    </div>
                                    <div className="session-name">{session.name || '新对话'}</div>
                                    <button
                                        className="delete-btn"
                                        onClick={(e) => handleDeleteSession(session.id)}
                                        title="删除对话"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
                                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
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
                
                .session-item {
                    display: flex;
                    align-items: center;
                    padding: 8px 16px;
                    margin-bottom: 6px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    position: relative;
                }
                
                .session-item:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                }
                
                .session-item.active {
                    background-color: rgba(51, 112, 255, 0.1);
                }
                
                .session-icon {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 10px;
                    font-size: 16px;
                    flex-shrink: 0;
                }
                
                .loading-indicator {
                    text-align: center;
                    padding: 20px;
                    color: #888;
                }
                
                .empty-sessions {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    padding: 20px;
                    text-align: center;
                }
                
                .empty-icon {
                    font-size: 32px;
                    margin-bottom: 12px;
                }
                
                .empty-text {
                    color: #888;
                    font-size: 14px;
                    margin-bottom: 16px;
                }
                
                .start-chat-btn {
                    background-color: #3370ff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    font-size: 14px;
                    cursor: pointer;
                }
                
                .dropdown-menu {
                    position: absolute;
                    right: 0;
                    top: 100%;
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                    min-width: 120px;
                    overflow: hidden;
                }
                
                .dropdown-item {
                    padding: 8px 16px;
                    font-size: 14px;
                    color: #333;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }
                
                .dropdown-item:hover {
                    background-color: #f5f5f5;
                }
                
                .dropdown-item svg {
                    margin-right: 8px;
                    width: 16px;
                    height: 16px;
                }
                
                .rename-form {
                    position: absolute;
                    left: 0;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    padding: 0 8px;
                    background-color: white;
                    border-radius: 8px;
                    z-index: 10;
                }
                
                .rename-input {
                    flex: 1;
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    outline: none;
                }
                
                .rename-actions {
                    display: flex;
                    gap: 4px;
                    margin-left: 8px;
                }
                
                .rename-actions button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    color: #666;
                }
                
                .rename-actions button:hover {
                    background-color: #f0f0f0;
                }
                
                .delete-btn {
                    background: none;
                    border: none;
                    padding: 4px;
                    border-radius: 4px;
                    color: #888;
                    opacity: 0;
                    cursor: pointer;
                    margin-left: 8px;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .session-item:hover .delete-btn {
                    opacity: 1;
                }
                
                .delete-btn:hover {
                    color: #f44336;
                    background-color: rgba(244, 67, 54, 0.1);
                }
            `}</style>
        </div>
    );
};

export default SessionList;