import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { apiClient } from '../services';
import { ChatAssistant, ChatMessage, ChatSession, Reference, ApiResponse, ChatCompletion, StreamChatResponse, IReference } from '../types';
import { functionTitles, FunctionIdType, functionRoutes } from '../components/Layout/NavigationBar';
import { replaceTextByOldReg } from '../utils/markdownUtils';

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
    createChatSession: (name?: string, appId?: string) => Promise<ChatSession | null>;
    selectSession: (session: ChatSession) => void;
    deleteSession: (sessionId: string) => Promise<boolean>;
    renameSession: (sessionId: string, name: string) => Promise<void>;

    // 消息管理
    messages: ChatMessage[];
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    sendMessage: (message: string) => Promise<void>;
    isTyping: boolean;

    // 流式响应控制 - 新增
    isReceivingStream: boolean;
    isPaused: boolean;
    toggleStreamPause: () => void;

    // 引用管理
    latestReference: Reference | null;
    reference: IReference | undefined;

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

    // 从URL获取的路径参数
    const [urlAppId, setUrlAppId] = useState<string | null>(null);
    const [urlSessionId, setUrlSessionId] = useState<string | null>(null);

    // 消息状态
    const [messages, setMessagesState] = useState<ChatMessage[]>([]);
    const [currentMessage, setCurrentMessage] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);

    // 基于会话的状态管理
    const [sessionStates, setSessionStates] = useState<Record<string, {
        isTyping: boolean;
        isReceivingStream: boolean;
        isPaused: boolean;
    }>>({});

    const setMessages = (newMessages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])) => {
        if (typeof newMessages === 'function') {
            setMessagesState(prevMessages => {
                const result = newMessages(prevMessages);
                return result;
            });
        } else {
            setMessagesState(newMessages);
        }
    };

    // 引用状态
    const [latestReference, setLatestReference] = useState<Reference | null>(
        // 尝试从localStorage恢复参考文档数据
        (() => {
            try {
                const savedRef = localStorage.getItem('ragflow_latest_reference');
                return savedRef ? JSON.parse(savedRef) : null;
            } catch (e) {
                console.error('恢复参考文档失败:', e);
                return null;
            }
        })()
    );
    const [reference, setReference] = useState<IReference | undefined>(undefined);

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

    // 添加流式响应控制状态 - 现在基于会话管理
    const streamControllers = useRef<Record<string, AbortController>>({});

    // 获取当前会话的状态
    const getCurrentSessionState = useCallback((sessionId?: string) => {
        if (!sessionId) return { isTyping: false, isReceivingStream: false, isPaused: false };
        return sessionStates[sessionId] || { isTyping: false, isReceivingStream: false, isPaused: false };
    }, [sessionStates]);

    // 更新会话状态
    const updateSessionState = useCallback((sessionId: string, updates: Partial<{
        isTyping: boolean;
        isReceivingStream: boolean;
        isPaused: boolean;
    }>) => {
        setSessionStates(prev => ({
            ...prev,
            [sessionId]: {
                ...getCurrentSessionState(sessionId),
                ...updates
            }
        }));
    }, [getCurrentSessionState]);

    // 添加暂停/继续流式响应的方法
    const toggleStreamPause = useCallback(() => {
        if (!currentSession) return;

        const sessionId = currentSession.id;
        const currentState = getCurrentSessionState(sessionId);

        if (currentState.isPaused) {
            // 如果已暂停，则恢复
            updateSessionState(sessionId, { isPaused: false });
            console.log('恢复流式响应');
            // 这里可以添加恢复流式响应的逻辑，或者重新发起请求
        } else {
            // 如果未暂停，则暂停
            updateSessionState(sessionId, { isPaused: true });
            console.log('暂停流式响应');
            // 如果有活跃的流式请求，可以中止请求
            if (streamControllers.current[sessionId]) {
                streamControllers.current[sessionId].abort();
                console.log('中止当前流式请求');
            }
        }
    }, [currentSession, getCurrentSessionState, updateSessionState]);

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

    // 从URL解析应用ID和会话ID
    const parseUrlParams = useCallback(() => {
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(part => part);
        let appId = null;
        let sessionId = null;

        // 新的路由格式: /chat/appId/sessionId
        if (pathParts.length >= 2 && pathParts[0] === 'chat') {
            appId = pathParts[1];

            // 检查是否是有效的应用ID
            const validAppIds = Object.keys(functionRoutes).map(key => key);
            if (!validAppIds.includes(appId)) {
                // 如果不是有效的应用ID，可能是功能页面路径，保持原样
                appId = pathParts[1];
            }

            if (pathParts.length >= 3) {
                sessionId = pathParts[2];
            }
        }

        console.log(`URL参数解析: appId=${appId}, sessionId=${sessionId}`);

        // 更新URL参数状态
        setUrlAppId(appId);
        setUrlSessionId(sessionId);

        return { appId, sessionId };
    }, []);

    // 当API密钥改变时更新认证状态
    useEffect(() => {
        setIsAuthenticated(!!apiKey);
    }, [apiKey]);

    // 从URL恢复应用状态
    const restoreStateFromUrl = useCallback(async () => {
        if (!isAuthenticated) return;

        const { appId, sessionId } = parseUrlParams();
        const currentPath = window.location.pathname;

        // 确定要选择的应用ID
        let targetAppId = appId;

        // 如果是 /chat 路径（没有具体的应用ID），默认选择 chat 功能
        if (currentPath === '/chat' && !appId) {
            targetAppId = 'chat';
        }

        // 如果URL中有应用ID或者是 /chat 路径，恢复选中的聊天助手
        if (targetAppId) {
            console.log(`从URL恢复应用: ${targetAppId}`);

            // 保存到localStorage
            localStorage.setItem('ragflow_selected_assistant', targetAppId);

            // 创建一个临时的聊天助手对象
            const tempAssistant: ChatAssistant = {
                id: targetAppId,
                name: functionTitles[targetAppId as FunctionIdType] || '聊天助手',
                avatar: '',
                description: '',
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
            };

            // 设置应用ID和选中的聊天助手
            apiClient.setAppId(targetAppId);
            setSelectedChatAssistant(tempAssistant);

            // 获取会话列表
            await fetchChatSessions();
        }
    }, [isAuthenticated, parseUrlParams]);

    // 在组件初始化和认证状态变化时恢复状态
    useEffect(() => {
        if (isAuthenticated) {
            restoreStateFromUrl();
        }
    }, [restoreStateFromUrl, isAuthenticated]);

    // 监听路径变化，确保在 /chat 路径时选中 chat 功能
    useEffect(() => {
        if (!isAuthenticated) return;

        const currentPath = window.location.pathname;

        // 如果当前在 /chat 路径且没有选中助手，或者选中的助手不是 chat
        if (currentPath === '/chat' && (!selectedChatAssistant || selectedChatAssistant.id !== 'chat')) {
            console.log('检测到 /chat 路径，自动选择 chat 功能');

            const chatAssistant: ChatAssistant = {
                id: 'chat',
                name: 'TensorChat',
                avatar: '',
                description: '智能对话助手',
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
            };

            localStorage.setItem('ragflow_selected_assistant', 'chat');
            apiClient.setAppId('chat');
            setSelectedChatAssistant(chatAssistant);
            fetchChatSessions();
        }
    }, [isAuthenticated, selectedChatAssistant]);

    // 当选择会话时，更新消息列表
    useEffect(() => {
        if (currentSession) {
            // 修复：转换消息中的reference字段类型
            const convertedMessages = currentSession.messages.map((msg, index) => {
                // 创建一个符合ChatMessage类型的新消息对象
                const chatMsg: ChatMessage = {
                    id: `restored-${Date.now()}-${index}`, // 后端消息没有id，生成一个
                    role: msg.role,
                    content: msg.content,
                    timestamp: Date.now() + index, // 后端消息没有timestamp，生成一个递增的时间戳
                    completed: true, // 后端消息默认为已完成
                    isLoading: false // 后端消息默认不在加载中
                };

                // 如果存在reference且为字符串，尝试转换为Reference对象
                if (msg.reference) {
                    try {
                        // 如果是JSON字符串，尝试解析
                        if (typeof msg.reference === 'string') {
                            chatMsg.reference = JSON.parse(msg.reference) as Reference;
                        } else {
                            chatMsg.reference = msg.reference;
                        }
                    } catch (e) {
                        console.warn('无法解析消息引用:', e);
                        // 创建一个空的Reference对象
                        chatMsg.reference = { total: 0, chunks: [], doc_aggs: [] };
                    }
                }

                return chatMsg;
            });

            setMessages(convertedMessages);
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

    // 保存参考文档信息
    const handleResponseReference = (ref: Reference | null) => {
        setLatestReference(ref);

        // 将参考文档保存到localStorage
        if (ref) {
            try {
                localStorage.setItem('ragflow_latest_reference', JSON.stringify(ref));
            } catch (e) {
                console.error('保存参考文档失败:', e);
            }
        }
    };

    // 获取会话列表，带错误处理
    const fetchChatSessions = async () => {
        setLoadingSessions(true);
        setApiError(null);

        try {
            const response = await apiClient.listChatSessions();
            console.log('API响应完整结构:', response);
            console.log('响应code:', response.code);
            console.log('响应data:', response.data);
            console.log('响应message:', response.message);

            if (response.code === 0 && response.data) {
                console.log('获取会话列表成功:', response.data);

                // 确保response.data是数组
                const sessions = Array.isArray(response.data) ? response.data : [];

                // 类型转换确保符合ChatSession类型
                const validSessions = sessions.map((session: any) => {
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

                // 尝试从URL恢复会话
                const { sessionId } = parseUrlParams();
                if (sessionId) {
                    console.log(`尝试从URL恢复会话: ${sessionId}`);
                    const targetSession = validSessions.find(s => s.id === sessionId);
                    if (targetSession) {
                        console.log(`找到会话: ${targetSession.name}`);
                        setCurrentSession(targetSession);
                        getSessionMessages(targetSession.id);
                    } else {
                        console.log(`未找到会话ID: ${sessionId}`);
                    }
                }

                // 如果之前选中的会话不在新列表中，重置当前会话
                if (currentSession && !validSessions.find((s: ChatSession) => s.id === currentSession.id)) {
                    setCurrentSession(null);
                    setMessages([]);
                }
            } else {
                console.error('获取会话列表失败 - 条件不满足');
                console.error('response.code !== 0:', response.code !== 0);
                console.error('!response.data:', !response.data);
                console.error('response.message:', response.message);
                setApiError(`获取会话列表失败: ${response.message || '响应格式错误'}`);
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
    const createChatSession = async (name: string = '新会话', appId?: string) => {
        if (!selectedChatAssistant) {
            console.error('创建会话失败: 未选择聊天助手');
            return null;
        }

        try {
            // 如果提供了appId，临时设置到apiClient中
            const originalAppId = apiClient.getAppId();
            if (appId) {
                console.log(`为创建会话临时设置appId: ${appId}`);
                apiClient.setAppId(appId);
            }

            const response = await apiClient.createChatSession(name);

            // 恢复原来的appId（如果有修改的话）
            if (appId && originalAppId) {
                apiClient.setAppId(originalAppId);
            }

            if (response.code === 0 && response.data) {
                console.log('创建会话成功:', response.data);

                // 处理后端返回的初始消息
                const initialMessages = response.data.messages || [];
                const baseTimestamp = Date.now();
                const formattedInitialMessages = initialMessages.map((msg: any, index: number) => {
                    const messageContent = msg.content || '';
                    console.log(`初始消息 #${index}:`, {
                        role: msg.role,
                        content: messageContent,
                        contentLength: messageContent.length,
                        isEmpty: !messageContent || messageContent === ''
                    });
                    return {
                        id: `initial-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                        role: msg.role || 'assistant',
                        content: messageContent,
                        reference: msg.reference || null,
                        timestamp: baseTimestamp + index, // 确保每个消息有唯一的时间戳
                        completed: true,
                        isLoading: false // 明确设置初始消息不在加载状态
                    };
                });

                const newSession: ChatSession = {
                    ...response.data,
                    id: response.data.id || '',
                    name: name,
                    messages: formattedInitialMessages
                };

                setChatSessions(prev => [newSession, ...prev]);
                setCurrentSession(newSession);
                // 设置初始消息到当前消息列表
                setMessages(formattedInitialMessages);

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
    /**
     * 删除会话
     * @param sessionId 要删除的会话ID
     * @returns 删除是否成功
     */
    const deleteSession = async (sessionId: string) => {
        try {
            const response = await apiClient.deleteSession([sessionId]);

            if (response.code === 0) {
                console.log('删除会话成功:', sessionId);

                // 在删除前找到要删除的会话在列表中的位置
                const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
                const isCurrentSession = currentSession && currentSession.id === sessionId;

                // 更新会话列表
                const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
                setChatSessions(updatedSessions);

                // 如果删除的是当前会话，自动选择下一个会话
                if (isCurrentSession && updatedSessions.length > 0) {
                    // 选择策略：优先选择删除位置的下一个会话，如果没有则选择前一个
                    let nextSessionIndex = sessionIndex;

                    // 如果删除的是最后一个会话，选择新的最后一个会话
                    if (nextSessionIndex >= updatedSessions.length) {
                        nextSessionIndex = updatedSessions.length - 1;
                    }

                    const nextSession = updatedSessions[nextSessionIndex];
                    console.log('自动选择下一个会话:', nextSession.id);

                    // 选择下一个会话
                    selectSession(nextSession);
                } else if (isCurrentSession) {
                    // 如果没有其他会话了，重置当前会话
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
                // 检查消息数据格式
                if (Array.isArray(response.data)) {
                    // 确保格式转换正确
                    const formattedMessages = response.data.map((msg: any) => {
                        // 检查并恢复引用数据
                        const msgReference = msg.reference || null;
                        if (msgReference && msgReference.doc_aggs && msgReference.doc_aggs.length > 0) {
                            // 保存最新的引用信息
                            handleResponseReference(msgReference);
                        }

                        return {
                            role: msg.role || "user", // 确保角色有效
                            content: msg.content || "",
                            timestamp: Date.now(),
                            reference: msg.reference || null,
                            completed: true, // 历史消息标记为已完成
                            isLoading: false // 明确设置历史消息不在加载状态
                        };
                    });

                    // 更新当前消息列表
                    setMessages(formattedMessages);

                    // 更新当前会话中的消息
                    if (currentSession && currentSession.id === sessionId) {
                        setCurrentSession(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                messages: formattedMessages
                            };
                        });
                    }

                    // 更新会话列表中的对应会话
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
                } else {
                    console.warn("返回的消息不是数组格式:", typeof response.data);
                }
            } else {
                console.error(`获取会话[${sessionId}]消息失败:`, response.message || '未知错误');
                setApiError(`获取会话消息失败: ${response.message || '未知错误'}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`获取会话[${sessionId}]消息异常:`, errorMessage, error);
            setApiError(`获取会话消息异常: ${errorMessage}`);
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

        // 如果没有当前会话，无法发送消息
        if (!targetSession) {
            console.error('sendMessage: 没有当前会话，无法发送消息');
            setApiError('发送消息失败：没有活动会话');
            return;
        }

        console.log('sendMessage: 使用会话发送消息:', {
            sessionId: targetSession.id,
            currentMessagesCount: messages.length,
            sessionMessagesCount: targetSession.messages?.length || 0
        });

        // 创建用户消息，根据ChatMessage类型定义
        const baseTimestamp = Date.now();
        const userMessage: ChatMessage = {
            id: `user-${baseTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'user',
            content: message,
            timestamp: baseTimestamp
        };

        // 创建临时助手消息，根据ChatMessage类型定义
        const tempAssistantMessage: ChatMessage = {
            id: `assistant-${baseTimestamp + 1}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: '',
            isLoading: true,
            timestamp: baseTimestamp + 1 // 确保助手消息的时间戳晚于用户消息
        };

        // 添加消息到UI中 - 确保正确的消息顺序
        // 使用当前会话的消息列表，而不是全局messages状态
        const currentSessionMessages = targetSession.messages || [];

        // 转换现有消息为ChatSession.messages格式
        const updatedMessages = currentSessionMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata || null,
            reference: msg.reference || null
        }));

        // 创建符合ChatSession.messages类型的用户消息和临时助手消息
        const sessionUserMessage = {
            role: userMessage.role as "user" | "assistant" | "system",
            content: userMessage.content,
            metadata: null,
            reference: null
        };

        const sessionTempAssistantMessage = {
            role: tempAssistantMessage.role as "user" | "assistant" | "system",
            content: tempAssistantMessage.content,
            metadata: null,
            reference: null
        };

        // 将用户消息和临时助手消息添加到消息列表末尾
        const newMessages = [...updatedMessages, sessionUserMessage, sessionTempAssistantMessage];

        // 为UI显示创建ChatMessage格式的消息列表
        const uiMessages = [...currentSessionMessages.map((msg, index) => ({
            id: `session-msg-${targetSession?.id || 'unknown'}-${index}`,
            role: msg.role,
            content: msg.content,
            isLoading: false,
            completed: true,
            timestamp: Date.now(),
            reference: msg.reference ? {
                total: 0,
                chunks: [],
                doc_aggs: []
            } : undefined
        } as ChatMessage)), userMessage, tempAssistantMessage];
        setMessages(uiMessages);

        // 同时更新会话中的消息列表
        if (targetSession) {
            const updatedSession = {
                ...targetSession,
                messages: newMessages
            };
            setCurrentSession(updatedSession);

            // 更新会话列表中的对应会话
            setChatSessions(prev => prev.map(session =>
                session.id === targetSession!.id ? updatedSession : session
            ));
        }

        console.log('发送消息时的消息列表状态:', {
            sessionId: targetSession?.id || 'unknown',
            originalSessionMessagesCount: currentSessionMessages.length,
            updatedMessagesCount: newMessages.length,
            userMessage: userMessage,
            tempAssistantMessage: tempAssistantMessage,
            hasInitialMessages: currentSessionMessages.some(msg => msg.role === 'assistant' && msg.content)
        });

        // 清空当前消息输入
        setCurrentMessage('');

        const sessionId = targetSession.id;

        // 标记正在输入状态 - 基于会话
        updateSessionState(sessionId, {
            isTyping: true,
            isReceivingStream: true,
            isPaused: false
        });

        let responseText = '';
        let validAnswer = ''; // 保存有效的答案内容
        let responseReference: Reference | null = null;
        let cumulativeReference: Reference = { total: 0, chunks: [], doc_aggs: [] }; // 累积的参考文档信息

        // 创建新的AbortController用于控制流式请求
        streamControllers.current[sessionId] = new AbortController();

        // 添加流式响应防抖
        let updateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
        const debounceDelay = 100; // 100毫秒防抖延迟

        // 防抖UI更新函数
        const debouncedUpdateUI = (content: string, ref?: Reference) => {
            if (updateDebounceTimer) {
                clearTimeout(updateDebounceTimer);
            }

            updateDebounceTimer = setTimeout(() => {
                setMessages(currentMessages => {
                    const newMessages = [...currentMessages];
                    const lastMessageIndex = newMessages.length - 1;

                    // 确保最后一条消息是助手消息
                    if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                        // 先处理引用格式转换
                        const processedContent = replaceTextByOldReg(content || '');

                        newMessages[lastMessageIndex] = {
                            ...newMessages[lastMessageIndex],
                            content: processedContent,
                            isLoading: true,
                            reference: ref,
                            timestamp: Date.now()
                        };
                    }

                    // 只在开发环境输出详细日志
                    if (process.env.NODE_ENV === 'development') {
                        console.log('流式更新消息:', newMessages[lastMessageIndex]);
                    }

                    return newMessages;
                });
            }, debounceDelay);
        };

        try {
            // 真正发送消息的API调用
            if (process.env.NODE_ENV === 'development') {
                console.log('发送消息:', {
                    sessionId,
                    message
                });
            }

            // 使用流式接口获取回复
            await apiClient.streamChatMessage(
                sessionId,
                message,
                (partialResponse: ApiResponse<StreamChatResponse>) => {
                    // 如果暂停状态，不处理响应
                    const currentState = getCurrentSessionState(sessionId);
                    if (currentState.isPaused) {
                        if (process.env.NODE_ENV === 'development') {
                            console.log('流式响应已暂停，忽略新数据');
                        }
                        return;
                    }

                    if (process.env.NODE_ENV === 'development') {
                        console.log('收到流式响应:', partialResponse);
                    }

                    if (partialResponse && partialResponse.data) {
                        const newContent = partialResponse.data.answer || '';

                        if (process.env.NODE_ENV === 'development') {
                            console.log('新内容:', newContent);
                            console.log('当前responseText:', responseText);
                        }

                        // 处理参考文档 - 收集和累积
                        if (partialResponse.data.reference) {
                            const newReference = partialResponse.data.reference;
                            responseReference = newReference;

                            // 更新累积的参考文档信息
                            if (newReference.doc_aggs && Array.isArray(newReference.doc_aggs)) {
                                // 创建文档ID映射以避免重复
                                const existingDocs = new Map(
                                    cumulativeReference.doc_aggs.map(doc => [doc.doc_id, doc])
                                );

                                // 添加新的文档
                                newReference.doc_aggs.forEach(doc => {
                                    if (doc && doc.doc_id && !existingDocs.has(doc.doc_id)) {
                                        cumulativeReference.doc_aggs.push(doc);
                                    }
                                });
                            }

                            // 累积chunks
                            if (newReference.chunks && Array.isArray(newReference.chunks)) {
                                // 创建chunk ID映射以避免重复
                                const existingChunks = new Map(
                                    cumulativeReference.chunks.map(chunk => [chunk.id, chunk])
                                );

                                // 添加新的chunks
                                newReference.chunks.forEach(chunk => {
                                    if (chunk && chunk.id && !existingChunks.has(chunk.id)) {
                                        cumulativeReference.chunks.push(chunk);
                                    }
                                });
                            }

                            // 更新total字段
                            cumulativeReference.total = Math.max(
                                cumulativeReference.total,
                                newReference.total || 0
                            );

                            // 仅在开发环境输出详细日志
                            if (process.env.NODE_ENV === 'development') {
                                console.log('累积参考文档信息:', {
                                    total: cumulativeReference.total,
                                    doc_aggs: cumulativeReference.doc_aggs.length,
                                    chunks: cumulativeReference.chunks.length
                                });
                            }
                        }

                        // 对于流式响应，检查内容是否有所更新
                        if (newContent && newContent.trim() !== '') {
                            // 检查内容是否是元数据（包含id:或retry:）
                            if (newContent.includes('id:') || newContent.includes('retry:')) {
                                // 仅在开发环境输出详细日志
                                if (process.env.NODE_ENV === 'development') {
                                    console.log('跳过元数据内容:', newContent);
                                }
                            }
                            // 检查是否已有有效应答，避免覆盖正确答案
                            else if (responseText && responseText.trim() &&
                                !responseText.includes('id:') &&
                                !responseText.includes('retry:') &&
                                newContent.length < responseText.length) {
                                // 仅在开发环境输出详细日志
                                if (process.env.NODE_ENV === 'development') {
                                    console.log('已有完整答案，忽略更短的新内容');
                                }
                            }
                            // 正常更新内容
                            else {
                                // 对内容进行更新
                                responseText = newContent;

                                // 如果不包含元数据，则更新有效答案
                                if (!responseText.includes('id:') && !responseText.includes('retry:')) {
                                    validAnswer = responseText; // 保存有效的答案
                                    // 仅在开发环境输出详细日志
                                    if (process.env.NODE_ENV === 'development') {
                                        console.log('保存有效答案:', validAnswer);
                                    }
                                }

                                // 仅在开发环境输出详细日志
                                if (process.env.NODE_ENV === 'development') {
                                    console.log('更新responseText为:', responseText);
                                }

                                // 只有在有参考文档时才传递引用数据
                                const referenceToUse = cumulativeReference.doc_aggs.length > 0 || cumulativeReference.chunks.length > 0
                                    ? cumulativeReference
                                    : undefined;

                                // 使用防抖更新UI
                                debouncedUpdateUI(
                                    (validAnswer || responseText || ''),
                                    referenceToUse
                                );
                            }
                        } else {
                            // 仅在开发环境输出详细日志
                            if (process.env.NODE_ENV === 'development') {
                                console.log('跳过空内容更新');
                            }
                        }
                    } else {
                        // 仅在开发环境输出详细日志
                        if (process.env.NODE_ENV === 'development') {
                            console.log('接收到无效响应:', partialResponse);
                        }
                    }
                },
                () => {
                    // 清除任何未执行的防抖更新
                    if (updateDebounceTimer) {
                        clearTimeout(updateDebounceTimer);
                        updateDebounceTimer = null;
                    }

                    // 完成消息发送后的处理逻辑
                    // 消息发送成功，更新最终消息
                    setMessages(currentMessages => {
                        const newMessages = [...currentMessages];
                        const lastMessageIndex = newMessages.length - 1;

                        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                            // 清理可能包含的元数据
                            let finalContent = validAnswer || responseText; // 优先使用validAnswer

                            // 如果响应内容包含元数据(id:或retry:)，尝试恢复到最后一次有效内容
                            if (finalContent && (finalContent.includes('id:') || finalContent.includes('retry:'))) {
                                // 仅在开发环境输出详细日志
                                if (process.env.NODE_ENV === 'development') {
                                    console.log('完成时检测到元数据内容，尝试恢复最后有效内容');
                                }
                                // 尝试从历史消息中找出最后一次非元数据内容
                                const lastMessage = currentMessages[lastMessageIndex];
                                if (lastMessage && lastMessage.content &&
                                    !lastMessage.content.includes('id:') &&
                                    !lastMessage.content.includes('retry:')) {
                                    finalContent = lastMessage.content;
                                    // 仅在开发环境输出详细日志
                                    if (process.env.NODE_ENV === 'development') {
                                        console.log('恢复为上一条有效消息:', finalContent);
                                    }
                                } else {
                                    finalContent = '等待回复...'; // 无法恢复时的默认内容
                                }
                            }

                            // 处理引用格式转换
                            const processedFinalContent = replaceTextByOldReg(finalContent || '等待回复...');

                            // 确保引用数据的有效性
                            let finalReference = undefined;

                            if (cumulativeReference.chunks && cumulativeReference.chunks.length > 0 ||
                                cumulativeReference.doc_aggs && cumulativeReference.doc_aggs.length > 0) {
                                finalReference = { ...cumulativeReference };

                                // 在开发环境输出引用数据
                                if (process.env.NODE_ENV === 'development') {
                                    console.log('完成消息时的引用数据:', {
                                        chunks: finalReference.chunks?.length || 0,
                                        doc_aggs: finalReference.doc_aggs?.length || 0,
                                        total: finalReference.total || 0
                                    });
                                }
                            }

                            // 完成消息，包含所有累积的参考文档
                            newMessages[lastMessageIndex] = {
                                ...newMessages[lastMessageIndex],
                                content: processedFinalContent, // 确保不显示空内容
                                isLoading: false,
                                // 添加最终的参考文档信息 - 直接绑定到消息上
                                reference: finalReference,
                                // 添加结束时间戳
                                timestamp: Date.now(),
                                completed: true
                            };

                            // 更新 latestReference 用于兼容旧的使用方式，但不再是主要的存储位置
                            if (finalReference) {
                                handleResponseReference(finalReference);
                            }
                        }

                        return newMessages;
                    });

                    // 重置流式响应状态 - 基于会话
                    updateSessionState(sessionId, {
                        isReceivingStream: false,
                        isTyping: false
                    });

                    // 如果这是会话的第一条用户消息，自动更新会话名称
                    if (targetSession && targetSession.messages.length <= 1) {
                        // 截取消息前20个字符作为会话名称
                        const sessionName = message.length > 20 ? message.substring(0, 20) + '...' : message;
                        console.log('自动更新会话名称为:', sessionName);

                        // 调用重命名会话函数
                        renameSession(targetSession.id, sessionName);
                    }

                    // 刷新会话列表，以更新最新的会话信息和预览
                    fetchChatSessions();
                },
                (error) => {
                    // 清除任何未执行的防抖更新
                    if (updateDebounceTimer) {
                        clearTimeout(updateDebounceTimer);
                        updateDebounceTimer = null;
                    }

                    console.error('流式消息请求失败:', error);
                    setApiError(`发送消息失败: ${error.message}`);

                    // 更新错误状态到最后一条消息
                    setMessages(currentMessages => {
                        const newMessages = [...currentMessages];
                        const lastMessageIndex = newMessages.length - 1;

                        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                            newMessages[lastMessageIndex] = {
                                ...newMessages[lastMessageIndex],
                                content: `发送消息失败: ${error.message}`,
                                isLoading: false,
                                isError: true,
                                timestamp: Date.now(),
                                completed: true
                            };
                        }

                        return newMessages;
                    });

                    // 重置流式响应状态 - 基于会话
                    updateSessionState(sessionId, {
                        isReceivingStream: false,
                        isTyping: false
                    });
                });

        } catch (error) {
            // 重置流式响应状态 - 基于会话
            updateSessionState(sessionId, {
                isReceivingStream: false,
                isTyping: false
            });

            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('发送消息异常:', errorMessage);
            setApiError(`发送消息异常: ${errorMessage}`);
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

    // 选择聊天助手
    const selectChatAssistant = (assistant: ChatAssistant | null) => {
        console.log('选择聊天助手:', assistant);

        // 无论是否有assistant，都先清除当前会话状态
        setCurrentSession(null);
        setMessages([]);

        // 然后设置新的助手
        setSelectedChatAssistant(assistant);

        if (assistant) {
            // 保存到localStorage以便页面刷新时恢复
            localStorage.setItem('ragflow_selected_assistant', assistant.id);
            apiClient.setAppId(assistant.id);

            // 获取新选定助手的会话列表，但不自动选择会话
            fetchChatSessions();
        } else {
            localStorage.removeItem('ragflow_selected_assistant');
        }
    };

    // 选择会话
    const selectSession = (session: ChatSession) => {
        console.log('选择会话:', session);

        if (currentSession && currentSession.id === session.id) {
            console.log('会话已选中，跳过重复选择');
            return;
        }

        setCurrentSession(session);
        localStorage.setItem('ragflow_selected_session', session.id);
        getSessionMessages(session.id);
    };

    // 重命名会话
    const renameSession = async (sessionId: string, name: string) => {
        try {
            const response = await apiClient.updateSessionName(sessionId, name);

            if (response && response.code === 0) {
                console.log('重命名会话成功:', { sessionId, name });

                setChatSessions(prev =>
                    prev.map(s =>
                        s.id === sessionId ? { ...s, name } : s
                    )
                );

                if (currentSession?.id === sessionId) {
                    setCurrentSession(prev => {
                        if (!prev) return null;
                        return { ...prev, name };
                    });
                }
            } else {
                console.error('重命名会话失败:', response);
                setApiError(`重命名会话失败: ${response?.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('重命名会话异常:', error);
            setApiError(`重命名会话异常: ${(error as Error).message}`);
        }
    };

    return (
        <ChatContext.Provider value={{
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
            isTyping: currentSession ? getCurrentSessionState(currentSession.id).isTyping : false,
            latestReference,
            reference,
            isSidebarVisible,
            toggleSidebar,
            apiError,
            clearApiError,
            reconnecting,
            isReceivingStream: currentSession ? getCurrentSessionState(currentSession.id).isReceivingStream : false,
            isPaused: currentSession ? getCurrentSessionState(currentSession.id).isPaused : false,
            toggleStreamPause
        }}>
            {children}
        </ChatContext.Provider>
    );
};