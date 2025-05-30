import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode, useRef } from 'react';
import { apiClient } from '../api/client';
import { ChatAssistant, ChatMessage, ChatSession, Reference } from '../types';

interface ChatContextType {
    // 身份验证状态
    isAuthenticated: boolean;
    apiKey: string | null;
    setApiKey: (key: string) => void;
    logout: () => void;

    // 聊天助手管理
    chatAssistants: ChatAssistant[];
    selectedChatAssistant: ChatAssistant | null;
    loadingChatAssistants: boolean;
    fetchChatAssistants: () => Promise<void>;
    selectChatAssistant: (assistant: ChatAssistant) => void;

    // 会话管理
    chatSessions: ChatSession[];
    currentSession: ChatSession | null;
    loadingSessions: boolean;
    fetchChatSessions: (chatId: string) => Promise<void>;
    createChatSession: (chatId: string, name?: string) => Promise<void>;
    selectSession: (session: ChatSession) => void;

    // 消息管理
    messages: ChatMessage[];
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    sendMessage: (message: string) => Promise<void>;
    isTyping: boolean;

    // 引用管理
    latestReference: Reference | null;

    // 界面状态
    isSidebarVisible: boolean;
    toggleSidebar: () => void;

    // 系统状态
    apiError: string | null;
    clearApiError: () => void;
    reconnecting: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 认证状态
    const [apiKey, setApiKeyState] = useState<string | null>(apiClient.getApiKey());
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!apiKey);

    // 聊天助手状态
    const [chatAssistants, setChatAssistants] = useState<ChatAssistant[]>([]);
    const [selectedChatAssistant, setSelectedChatAssistant] = useState<ChatAssistant | null>(null);
    const [loadingChatAssistants, setLoadingChatAssistants] = useState<boolean>(false);

    // 会话状态
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [loadingSessions, setLoadingSessions] = useState<boolean>(false);

    // 消息状态
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentMessage, setCurrentMessage] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);

    // 引用状态
    const [latestReference, setLatestReference] = useState<Reference | null>(null);

    // 界面状态
    const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
    const toggleSidebar = () => {
        setIsSidebarVisible(prev => !prev);
        // 保存侧边栏状态到本地存储
        localStorage.setItem('ragflow_sidebar_visible', String(!isSidebarVisible));
    };

    // 系统状态
    const [apiError, setApiError] = useState<string | null>(null);
    const [reconnecting, setReconnecting] = useState<boolean>(false);

    // 重试状态
    const retryCount = useRef<number>(0);
    const maxRetries = 2;
    const retryDelay = 5000;
    const lastFetchTime = useRef<number>(0);

    // 初始化侧边栏状态
    useEffect(() => {
        const savedState = localStorage.getItem('ragflow_sidebar_visible');
        if (savedState !== null) {
            setIsSidebarVisible(savedState === 'true');
        }
    }, []);

    // 添加重连状态的超时清除
    useEffect(() => {
        // 如果重连状态为true，设置一个超时
        if (reconnecting) {
            console.log("设置重连状态超时清除");
            const timeoutId = setTimeout(() => {
                console.log("强制清除重连状态 (超时)");
                setReconnecting(false);
            }, 15000); // 15秒后自动清除重连状态

            // 清理函数
            return () => clearTimeout(timeoutId);
        }
    }, [reconnecting]);

    // 请求节流函数
    const throttledFetch = async (callback: () => Promise<void>, minInterval: number = 2000) => {
        const now = Date.now();
        const elapsed = now - lastFetchTime.current;

        if (elapsed < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
        }

        lastFetchTime.current = Date.now();
        await callback();
    };

    // 清除API错误
    const clearApiError = () => {
        setApiError(null);
    };

    // 当API密钥改变时更新认证状态
    useEffect(() => {
        setIsAuthenticated(!!apiKey);
    }, [apiKey]);

    // 当选择会话时，更新消息列表
    useEffect(() => {
        if (currentSession) {
            setMessages(currentSession.messages || []);
        } else {
            setMessages([]);
        }
    }, [currentSession]);

    // 设置API密钥
    const setApiKey = (key: string) => {
        console.log('ChatContext: 设置API密钥...');
        if (!key || key.trim() === '') {
            console.error('ChatContext: 尝试设置空API密钥');
            return;
        }

        try {
            apiClient.setApiKey(key);
            console.log('ChatContext: API客户端密钥已更新');

            // 确保localStorage也更新了
            localStorage.setItem('ragflow_api_key', key);
            console.log('ChatContext: localStorage密钥已更新');

            // 更新状态
            setApiKeyState(key);
            console.log('ChatContext: 状态密钥已更新');

            clearApiError();
            console.log('ChatContext: API密钥设置完成，状态已更新为已认证');
        } catch (error) {
            console.error('ChatContext: 设置API密钥时出错:', error);
            setApiError(`设置API密钥失败: ${(error as Error).message}`);
        }
    };

    // 登出
    const logout = () => {
        apiClient.clearApiKey();
        setApiKeyState(null);
        setSelectedChatAssistant(null);
        setCurrentSession(null);
        setChatSessions([]);
        setMessages([]);
        clearApiError();
    };

    // 固定警告：responseReference 未使用的问题
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleResponseReference = (ref: Reference | null) => {
        if (ref) setLatestReference(ref);
    };

    // 获取聊天助手列表，带错误处理
    const fetchChatAssistants = async () => {
        // 确保认证状态和API密钥存在
        if (!isAuthenticated || !apiKey) {
            console.log("未认证或API密钥不存在，不获取聊天助手");
            setLoadingChatAssistants(false);
            setReconnecting(false); // 确保重置重连状态
            return;
        }

        // 如果已经在加载中，避免重复请求
        if (loadingChatAssistants) {
            console.log("已经在加载聊天助手，跳过重复请求");
            return;
        }

        setLoadingChatAssistants(true);
        clearApiError();
        setReconnecting(true); // 显示正在连接状态

        try {
            console.log("开始测试API连接...");
            // 先测试API连接
            try {
                // 添加超时处理
                const connectionPromise = apiClient.testConnection();
                const timeoutPromise = new Promise<boolean>((_, reject) => {
                    setTimeout(() => reject(new Error("API连接超时")), 10000); // 10秒超时
                });

                const isConnected = await Promise.race([connectionPromise, timeoutPromise]) as boolean;

                if (!isConnected) {
                    console.error("API连接测试失败");
                    setApiError("无法连接到API服务器，请检查网络连接或API服务器状态");
                    setLoadingChatAssistants(false);
                    setReconnecting(false);
                    return;
                }

                // API连接成功，但保持重连状态直到数据加载完成
                console.log("API连接测试成功，继续获取数据");

            } catch (error) {
                console.error("API连接测试出错:", error);
                setApiError(`API连接出错: ${(error as Error).message}`);
                setLoadingChatAssistants(false);
                setReconnecting(false);
                return;
            }

            // 使用节流控制请求频率
            await throttledFetch(async () => {
                try {
                    const response = await apiClient.listChatAssistants();
                    console.log("API响应:", response); // 添加调试日志

                    // 无论成功与否，都取消重连状态
                    setReconnecting(false);

                    if (response.code === 0 && Array.isArray(response.data)) {
                        // 确保数据格式正确，包含datasets字段
                        const assistants = response.data.map(assistant => ({
                            ...assistant,
                            // 确保datasets存在，如果不存在则设为空数组
                            datasets: assistant.datasets || []
                        }));

                        // 使用批处理更新状态，减少重渲染次数
                        setChatAssistants(assistants);
                        retryCount.current = 0;

                        // 如果有助手，预选第一个
                        if (assistants.length > 0 && !selectedChatAssistant) {
                            console.log("自动选择第一个助手:", assistants[0].name);
                            setSelectedChatAssistant(assistants[0]);
                            fetchChatSessions(assistants[0].id);
                        }
                    } else {
                        console.error('获取聊天助手失败:', response.message);
                        setApiError(`获取聊天助手失败: ${response.message}`);

                        // 如果是认证错误，清除API密钥
                        if (response.code === 401 || response.code === 403) {
                            console.error('API密钥无效，清除认证状态');
                            logout();
                            return;
                        }

                        // 控制重试次数和频率
                        if (retryCount.current < maxRetries) {
                            retryCount.current += 1;
                            const delay = retryDelay * retryCount.current; // 递增延迟
                            console.log(`将在 ${delay / 1000} 秒后重试获取聊天助手(第 ${retryCount.current} 次)`);

                            setTimeout(() => {
                                // 只有在仍然认证的情况下才重试
                                if (isAuthenticated && apiKey) {
                                    console.log("尝试重新获取聊天助手...");
                                    fetchChatAssistants();
                                }
                            }, delay);
                        } else {
                            console.error(`已达到最大重试次数(${maxRetries})，放弃获取聊天助手`);
                            retryCount.current = 0; // 重置重试计数
                        }
                    }
                } catch (innerError) {
                    console.error('获取聊天助手内层错误:', innerError);
                    setReconnecting(false); // 确保出错时也重置重连状态
                    setApiError(`获取聊天助手出错: ${(innerError as Error).message}`);
                }
            });
        } catch (error) {
            console.error('获取聊天助手出错:', error);
            setApiError(`获取聊天助手出错: ${(error as Error).message}`);
            setReconnecting(false);
        } finally {
            setLoadingChatAssistants(false);
            // 再次确保重连状态被重置
            setTimeout(() => {
                if (reconnecting) {
                    console.log('强制重置重连状态');
                    setReconnecting(false);
                }
            }, 5000);
        }
    };

    // 选择聊天助手
    const selectChatAssistant = (assistant: ChatAssistant) => {
        setSelectedChatAssistant(assistant);
        setCurrentSession(null);
        fetchChatSessions(assistant.id);
    };

    // 获取会话列表，带错误处理
    const fetchChatSessions = async (chatId: string) => {
        if (!isAuthenticated || !chatId) return;

        setLoadingSessions(true);
        clearApiError();

        try {
            await throttledFetch(async () => {
                console.log(`获取聊天会话列表, chatId: ${chatId}`);
                const response = await apiClient.listChatSessions(chatId);

                if (response.code === 0) {
                    // 确保data是数组
                    if (Array.isArray(response.data)) {
                        setChatSessions(response.data);
                        retryCount.current = 0;
                    } else if (response.data && typeof response.data === 'object') {
                        // 如果不是数组但是是对象，可能是单个会话或其他格式
                        console.log("返回的会话数据不是数组格式:", response.data);

                        // 尝试将对象转换为数组
                        const sessionsArray = Object.values(response.data).filter(item =>
                            item && typeof item === 'object'
                        );

                        if (sessionsArray.length > 0) {
                            console.log("转换后的会话数组:", sessionsArray);
                            setChatSessions(sessionsArray);
                        } else {
                            // 如果无法转换，创建一个空数组
                            console.log("无法转换会话数据，使用空数组");
                            setChatSessions([]);
                        }
                    } else {
                        // 如果返回的数据格式不正确，使用空数组
                        console.log("会话数据格式不正确，使用空数组");
                        setChatSessions([]);
                    }
                } else {
                    console.error('获取会话列表失败:', response.message);

                    // 特殊处理后端的"list index out of range"错误
                    if (response.message && response.message.includes("list index out of range")) {
                        console.log("后端存在索引越界错误，可能是因为没有会话或参考信息不匹配");

                        // 这种情况下，我们创建一个新会话来解决后端问题
                        if (selectedChatAssistant) {
                            console.log("尝试创建新会话解决后端索引问题...");
                            createChatSession(selectedChatAssistant.id, "新会话");
                            return;
                        }
                    }

                    setApiError(`获取会话列表失败: ${response.message}`);
                    setChatSessions([]); // 设置为空数组，避免使用可能损坏的数据

                    // 限制重试次数和频率
                    if (retryCount.current < maxRetries) {
                        retryCount.current += 1;
                        const delay = retryDelay * retryCount.current; // 递增的延迟时间
                        console.log(`将在 ${delay / 1000} 秒后重试(第 ${retryCount.current} 次)`);

                        setTimeout(() => {
                            if (isAuthenticated && chatId) {
                                fetchChatSessions(chatId);
                            }
                        }, delay);
                    } else {
                        console.error(`已达到最大重试次数(${maxRetries})，放弃获取会话列表`);
                        retryCount.current = 0; // 重置重试计数，以便下次操作可以重新尝试
                    }
                }
            });
        } catch (error) {
            console.error('获取会话列表出错:', error);
            setApiError(`获取会话列表出错: ${(error as Error).message}`);
            setChatSessions([]); // 设置为空数组，确保UI不会尝试渲染未定义的数据
        } finally {
            setLoadingSessions(false);
        }
    };

    // 创建聊天会话，带错误处理
    const createChatSession = async (chatId: string, name: string = '新会话') => {
        if (!isAuthenticated || !chatId) return;

        clearApiError();
        try {
            const response = await apiClient.createChatSession(chatId, name);
            if (response.code === 0 && response.data) {
                const newSession = response.data;
                setChatSessions(prev => [newSession, ...prev]);
                selectSession(newSession);
                retryCount.current = 0;
            } else {
                console.error('创建会话失败:', response.message);
                setApiError(`创建会话失败: ${response.message}`);
            }
        } catch (error) {
            console.error('创建会话出错:', error);
            setApiError(`创建会话出错: ${(error as Error).message}`);
        }
    };

    // 选择会话
    const selectSession = (session: ChatSession) => {
        setCurrentSession(session);
        setMessages(session.messages || []);
    };

    // 发送消息，带错误处理和用户反馈
    const sendMessage = async (message: string) => {
        if (!isAuthenticated || !selectedChatAssistant || !message.trim()) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: message,
        };

        // 添加用户消息到列表 - 使用函数式更新确保状态一致性
        setMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');
        setIsTyping(true);
        clearApiError();

        // 准备请求
        const request = {
            question: message,
            session_id: currentSession?.id,
        };

        // 收集的响应内容
        let responseContent = '';
        let responseReference: Reference | null = null;
        let sessionId = currentSession?.id || '';

        // 错误重试计数器
        let messageRetryCount = 0;
        const maxMessageRetries = 1; // 消息发送最多只重试一次

        // 用于取消请求的控制器
        const abortController = new AbortController();

        // 设置一个超时，如果用户等待太久
        const userFeedbackTimeout = setTimeout(() => {
            if (!responseContent) {
                // 如果还没有任何响应，添加一个临时消息告诉用户我们正在等待
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '正在等待服务器响应，请稍候...',
                    isLoading: true,  // 标记此消息为加载状态
                }]);
            }
        }, 5000);  // 5秒后显示等待提示

        const sendMessageWithRetry = async () => {
            try {
                // 使用流式响应
                await apiClient.streamChatMessage(
                    selectedChatAssistant.id,
                    request,
                    (chunk) => {
                        if (chunk.code === 0 && chunk.data && typeof chunk.data !== 'boolean') {
                            const { answer, reference, session_id } = chunk.data;

                            // 更新响应内容
                            if (answer && typeof answer === 'string') {
                                responseContent = answer;
                                // 使用函数式更新确保状态更新正确
                                setMessages(prev => {
                                    const newMessages = [...prev];

                                    // 首先删除任何临时的"正在等待"消息
                                    const filteredMessages = newMessages.filter(
                                        m => !m.isLoading
                                    );

                                    const lastAssistantIndex = filteredMessages.findIndex(
                                        m => m.role === 'assistant' && m.content.startsWith(responseContent.substring(0, Math.min(10, responseContent.length)))
                                    );

                                    if (lastAssistantIndex >= 0) {
                                        filteredMessages[lastAssistantIndex] = {
                                            ...filteredMessages[lastAssistantIndex],
                                            content: responseContent,
                                        };
                                    } else {
                                        filteredMessages.push({
                                            role: 'assistant',
                                            content: responseContent,
                                        });
                                    }

                                    return filteredMessages;
                                });

                                // 如果有了响应，清除用户反馈超时
                                if (userFeedbackTimeout) {
                                    clearTimeout(userFeedbackTimeout);
                                }
                            }

                            // 更新引用
                            if (reference) {
                                responseReference = reference;
                                handleResponseReference(reference);
                            }

                            // 保存会话ID（如果是新会话）
                            if (session_id) {
                                sessionId = session_id;
                            }

                            // 清除之前的错误
                            clearApiError();
                            // 重置重试计数
                            retryCount.current = 0;
                        } else if (chunk.code !== 0) {
                            // 处理错误响应
                            console.error('接收到错误响应:', chunk.message);

                            // 特殊处理"list index out of range"错误
                            if (chunk.message && chunk.message.includes("list index out of range")) {
                                console.log("检测到索引越界错误，可能需要创建新会话");
                                // 不在这里直接处理，让错误回调来处理这种情况
                            }
                        }
                    },
                    () => {
                        // 完成后的处理
                        setIsTyping(false);

                        // 清除用户反馈超时
                        if (userFeedbackTimeout) {
                            clearTimeout(userFeedbackTimeout);
                        }

                        // 确保删除任何临时的"正在等待"消息
                        setMessages(prev => prev.filter(m => !m.isLoading));

                        // 如果是新会话，需要更新当前会话信息
                        if (!currentSession && sessionId) {
                            // 获取最新的会话信息
                            apiClient.listChatSessions(selectedChatAssistant.id).then((response) => {
                                if (response.code === 0 && Array.isArray(response.data)) {
                                    const newSession = response.data.find(session => session.id === sessionId);
                                    if (newSession) {
                                        setChatSessions(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
                                        setCurrentSession(newSession);
                                    }
                                }
                            });
                        }
                    },
                    (error) => {
                        console.error('发送消息出错:', error);
                        setIsTyping(false);

                        // 清除用户反馈超时
                        if (userFeedbackTimeout) {
                            clearTimeout(userFeedbackTimeout);
                        }

                        // 处理特定类型的错误
                        if (error.message && error.message.includes("list index out of range")) {
                            console.log("发送消息时遇到索引越界错误，尝试创建新会话");

                            // 如果是索引错误，且消息还未重试过，尝试创建一个新会话
                            if (messageRetryCount < maxMessageRetries) {
                                messageRetryCount++;
                                console.log(`尝试创建新会话并重新发送消息(第 ${messageRetryCount} 次)`);

                                // 删除任何临时的"正在等待"消息
                                setMessages(prev => prev.filter(m => !m.isLoading));

                                // 创建新会话并在创建后重新发送消息
                                createChatSession(selectedChatAssistant.id, "新会话").then(() => {
                                    // 更新请求中的session_id为新创建的会话ID
                                    if (currentSession) {
                                        request.session_id = currentSession.id;
                                        console.log(`使用新会话ID重新发送: ${currentSession.id}`);
                                        // 递归调用自身重试
                                        setTimeout(() => sendMessageWithRetry(), 1000);
                                    }
                                });
                                return;
                            }
                        }

                        // 处理超时错误
                        let errorMessage = error.message;
                        let errorSolution = '';

                        if (error.name === 'AbortError' || error.message.includes('超时')) {
                            errorMessage = '服务器响应超时';
                            errorSolution = '请检查网络连接或服务器状态，稍后再试';
                        } else if (error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
                            errorMessage = '服务器资源不足';
                            errorSolution = '服务器当前负载过高，请稍后再试';
                        }

                        // 通用错误处理
                        setApiError(`发送消息失败: ${errorMessage}`);

                        // 添加错误消息，并删除任何临时的"正在等待"消息
                        setMessages(prev => {
                            // 先过滤掉临时消息
                            const filteredMessages = prev.filter(m => !m.isLoading);

                            return [
                                ...filteredMessages,
                                {
                                    role: 'assistant',
                                    content: `${errorMessage}${errorSolution ? '，' + errorSolution : ''}`,
                                    isError: true,
                                },
                            ];
                        });
                    }
                );
            } catch (error) {
                console.error('发送消息出错:', error);
                setIsTyping(false);

                // 清除用户反馈超时
                if (userFeedbackTimeout) {
                    clearTimeout(userFeedbackTimeout);
                }

                setApiError(`发送消息出错: ${(error as Error).message}`);

                // 添加错误消息到聊天，并删除任何临时的"正在等待"消息
                setMessages(prev => {
                    // 先过滤掉临时消息
                    const filteredMessages = prev.filter(m => !m.isLoading);

                    return [
                        ...filteredMessages,
                        {
                            role: 'assistant',
                            content: `发送消息出错: ${(error as Error).message}。请检查API服务器或网络连接。`,
                            isError: true,
                        },
                    ];
                });
            }
        };

        // 开始发送消息
        await sendMessageWithRetry();
    };

    const value: ChatContextType = {
        isAuthenticated,
        apiKey,
        setApiKey,
        logout,
        chatAssistants,
        selectedChatAssistant,
        loadingChatAssistants,
        fetchChatAssistants,
        selectChatAssistant,
        chatSessions,
        currentSession,
        loadingSessions,
        fetchChatSessions,
        createChatSession,
        selectSession,
        messages,
        currentMessage,
        setCurrentMessage,
        sendMessage,
        isTyping,
        latestReference,
        isSidebarVisible,
        toggleSidebar,
        apiError,
        clearApiError,
        reconnecting
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 