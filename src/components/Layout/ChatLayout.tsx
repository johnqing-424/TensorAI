import React, { useState, useEffect, useRef } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import AssistantList from '../Sidebar/AssistantList';
import SessionList from '../Sidebar/SessionList';
import ChatHistory from '../Chat/ChatHistory';
import NavigationBar, { functionIcons, functionTitles, FunctionIdType, functionRoutes } from './NavigationBar';
import ChatInputBox from '../Common/ChatInputBox';

import './ChatLayout.css';



const ChatLayout: React.FC = () => {
    const {
        apiError,
        clearApiError,
        fetchChatAssistants,
        selectedChatAssistant,
        reconnecting,
        isSidebarVisible,
        toggleSidebar,
        createChatSession,
        currentSession,
        selectChatAssistant,
        chatSessions,
        loadingSessions,
        selectSession,
        sendMessage
    } = useChatContext();

    const navigate = useNavigate();
    const location = useLocation();
    // 获取路由参数
    const params = useParams<{ appId?: string; sessionId?: string }>();

    // 输入框内容状态
    const [inputValue, setInputValue] = useState<string>('');

    // 每个页面独立的深度思考状态
    const [homeDeepThinking, setHomeDeepThinking] = useState<boolean>(false);
    const [processDeepThinking, setProcessDeepThinking] = useState<boolean>(false);
    const [productDeepThinking, setProductDeepThinking] = useState<boolean>(false);
    const [modelDeepThinking, setModelDeepThinking] = useState<boolean>(false);
    const [moreDeepThinking, setMoreDeepThinking] = useState<boolean>(false);
    const [chatDeepThinking, setChatDeepThinking] = useState<boolean>(false);

    // 滑动到底部按钮状态
    const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);

    // 监听页面滚动，控制滑动到底部按钮的显示
    useEffect(() => {
        // 更可靠的滚动检测方法，检查是否距离底部超过300px
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            // 添加缓冲区，当距离底部大于300px时显示按钮
            const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
            const isNearBottom = distanceFromBottom < 300;

            setShowScrollToBottom(!isNearBottom);

            // 移除调试输出
            // console.log(`滚动状态: 距离底部=${distanceFromBottom}px, 显示按钮=${!isNearBottom}`);
        };

        // 初始检查一次
        handleScroll();

        window.addEventListener('scroll', handleScroll);

        // 聊天内容变化时也重新检查
        const checkInterval = setInterval(handleScroll, 1000);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(checkInterval);
        };
    }, []);

    // 增强版滑动到底部功能
    const scrollToBottom = () => {
        console.log("执行滚动到底部");

        // 立即尝试滚动一次
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'auto'
        });

        // 为确保在DOM更新后滚动，使用多个延时
        setTimeout(() => {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    };

    // 问候语动画状态
    const [greetingAnimated, setGreetingAnimated] = useState<boolean>(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

    // 根据时间段获取问候语
    const getGreeting = (): string => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return "早上好，有什么我能帮你的吗？";
        } else if (hour >= 12 && hour < 14) {
            return "中午好，有什么我能帮你的吗？";
        } else if (hour >= 14 && hour < 18) {
            return "下午好，有什么我能帮你的吗？";
        } else {
            return "晚上好，有什么我能帮你的吗？";
        }
    };

    // 当前问候语
    const [greeting, setGreeting] = useState<string>(getGreeting());

    // 每分钟更新一次问候语，确保时间段变化时问候语也随之变化
    useEffect(() => {
        const updateGreeting = () => {
            setGreeting(getGreeting());
        };

        // 立即更新一次
        updateGreeting();

        // 设置定时器，每分钟更新一次
        const timer = setInterval(updateGreeting, 60000);

        return () => clearInterval(timer);
    }, []);

    // 监听路由变化，当切换页面时重置所有深度思考状态
    useEffect(() => {
        // 重置所有深度思考状态
        setHomeDeepThinking(false);
        setProcessDeepThinking(false);
        setProductDeepThinking(false);
        setModelDeepThinking(false);
        setMoreDeepThinking(false);
        setChatDeepThinking(false);

        // 如果是首页，重置动画状态，准备再次播放动画
        if (location.pathname === '/') {
            setGreetingAnimated(false);
            // 设置一个短暂的延迟，确保DOM已经渲染
            const timer = setTimeout(() => {
                setGreetingAnimated(true);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [location.pathname]);

    // 根据URL参数加载会话
    useEffect(() => {
        const { appId, sessionId } = params;

        if (appId && sessionId && chatSessions.length > 0) {
            console.log(`从URL加载会话: appId=${appId}, sessionId=${sessionId}`);

            // 查找匹配的会话
            const session = chatSessions.find(s => s.id === sessionId);
            if (session) {
                // 选择对应的应用
                const matchingAssistant = {
                    id: appId,
                    name: functionTitles[appId as FunctionIdType] || appId,
                    description: '',
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
                };

                // 如果是有效的功能ID，选择对应的助手
                if (Object.keys(functionTitles).includes(appId)) {
                    selectChatAssistant(matchingAssistant);
                }

                // 选择会话
                selectSession(session);
            } else {
                console.log(`未找到会话: ${sessionId}`);
            }
        }
    }, [params, chatSessions, selectChatAssistant, selectSession]);

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

    // 处理创建新会话
    const handleCreateNewChat = () => {
        const appId = selectedChatAssistant?.id || 'process';

        createChatSession('新对话').then(newSession => {
            if (newSession) {
                // 导航到新会话的URL
                navigate(`/${appId}/${newSession.id}`);
            }
        });
    };

    // 处理选择功能
    const handleSelectFunction = (functionId: FunctionIdType) => {
        console.log(`选择功能: ${functionId}`);

        // 先根据功能ID找到对应的助手并选择它
        const matchingAssistant = {
            id: functionId,
            name: functionTitles[functionId],
            description: '',
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
        };

        // 选择对应的聊天助手
        if (!selectedChatAssistant || selectedChatAssistant.id !== functionId) {
            selectChatAssistant(matchingAssistant);
        }

        // 创建对应功能的会话并导航到新会话页面
        createChatSession(functionTitles[functionId]).then(newSession => {
            if (newSession) {
                // 导航到新会话的URL
                navigate(`/${functionId}/${newSession.id}`);
            } else {
                // 如果创建失败，仍然导航到功能页面
                navigate(functionRoutes[functionId]);
            }
        });
    };

    // 处理发送消息
    const handleSendMessage = (message: string) => {
        console.log("发送消息:", message);

        // 获取当前选中的功能ID
        const appId = selectedChatAssistant?.id || 'process';

        // 如果当前没有会话，先创建一个新会话
        if (!currentSession) {
            createChatSession(functionTitles[appId as FunctionIdType] || '新对话').then(newSession => {
                if (newSession) {
                    // 导航到新会话的URL
                    navigate(`/${appId}/${newSession.id}`);
                    // 发送消息
                    setTimeout(() => {
                        sendMessage(message);
                    }, 100); // 短暂延迟确保会话已创建
                }
            });
        } else {
            // 已有会话，直接发送消息
            sendMessage(message);
        }
    };

    // 渲染聊天页面
    const renderChatPage = () => {
        // 如果没有选择会话，显示提示
        if (!currentSession) {
            return (
                <div className="chat-page empty-chat">
                    <div className="empty-state">
                        <div className="empty-icon">💬</div>
                        <h3>请选择聊天会话</h3>
                        <p>请从左侧边栏选择一个会话开始对话，或者创建新会话。</p>
                        <button
                            className="start-chat-btn"
                            onClick={handleCreateNewChat}
                        >
                            创建新会话
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="chat-page">
                {/* 右上角固定的session name显示区域 */}
                <div className="session-name-display">
                    {currentSession?.name || '新对话'}
                </div>

                {/* 聊天历史 */}
                <ChatHistory />

                {/* 聊天页面输入框 */}
                <div className="chat-input-container">
                    <ChatInputBox
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onSend={handleSendMessage}
                        isDeepThinking={chatDeepThinking}
                        toggleDeepThinking={() => setChatDeepThinking(!chatDeepThinking)}
                    />
                </div>

                {/* 滚动到底部按钮 */}
                {showScrollToBottom && (
                    <button
                        className="scroll-to-bottom-btn"
                        onClick={scrollToBottom}
                        title="滑动到底部"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                )}
            </div>
        );
    };

    // 渲染欢迎页面
    const renderWelcomePage = () => {
        return (
            <div className="page welcome-page">
                <h1 className={`welcome-greeting ${greetingAnimated ? 'animate' : ''}`}>
                    {greeting}
                </h1>

                {/* 欢迎页面输入框 */}
                <div className="chat-input-container">
                    <ChatInputBox
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onSend={handleSendMessage}
                        isDeepThinking={homeDeepThinking}
                        toggleDeepThinking={() => setHomeDeepThinking(!homeDeepThinking)}
                    />
                </div>

                <div className="feature-cards">
                    <div className="feature-card" onClick={(e) => {
                        e.preventDefault();
                        handleSelectFunction('process');
                    }}>
                        <div className="feature-card-icon" style={{ backgroundColor: functionIcons.process.bgColor }}>
                            <span style={{ color: functionIcons.process.color }}>{functionIcons.process.icon}</span>
                        </div>
                        <div className="feature-card-content">
                            <div className="feature-card-title">流程制度检索</div>
                            <div className="feature-card-desc">检索公司制度和文档资料</div>
                        </div>
                    </div>

                    <div className="feature-card" onClick={(e) => {
                        e.preventDefault();
                        handleSelectFunction('product');
                    }}>
                        <div className="feature-card-icon" style={{ backgroundColor: functionIcons.product.bgColor }}>
                            <span style={{ color: functionIcons.product.color }}>{functionIcons.product.icon}</span>
                        </div>
                        <div className="feature-card-content">
                            <div className="feature-card-title">产品技术检索</div>
                            <div className="feature-card-desc">快速检索产品技术文档</div>
                        </div>
                    </div>

                    <div className="feature-card" onClick={(e) => {
                        e.preventDefault();
                        handleSelectFunction('model');
                    }}>
                        <div className="feature-card-icon" style={{ backgroundColor: functionIcons.model.bgColor }}>
                            <span style={{ color: functionIcons.model.color }}>{functionIcons.model.icon}</span>
                        </div>
                        <div className="feature-card-content">
                            <div className="feature-card-title">大模型知识检索</div>
                            <div className="feature-card-desc">获取大模型相关知识</div>
                        </div>
                    </div>

                    <div className="feature-card" onClick={(e) => {
                        e.preventDefault();
                        handleSelectFunction('more');
                    }}>
                        <div className="feature-card-icon" style={{ backgroundColor: functionIcons.more.bgColor }}>
                            <span style={{ color: functionIcons.more.color }}>{functionIcons.more.icon}</span>
                        </div>
                        <div className="feature-card-content">
                            <div className="feature-card-title">简历筛选助手</div>
                            <div className="feature-card-desc">智能简历分析与人才匹配</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 渲染功能特定页面
    const renderFunctionPage = (functionId: FunctionIdType) => {
        // 简历筛选助手使用全屏iframe
        if (functionId === 'more' as FunctionIdType) {
            return (
                <div className="page fullscreen-iframe-page">
                    <iframe
                        src="http://192.168.1.131:9222/chat/share?shared_id=79f7de623c6a11f0a18c0242ac140006&from=agent&auth=JhMGQxMDA4NDA1YjExZjBiNjljMWI2YT&locale=zh"
                        frameBorder="0"
                        className="fullscreen-iframe"
                        title="简历筛选助手"
                    ></iframe>
                </div>
            );
        }

        // 其他功能页面保持原样
        // 根据功能ID显示不同的功能页面
        let title = functionTitles[functionId];
        let description = '';
        let placeholder = '';
        let isDeepThinking = false;
        let toggleDeepThinking = () => { };
        switch (functionId) {
            case 'process':
                description = '快速查询公司内部流程和制度文档';
                placeholder = '输入关键词查询流程制度文档...';
                isDeepThinking = processDeepThinking;
                toggleDeepThinking = () => setProcessDeepThinking(!processDeepThinking);
                break;
            case 'product':
                description = '查询产品功能和技术实现相关信息';
                placeholder = '请输入产品或技术关键词...';
                isDeepThinking = productDeepThinking;
                toggleDeepThinking = () => setProductDeepThinking(!productDeepThinking);
                break;
            case 'model':
                description = '获取大模型相关知识和最新研究进展';
                placeholder = '请输入大模型相关问题...';
                isDeepThinking = modelDeepThinking;
                toggleDeepThinking = () => setModelDeepThinking(!modelDeepThinking);
                break;
        }

        // 以下是普通功能页面的渲染
        return (
            <div className="page welcome-page">
                <h1 className="welcome-greeting">{title}</h1>
                <p className="welcome-description">{description}</p>

                {/* 功能页面输入框 */}
                <div className="chat-input-container">
                    <ChatInputBox
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        placeholder={placeholder}
                        onSend={handleSendMessage}
                        isDeepThinking={isDeepThinking}
                        toggleDeepThinking={toggleDeepThinking}
                    />
                </div>

                {/* 根据不同功能展示不同的推荐内容 */}
                <div className="function-suggestions">
                    <h3>推荐问题</h3>
                    <div className="suggestion-list">
                        {functionId === 'process' && (
                            <>
                                <div className={`suggestion-item ${selectedSuggestion === '公司请假流程是什么？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('公司请假流程是什么？');
                                    setTimeout(() => {
                                        setInputValue('公司请假流程是什么？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    公司请假流程是什么？
                                </div>
                                <div className={`suggestion-item ${selectedSuggestion === '差旅报销制度有哪些规定？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('差旅报销制度有哪些规定？');
                                    setTimeout(() => {
                                        setInputValue('差旅报销制度有哪些规定？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    差旅报销制度有哪些规定？
                                </div>
                                <div className={`suggestion-item ${selectedSuggestion === '新员工入职需要准备哪些材料？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('新员工入职需要准备哪些材料？');
                                    setTimeout(() => {
                                        setInputValue('新员工入职需要准备哪些材料？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    新员工入职需要准备哪些材料？
                                </div>
                            </>
                        )}

                        {functionId === 'product' && (
                            <>
                                <div className={`suggestion-item ${selectedSuggestion === '产品的核心功能有哪些？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('产品的核心功能有哪些？');
                                    setTimeout(() => {
                                        setInputValue('产品的核心功能有哪些？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    产品的核心功能有哪些？
                                </div>
                                <div className={`suggestion-item ${selectedSuggestion === '系统架构是如何设计的？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('系统架构是如何设计的？');
                                    setTimeout(() => {
                                        setInputValue('系统架构是如何设计的？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    系统架构是如何设计的？
                                </div>
                                <div className={`suggestion-item ${selectedSuggestion === '最新版本更新了哪些内容？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('最新版本更新了哪些内容？');
                                    setTimeout(() => {
                                        setInputValue('最新版本更新了哪些内容？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    最新版本更新了哪些内容？
                                </div>
                            </>
                        )}

                        {functionId === 'model' && (
                            <>
                                <div className={`suggestion-item ${selectedSuggestion === '什么是Transformer架构？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('什么是Transformer架构？');
                                    setTimeout(() => {
                                        setInputValue('什么是Transformer架构？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    什么是Transformer架构？
                                </div>
                                <div className={`suggestion-item ${selectedSuggestion === '大模型的训练方法有哪些？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('大模型的训练方法有哪些？');
                                    setTimeout(() => {
                                        setInputValue('大模型的训练方法有哪些？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    大模型的训练方法有哪些？
                                </div>
                                <div className={`suggestion-item ${selectedSuggestion === '如何评估大语言模型的性能？' ? 'selected' : ''}`} onClick={() => {
                                    setSelectedSuggestion('如何评估大语言模型的性能？');
                                    setTimeout(() => {
                                        setInputValue('如何评估大语言模型的性能？');
                                        setSelectedSuggestion(null);
                                    }, 150);
                                }}>
                                    如何评估大语言模型的性能？
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // 检查是否在首页
    const isHomePage = location.pathname === '/';

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
                <div className="sidebar-inner">
                    <div className="sidebar-section function-section">
                        <AssistantList />
                    </div>
                    <div className="sidebar-section session-section">
                        <SessionList />
                    </div>
                </div>
            </div>

            {/* 主聊天区域 */}
            <div className="chat-container">
                {/* 侧边栏展开按钮 - 仅在侧边栏隐藏时显示 */}
                {!isSidebarVisible && (
                    <button
                        className="show-sidebar-button"
                        onClick={toggleSidebar}
                        title="展开侧边栏"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                )}

                {/* 基于路由渲染页面内容 */}
                <Routes>
                    <Route path="/" element={renderWelcomePage()} />
                    <Route path="/process" element={renderFunctionPage('process')} />
                    <Route path="/product" element={renderFunctionPage('product')} />
                    <Route path="/model" element={renderFunctionPage('model')} />
                    <Route path="/more" element={renderFunctionPage('more')} />
                    <Route path="/chat" element={renderChatPage()} />
                    <Route path="/:appId/:sessionId" element={renderChatPage()} />
                    <Route path="*" element={
                        // 只有在会话数据加载完成且确实找不到匹配的会话时才重定向
                        !loadingSessions && chatSessions.length > 0 ?
                            <Navigate to="/" replace /> :
                            <div className="loading-placeholder">加载中...</div>
                    } />
                </Routes>
            </div>
        </div>
    );
};

export default ChatLayout;