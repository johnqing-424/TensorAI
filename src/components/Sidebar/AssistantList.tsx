import React from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import { ChatAssistant } from '../../types';
import { functionIcons, functionRoutes, functionTitles } from '../Layout/NavigationBar';

const AssistantList: React.FC = () => {
    const navigate = useNavigate();
    const {
        selectedChatAssistant,
        selectChatAssistant,
        fetchChatAssistants,
        loadingChatAssistants,
        logout,
        toggleSidebar
    } = useChatContext();

    // 定义四个固定功能（原聊天助手）
    const fixedAssistants: ChatAssistant[] = [
        {
            id: 'process',
            name: '流程制度检索',
            description: '检索公司内部流程制度文档',
            create_date: new Date().toISOString(),
            update_date: new Date().toISOString(),
            avatar: '',
            datasets: [],
            llm: {
                model_name: '',
                temperature: 0.7,
                top_p: 0.9,
                presence_penalty: 0,
                frequency_penalty: 0
            },
            prompt: {
                similarity_threshold: 0.7,
                keywords_similarity_weight: 0.5,
                top_n: 3,
                variables: [],
                rerank_model: '',
                empty_response: '',
                opener: '',
                prompt: ''
            },
            status: 'active'
        },
        {
            id: 'product',
            name: '产品技术检索',
            description: '检索产品和技术相关文档',
            create_date: new Date().toISOString(),
            update_date: new Date().toISOString(),
            avatar: '',
            datasets: [],
            llm: {
                model_name: '',
                temperature: 0.7,
                top_p: 0.9,
                presence_penalty: 0,
                frequency_penalty: 0
            },
            prompt: {
                similarity_threshold: 0.7,
                keywords_similarity_weight: 0.5,
                top_n: 3,
                variables: [],
                rerank_model: '',
                empty_response: '',
                opener: '',
                prompt: ''
            },
            status: 'active'
        },
        {
            id: 'model',
            name: '大模型知识检索',
            description: '检索大模型相关知识和文档',
            create_date: new Date().toISOString(),
            update_date: new Date().toISOString(),
            avatar: '',
            datasets: [],
            llm: {
                model_name: '',
                temperature: 0.7,
                top_p: 0.9,
                presence_penalty: 0,
                frequency_penalty: 0
            },
            prompt: {
                similarity_threshold: 0.7,
                keywords_similarity_weight: 0.5,
                top_n: 3,
                variables: [],
                rerank_model: '',
                empty_response: '',
                opener: '',
                prompt: ''
            },
            status: 'active'
        },
        {
            id: 'more',
            name: '更多',
            description: '更多AI功能',
            create_date: new Date().toISOString(),
            update_date: new Date().toISOString(),
            avatar: '',
            datasets: [],
            llm: {
                model_name: '',
                temperature: 0.7,
                top_p: 0.9,
                presence_penalty: 0,
                frequency_penalty: 0
            },
            prompt: {
                similarity_threshold: 0.7,
                keywords_similarity_weight: 0.5,
                top_n: 3,
                variables: [],
                rerank_model: '',
                empty_response: '',
                opener: '',
                prompt: ''
            },
            status: 'active'
        }
    ];

    // 手动刷新功能列表（实际是刷新对话历史）
    const handleRefreshAssistants = () => {
        console.log("手动刷新聊天助手列表");
        fetchChatAssistants();
    };

    // 选择功能（原聊天助手）并导航
    const handleSelectAssistant = (assistant: ChatAssistant) => {
        console.log("选择功能:", assistant.name);

        // 先选择助手
        selectChatAssistant(assistant);

        // 再导航到相应路由
        const functionId = assistant.id as keyof typeof functionRoutes;
        if (functionRoutes[functionId]) {
            navigate(functionRoutes[functionId]);
        }
    };

    // 获取显示名称
    const getDisplayName = (id: string) => {
        switch (id) {
            case 'process': return '流程制度检索';
            case 'product': return '产品技术检索';
            case 'model': return '大模型知识检索';
            case 'more': return '更多';
            default: return '聊天';
        }
    };

    // 点击TensorAI标识导航到首页
    const handleLogoClick = () => {
        // 清除选中的聊天助手，设置为null
        selectChatAssistant(null as any);
        // 导航到首页
        navigate('/');
    };

    return (
        <div className="sidebar-content">
            <div className="sidebar-header">
                <div className="user-info" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
                    <div className="avatar">T</div>
                    <div className="username">TensorAI</div>
                </div>
                <button className="collapse-btn" onClick={toggleSidebar} title="收起侧边栏">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.5 1L4 7l5.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                </button>
            </div>

            <div className="sidebar-actions">
                <button className="new-chat-btn">
                    <span className="icon">+</span>
                    <span className="text">新对话</span>
                    <span className="shortcut">Ctrl+N</span>
                </button>
            </div>

            <div className="sidebar-menu">
                {fixedAssistants.map(assistant => (
                    <div
                        key={assistant.id}
                        className="menu-item"
                        onClick={() => handleSelectAssistant(assistant)}
                    >
                        <div
                            className={`menu-icon ${selectedChatAssistant?.id === assistant.id ? 'active' : ''}`}
                            style={{
                                backgroundColor: selectedChatAssistant?.id === assistant.id ?
                                    functionIcons[assistant.id as keyof typeof functionIcons]?.color :
                                    functionIcons[assistant.id as keyof typeof functionIcons]?.bgColor,
                                color: selectedChatAssistant?.id === assistant.id ?
                                    '#fff' :
                                    functionIcons[assistant.id as keyof typeof functionIcons]?.color
                            }}
                        >
                            <span>{functionIcons[assistant.id as keyof typeof functionIcons]?.icon}</span>
                        </div>
                        <div className="menu-text">{getDisplayName(assistant.id)}</div>
                        {assistant.id === 'model' && <div className="menu-badge">新</div>}
                    </div>
                ))}
            </div>

            <div className="sidebar-divider"></div>

            <div className="sidebar-section-title">
                <div className="title">历史对话</div>
                <div className="icon" onClick={handleRefreshAssistants}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                </div>
            </div>

            <style>
                {`
                .sidebar-content {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background-color: #f7f7f8;
                    padding: 0;
                    width: 100%;
                    color: #333;
                }
                
                .sidebar-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 12px;
                    border-bottom: 1px solid #eaebee;
                }
                
                .user-info {
                    display: flex;
                    align-items: center;
                }
                
                .avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background-color: #3370ff;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    margin-right: 8px;
                }
                
                .username {
                    font-size: 14px;
                    font-weight: 500;
                    color: #333;
                }
                
                .collapse-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #999;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .sidebar-actions {
                    padding: 12px;
                }
                
                .new-chat-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background-color: #fff;
                    border: 1px solid #e0e0e6;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #333;
                }
                
                .new-chat-btn .icon {
                    font-weight: bold;
                    font-size: 16px;
                    color: #555;
                }
                
                .new-chat-btn .shortcut {
                    color: #999;
                    font-size: 12px;
                }
                
                .sidebar-menu {
                    padding: 0 12px;
                }
                
                .menu-item {
                    display: flex;
                    align-items: center;
                    padding: 10px 8px;
                    cursor: pointer;
                    border-radius: 6px;
                    margin-bottom: 4px;
                }
                
                .menu-item:hover {
                    background-color: #f0f0f5;
                }
                
                .menu-icon {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    margin-right: 8px;
                    flex-shrink: 0;
                }
                
                .menu-icon.active {
                    background-color: #3370ff;
                    color: white;
                }
                
                .menu-text {
                    flex-grow: 1;
                    font-size: 14px;
                    color: #333;
                }
                
                .menu-badge {
                    font-size: 10px;
                    background-color: #ff5286;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    white-space: nowrap;
                }
                
                .sidebar-divider {
                    height: 1px;
                    background-color: #eaebee;
                    margin: 8px 12px;
                }
                
                .sidebar-section-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 20px;
                    color: #999;
                    font-size: 13px;
                }
                
                .sidebar-section-title .icon {
                    cursor: pointer;
                    opacity: 0.7;
                }
                
                .sidebar-section-title .icon:hover {
                    opacity: 1;
                }
                `}
            </style>
        </div>
    );
};

export default AssistantList; 