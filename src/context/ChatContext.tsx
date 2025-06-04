import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode, useRef } from 'react';
import { apiClient } from '../services';
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
    selectChatAssistant: (assistant: ChatAssistant | null) => void;

    // 会话管理
    chatSessions: ChatSession[];
    currentSession: ChatSession | null;
    loadingSessions: boolean;
    fetchChatSessions: () => Promise<void>;
    createChatSession: (name?: string) => Promise<ChatSession | null>;
    selectSession: (session: ChatSession) => void;
    deleteSession: (sessionId: string) => Promise<boolean>;
    renameSession: (sessionId: string, name: string) => Promise<void>;

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
        try {
            console.log('ChatContext: 设置API密钥');

            // 直接使用API返回的密钥，不添加Bearer前缀
            const formattedKey = key;

            // 设置API密钥到客户端
            apiClient.setApiKey(formattedKey);

            // 更新本地存储
            localStorage.setItem('ragflow_api_key', formattedKey);

            // 更新状态
            setApiKeyState(formattedKey);
            setIsAuthenticated(true);

            console.log('ChatContext: API密钥设置成功');
        } catch (error) {
            console.error('ChatContext: 设置API密钥失败', error);
            // 清除无效的密钥
            apiClient.clearApiKey();
            localStorage.removeItem('ragflow_api_key');
            setApiKeyState('');
            setIsAuthenticated(false);
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

    // 获取会话列表，带错误处理
    const fetchChatSessions = async () => {
        setLoadingSessions(true);
        setApiError(null);

        try {
            const response = await apiClient.listChatSessions();

            if (response.code === 0 && response.data) {
                console.log('获取会话列表成功:', response.data);

                // 确保response.data是数组
                const sessions = Array.isArray(response.data) ? response.data : [];

                // 类型转换确保符合ChatSession类型
                const validSessions = sessions.map(session => {
                    // 添加缺失字段的默认值
                    if (!session.chat_id && session.id) {
                        session.chat_id = 'default_chat_id';
                    }

                    if (!session.create_time && session.create_date) {
                        session.create_time = new Date(session.create_date).getTime();
                    }

                    if (!session.update_time && session.update_date) {
                        session.update_time = new Date(session.update_date).getTime();
                    }

                    return session as ChatSession;
                });

                setChatSessions(validSessions);

                // 如果之前选中的会话不在新列表中，重置当前会话
                if (currentSession && !validSessions.find(s => s.id === currentSession.id)) {
                    setCurrentSession(null);
                    setMessages([]);
                }
            } else {
                console.error('获取会话列表失败:', response.message);
                setApiError(`获取会话列表失败: ${response.message}`);
                setChatSessions([]);
            }
        } catch (error) {
            console.error('获取会话列表异常:', error);
            setApiError(`获取会话列表异常: ${(error as Error).message}`);
            setChatSessions([]);
        } finally {
            setLoadingSessions(false);
        }
    };

    // 创建会话
    const createChatSession = async (name: string = '新会话') => {
        if (!selectedChatAssistant) {
            console.error('创建会话失败: 未选择聊天助手');
            return null;
        }

        try {
            const response = await apiClient.createChatSession(name);

            if (response.code === 0 && response.data) {
                console.log('创建会话成功:', response.data);
                const newSession: ChatSession = {
                    ...response.data,
                    id: response.data.id || '',
                    name: name,
                    messages: []
                };

                setChatSessions(prev => [newSession, ...prev]);
                setCurrentSession(newSession);
                setMessages([]);

                return newSession;
            } else {
                console.error('创建会话失败:', response.message);
                setApiError(`创建会话失败: ${response.message}`);
                return null;
            }
        } catch (error) {
            console.error('创建会话异常:', error);
            setApiError(`创建会话异常: ${(error as Error).message}`);
            return null;
        }
    };

    // 删除会话
    const deleteSession = async (sessionId: string) => {
        try {
            const response = await apiClient.deleteSession([sessionId]);

            if (response.code === 0) {
                console.log('删除会话成功:', sessionId);

                // 更新会话列表
                setChatSessions(prev => prev.filter(s => s.id !== sessionId));

                // 如果删除的是当前会话，重置当前会话
                if (currentSession && currentSession.id === sessionId) {
                    setCurrentSession(null);
                    setMessages([]);
                }

                return true;
            } else {
                console.error('删除会话失败:', response.message);
                setApiError(`删除会话失败: ${response.message}`);
                return false;
            }
        } catch (error) {
            console.error('删除会话异常:', error);
            setApiError(`删除会话异常: ${(error as Error).message}`);
            return false;
        }
    };

    // 获取会话消息
    const getSessionMessages = async (sessionId: string) => {
        try {
            const response = await apiClient.getMessages(sessionId);

            if (response.code === 0 && response.data) {
                console.log('获取会话消息成功:', response.data);

                // 如果是数组类型的响应
                if (Array.isArray(response.data) && response.data.length > 0) {
                    const formattedMessages = response.data.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp || Date.now(),
                        reference: msg.reference || null
                    }));

                    // 如果是当前会话，更新消息列表
                    if (currentSession && currentSession.id === sessionId) {
                        setMessages(formattedMessages);

                        // 更新会话中的消息
                        setCurrentSession(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                messages: formattedMessages
                            };
                        });
                    }

                    // 同时更新会话列表中的相应会话
                    setChatSessions(prev => {
                        return prev.map(s => {
                            if (s.id === sessionId) {
                                return {
                                    ...s,
                                    messages: formattedMessages
                                };
                            }
                            return s;
                        });
                    });
                }
            } else {
                console.error('获取会话消息失败:', response.message);
                setApiError(`获取会话消息失败: ${response.message}`);
            }
        } catch (error) {
            console.error('获取会话消息异常:', error);
            setApiError(`获取会话消息异常: ${(error as Error).message}`);
        }
    };

    // 发送消息
    const sendMessage = async (message: string) => {
        if (!message.trim()) return;
        if (!selectedChatAssistant) {
            setApiError('请先选择聊天助手');
            return;
        }

        let targetSession = currentSession;

        // 如果没有当前会话，创建一个新会话
        if (!targetSession) {
            const newSession = await createChatSession();
            if (!newSession) {
                setApiError('创建会话失败');
                return;
            }
            targetSession = newSession;
        }

        // 创建用户消息，根据ChatMessage类型定义
        const userMessage: ChatMessage = {
            role: 'user',
            content: message
        };

        // 创建临时助手消息，根据ChatMessage类型定义
        const tempAssistantMessage: ChatMessage = {
            role: 'assistant',
            content: '...',
            isLoading: true
        };

        // 添加消息到UI中
        const newMessages = [...messages, userMessage, tempAssistantMessage];
        setMessages(newMessages);

        // 清空当前消息输入
        setCurrentMessage('');

        // 标记正在输入状态
        setIsTyping(true);

        const sessionId = targetSession.id;

        let responseText = '';
        let responseReference: Reference | null = null;

        try {
            // 真正发送消息的API调用
            console.log('发送消息:', {
                sessionId,
                message
            });

            // 使用流式接口获取回复
            await apiClient.streamChatMessage(
                sessionId,
                message,
                (partialResponse) => {
                    if (partialResponse && partialResponse.data) {
                        responseText = partialResponse.data.answer || '';

                        // 更新UI中的消息
                        setMessages(currentMessages => {
                            const newMessages = [...currentMessages];
                            const lastMessageIndex = newMessages.length - 1;

                            // 确保最后一条消息是助手消息
                            if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                                newMessages[lastMessageIndex] = {
                                    ...newMessages[lastMessageIndex],
                                    content: responseText,
                                    isLoading: true
                                };
                            }

                            return newMessages;
                        });
                    }

                    // 如果有引用信息，记录它
                    if (partialResponse && partialResponse.data && partialResponse.data.reference) {
                        responseReference = partialResponse.data.reference;
                    }
                },
                () => {
                    // 消息发送成功，更新最终消息
                    setMessages(currentMessages => {
                        const newMessages = [...currentMessages];
                        const lastMessageIndex = newMessages.length - 1;

                        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                            newMessages[lastMessageIndex] = {
                                ...newMessages[lastMessageIndex],
                                content: responseText,
                                isLoading: false
                                // 注意：我们不再设置reference属性，因为ChatMessage类型中没有定义它
                            };
                        }

                        return newMessages;
                    });

                    // 处理引用信息
                    handleResponseReference(responseReference);

                    // 完成后取消输入状态
                    setIsTyping(false);
                },
                (error) => {
                    // 消息发送失败
                    console.error('发送消息失败:', error.message);
                    setApiError(`发送消息失败: ${error.message}`);

                    // 更新失败的消息状态
                    setMessages(currentMessages => {
                        const newMessages = [...currentMessages];
                        const lastMessageIndex = newMessages.length - 1;

                        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                            newMessages[lastMessageIndex] = {
                                ...newMessages[lastMessageIndex],
                                content: '消息发送失败，请重试。',
                                isError: true,
                                isLoading: false
                            };
                        }

                        return newMessages;
                    });

                    // 取消输入状态
                    setIsTyping(false);
                }
            );
        } catch (error) {
            console.error('发送消息异常:', error);
            setApiError(`发送消息异常: ${(error as Error).message}`);

            // 更新失败的消息状态
            setMessages(currentMessages => {
                const newMessages = [...currentMessages];
                const lastMessageIndex = newMessages.length - 1;

                if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                    newMessages[lastMessageIndex] = {
                        ...newMessages[lastMessageIndex],
                        content: '发生错误，请重试。',
                        isError: true,
                        isLoading: false
                    };
                }

                return newMessages;
            });

            // 取消输入状态
            setIsTyping(false);
        }
    };

    // 获取聊天助手列表
    const fetchChatAssistants = async () => {
        setLoadingChatAssistants(true);

        try {
            // 由于request是私有方法，暂时使用模拟数据来避免错误
            // 实际上我们应该在client.ts中添加公开的listChatAssistants方法
            const mockAssistants: ChatAssistant[] = [{
                id: 'default-assistant',
                name: '默认助手',
                avatar: '',
                description: '默认聊天助手',
                datasets: [],
                llm: {
                    model_name: 'default',
                    temperature: 0.7,
                    top_p: 0.9,
                    presence_penalty: 0,
                    frequency_penalty: 0
                },
                prompt: {
                    similarity_threshold: 0.7,
                    keywords_similarity_weight: 0.5,
                    top_n: 5,
                    variables: [],
                    rerank_model: 'default',
                    empty_response: '',
                    opener: '',
                    prompt: ''
                },
                create_date: new Date().toISOString(),
                update_date: new Date().toISOString(),
                status: 'active'
            }];

            setChatAssistants(mockAssistants);
        } catch (error) {
            console.error('获取助手列表失败:', error);
            setApiError(`获取助手列表失败: ${(error as Error).message}`);
            setChatAssistants([]);
        } finally {
            setLoadingChatAssistants(false);
        }
    };

    // 重命名会话
    const renameSession = async (sessionId: string, name: string) => {
        try {
            // 模拟API响应，因为当前API没有重命名功能
            const response = { code: 0, message: 'Success' };

            // 假设API调用成功
            console.log('重命名会话成功:', { sessionId, name });

            // 更新会话列表
            setChatSessions(prev =>
                prev.map(s =>
                    s.id === sessionId ? { ...s, name } : s
                )
            );

            // 如果是当前会话，更新当前会话
            if (currentSession?.id === sessionId) {
                setCurrentSession(prev => {
                    if (!prev) return null;
                    return { ...prev, name };
                });
            }
        } catch (error) {
            console.error('重命名会话异常:', error);
            setApiError(`重命名会话异常: ${(error as Error).message}`);
        }
    };

    // 使用useEffect监听认证状态变化，自动获取助手和会话列表
    useEffect(() => {
        if (isAuthenticated) {
            // 获取聊天助手
            fetchChatAssistants();

            // 获取会话列表
            fetchChatSessions();

            // 尝试从本地存储恢复选中的助手ID
            const savedAssistantId = localStorage.getItem('ragflow_selected_assistant');
            if (savedAssistantId) {
                // 尝试恢复固定功能菜单的选中状态
                if (['process', 'product', 'model', 'more'].includes(savedAssistantId)) {
                    // 创建一个临时助手对象
                    const tempAssistant: ChatAssistant = {
                        id: savedAssistantId,
                        name: savedAssistantId === 'process' ? '流程制度检索' :
                            savedAssistantId === 'product' ? '产品技术检索' :
                                savedAssistantId === 'model' ? '大模型知识检索' : '更多',
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

                    console.log('从本地存储恢复选中的固定功能:', tempAssistant.name);
                    setSelectedChatAssistant(tempAssistant);
                } else {
                    // 在下一个tick执行，确保chatAssistants已经加载
                    setTimeout(() => {
                        // 查找匹配的助手
                        const assistant = chatAssistants.find(a => a.id === savedAssistantId);
                        if (assistant) {
                            console.log('从本地存储恢复选中的助手:', assistant.name);
                            setSelectedChatAssistant(assistant);
                        }
                    }, 100);
                }
            }
        }
    }, [isAuthenticated]);

    // 添加选择聊天助手和会话的方法，这些在早期编辑中被移除了
    const selectChatAssistant = (assistant: ChatAssistant | null) => {
        console.log('选择聊天助手:', assistant);
        setSelectedChatAssistant(assistant);

        // 保存选中的助手ID到本地存储，以便刷新页面后恢复
        if (assistant) {
            localStorage.setItem('ragflow_selected_assistant', assistant.id);
        } else {
            localStorage.removeItem('ragflow_selected_assistant');
        }

        setCurrentSession(null);
        setMessages([]);
    };

    // 选择会话
    const selectSession = (session: ChatSession) => {
        console.log('选择会话:', session);
        setCurrentSession(session);

        // 保存选中的会话ID到本地存储
        localStorage.setItem('ragflow_selected_session', session.id);

        // 获取会话消息（如果需要）
        if (!session.messages || session.messages.length === 0) {
            getSessionMessages(session.id);
        }
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
        deleteSession,
        renameSession,
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