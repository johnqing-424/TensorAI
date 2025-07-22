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
    selectSession: (session: ChatSession) => Promise<void>;
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
    isMessageLoading: boolean;

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
    const [isMessageLoading, setIsMessageLoading] = useState<boolean>(false);

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
    const [latestReference, setLatestReference] = useState<Reference | null>(null);
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

    // 新增一个ref来跟踪是否应该更新会话标题
    const shouldUpdateTitle = useRef<boolean>(false);

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
            }, 10000); // 从15秒减少到10秒

            // 清理函数
            return () => clearTimeout(timeoutId);
        }
    }, [reconnecting]);

    // 请求节流函数 - 优化性能
    const throttledFetch = async (callback: () => Promise<void>, minInterval: number = 2000) => {
        const now = Date.now();
        const elapsed = now - lastFetchTime.current;

        if (elapsed < minInterval) {
            const delay = minInterval - elapsed;
            // 避免过长的延迟
            const safeDelay = Math.min(delay, 3000);
            await new Promise(resolve => setTimeout(resolve, safeDelay));
        }

        lastFetchTime.current = Date.now();
        try {
            await callback();
        } catch (error) {
            console.error("节流请求执行失败:", error);
        }
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
    }, [currentSession?.id]); // 关键修复：仅在会话ID变化时才重置消息列表

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
                        // 不要在这里用不完整的数据设置会话，
                        // 直接调用 getSessionMessages 并把会话信息传过去，
                        // 让它完成原子性更新。
                        await getSessionMessages(targetSession.id, targetSession);
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
                    let referenceObject: Reference | undefined = undefined;
                    if (msg.reference && typeof msg.reference === 'string') {
                        try {
                            referenceObject = JSON.parse(msg.reference);
                        } catch (e) {
                            console.warn('无法解析初始消息的引用:', e);
                            referenceObject = undefined;
                        }
                    } else if (msg.reference) {
                        referenceObject = msg.reference;
                    }

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
                        reference: referenceObject,
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

    // 选择会话
    const selectSession = async (session: ChatSession) => {
        if (!session) {
            return;
        }

        // 避免重复加载同一个会话, 但允许在数据不完整时强制刷新
        if (currentSession?.id === session.id && currentSession.messages?.length > 0) {
            return;
        }

        // 只保存ID，然后触发完整的消息获取流程
        localStorage.setItem('ragflow_selected_session', session.id);
        await getSessionMessages(session.id);
    };

 // ... existing code ...

    // 获取会话消息
    const getSessionMessages = async (sessionId: string, sessionInfoFromCaller?: ChatSession) => {
        try {
            // 优先使用调用者提供的会话信息，否则从状态中查找
            const sessionInfo = sessionInfoFromCaller || chatSessions.find(s => s.id === sessionId);
            // 如果连基础信息都找不到，直接退出
            if (!sessionInfo) {
                console.warn(`getSessionMessages: 找不到会话信息，ID: ${sessionId}`);
                return;
            }
            setIsMessageLoading(true);

            const response: ApiResponse<any[]> = await apiClient.getMessages(sessionId);
            
            if (response.code === 0 && Array.isArray(response.data)) {
                const fetchedMessages: ChatMessage[] = response.data.map((msg: any, index: number) => {
                    let finalReference: Reference | undefined = undefined;

                    if (msg.reference) {
                        if (typeof msg.reference === 'string' && msg.reference.trim()) {
                            try {
                                const parsedRef = JSON.parse(msg.reference);
                                // 确保解析后是有效的Reference对象
                                if (parsedRef && typeof parsedRef === 'object') {
                                    finalReference = parsedRef as Reference;
                                    console.log(`[ChatContext] getSessionMessages: 成功解析消息 #${index} 的 reference 字符串:`, finalReference);
                        } else {
                                     finalReference = { total: 0, chunks: [], doc_aggs: [] };
                                }
                            } catch (e) {
                                console.warn(`[ChatContext] getSessionMessages: 解析消息 #${index} 的 reference 字符串失败:`, { error: e, refString: msg.reference });
                                finalReference = { total: 0, chunks: [], doc_aggs: [] };
                            }
                        } else if (typeof msg.reference === 'object' && msg.reference !== null) {
                            finalReference = msg.reference;
                            console.log(`[ChatContext] getSessionMessages: 直接使用消息 #${index} 的 reference 对象:`, finalReference);
                        }
                    }

                    return {
                        role: msg.role || 'assistant',
                        content: msg.content,
                        reference: finalReference,
                        id: msg.id || Math.random().toString(),
                        completed: true,
                    };
                });

                const sessionToSet = {
                    ...sessionInfo,
                    messages: fetchedMessages
                };
                
                setCurrentSession(sessionToSet);
                setMessages(fetchedMessages);
            }
        } catch (error) {
            console.error('获取消息时发生异常:', error);
        } finally {
            setIsMessageLoading(false);
        }
    };

// ... existing code ...

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

        // 在发送消息前，检查当前会话的消息数量
        // 如果是新会话（只有一条初始消息），则标记需要更新标题
        if (targetSession.messages.length <= 1) {
            shouldUpdateTitle.current = true;
        } else {
            shouldUpdateTitle.current = false;
        }

        // 准备用户消息和临时助手消息
        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: Date.now()
        };

        const tempAssistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: '', // 初始为空，由流式响应填充
            isLoading: true,
            timestamp: Date.now()
        };

        // 更新UI显示的消息列表
        setMessages(prev => [...prev, userMessage, tempAssistantMessage]);

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

            // 增加防抖延迟，减少更新频率
            updateDebounceTimer = setTimeout(() => {
                // 只有当内容有实际变化时才更新UI
                setMessages(currentMessages => {
                    const newMessages = [...currentMessages];
                    const lastMessageIndex = newMessages.length - 1;

                    // 确保最后一条消息是助手消息
                    if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                        const lastMessage = newMessages[lastMessageIndex];

                        // 如果内容没有变化且引用也没有变化，则不更新
                        if (lastMessage.content === content &&
                            (!ref || JSON.stringify(lastMessage.reference) === JSON.stringify(ref))) {
                            return currentMessages;
                        }

                        // 先处理引用格式转换
                        const processedContent = replaceTextByOldReg(content || '');

                        newMessages[lastMessageIndex] = {
                            ...lastMessage,
                            content: processedContent,
                            isLoading: true,
                            reference: ref,
                            timestamp: Date.now()
                        };
                    }

                    // 只在开发环境且内容有明显变化时输出日志
                    if (process.env.NODE_ENV === 'development' &&
                        content.length % 50 === 0) { // 每50个字符记录一次日志
                        console.log('流式更新消息长度:', content.length);
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

                    // 关键修复：确保我们只处理包含聊天数据的对象，忽略最后的 'data: true'
                    if (partialResponse && typeof partialResponse.data === 'object' && partialResponse.data !== null) {
                        const newContent = partialResponse.data.answer || '';

                        if (process.env.NODE_ENV === 'development') {
                            console.log('--- 调试日志 ---');
                            console.log('收到数据块:', JSON.stringify(partialResponse.data));
                            console.log('提取的新内容 (newContent):', `"${newContent}"`);
                            console.log('更新前 responseText:', `"${responseText}"`);
                            console.log('更新前 validAnswer:', `"${validAnswer}"`);
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
                            if (newReference.chunks && Array.isArray(newReference.chunks)) {
                                const existingChunks = new Map(
                                    cumulativeReference.chunks.map(chunk => [chunk.id, chunk])
                                );
                                newReference.chunks.forEach(chunk => {
                                    if (chunk && chunk.id && !existingChunks.has(chunk.id)) {
                                        cumulativeReference.chunks.push(chunk);
                                    }
                                });
                            }

                            if (typeof newReference.total === 'number' && newReference.total > cumulativeReference.total) {
                                cumulativeReference.total = newReference.total;
                            }

                            // 开发环境日志
                            if (process.env.NODE_ENV === 'development' &&
                                (newReference.doc_aggs?.length || newReference.chunks?.length)) {
                                console.log('累积参考文档信息:', {
                                    total: cumulativeReference.total,
                                    doc_aggs: cumulativeReference.doc_aggs.length,
                                    chunks: cumulativeReference.chunks.length,
                                });
                            }
                        }

                        // 对于流式响应，检查内容是否有所更新
                        if (newContent && newContent.trim() !== '') {
                            if (process.env.NODE_ENV === 'development') {
                                console.log('分支: newContent 有内容');
                            }
                            // 检查内容是否是元数据（包含id:或retry:）
                            if (newContent.includes('id:') || newContent.includes('retry:')) {
                                // 跳过元数据内容，不输出日志
                            }
                            // 检查是否已有有效应答，避免覆盖正确答案
                            else if (responseText && responseText.trim() &&
                                !responseText.includes('id:') &&
                                !responseText.includes('retry:') &&
                                newContent.length < responseText.length) {
                                // 跳过更短的内容，不输出日志
                            }
                            // 正常更新内容
                            else {
                                // 移除对<think>标签的过滤，让其在UI层通过CSS控制显隐
                                responseText = newContent;

                                // 如果不包含元数据，则更新有效答案
                                if (!responseText.includes('id:') && !responseText.includes('retry:')) {
                                    validAnswer = responseText; // 保存有效的答案
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
                        } else if (partialResponse.data.reference) {
                            if (process.env.NODE_ENV === 'development') {
                                console.log('分支: newContent 为空，但有 reference');
                            }
                            // 即使内容为空，但如果引用更新了，也需要更新UI
                            const referenceToUse = cumulativeReference.doc_aggs.length > 0 || cumulativeReference.chunks.length > 0
                                ? cumulativeReference
                                : undefined;

                            if (referenceToUse) {
                                debouncedUpdateUI(
                                    (validAnswer || responseText || ''),
                                    referenceToUse
                                );
                            }
                        } else {
                            if (process.env.NODE_ENV === 'development') {
                                console.log('分支: newContent 为空，且无 reference (忽略)');
                            }
                        }
                        if (process.env.NODE_ENV === 'development') {
                            console.log('更新后 responseText:', `"${responseText}"`);
                            console.log('更新后 validAnswer:', `"${validAnswer}"`);
                            console.log('--- 调试结束 ---');
                        }
                    } else {
                        // 仅在开发环境输出详细日志
                        if (process.env.NODE_ENV === 'development') {
                            console.log('接收到无效响应:', partialResponse);
                        }
                    }
                },
                () => {
                    // 流式响应完成
                    if (updateDebounceTimer) {
                        clearTimeout(updateDebounceTimer);
                    }

                    let finalAssistantMessage: ChatMessage | null = null;

                    console.groupCollapsed('[ChatContext] sendMessage: 流式响应完成');

                    setMessages(currentMessages => {
                        const newMessages = [...currentMessages];
                        const lastMessageIndex = newMessages.length - 1;

                        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                            const finalContent = responseText.trim() || '【无内容】';
                            const processedFinalContent = replaceTextByOldReg(finalContent);
                            let finalReference = undefined;
                            if (cumulativeReference.chunks && cumulativeReference.chunks.length > 0 ||
                                cumulativeReference.doc_aggs && cumulativeReference.doc_aggs.length > 0) {
                                finalReference = { ...cumulativeReference };
                            }
                            
                            newMessages[lastMessageIndex] = {
                                ...newMessages[lastMessageIndex],
                                content: processedFinalContent,
                                isLoading: false,
                                reference: finalReference,
                                timestamp: Date.now(),
                                completed: true
                            };
                            
                            finalAssistantMessage = newMessages[lastMessageIndex];
                            
                            console.log('最终助手机器人消息:', finalAssistantMessage);
                            
                            if (shouldUpdateTitle.current) {
                                const firstUserMessage = newMessages.find(m => m.role === 'user');
                                if (firstUserMessage && firstUserMessage.content) {
                                    const newTitle = firstUserMessage.content.length > 30
                                        ? firstUserMessage.content.substring(0, 30) + '...'
                                        : firstUserMessage.content;
                                    console.log(`准备重命名会话 ${sessionId} 为: "${newTitle}"`);
                                    renameSession(sessionId, newTitle);
                                    shouldUpdateTitle.current = false;
                                }
                            }
                        }
                        return newMessages;
                    });

                    // 关键修复：移除无效的消息更新调用
                    if (finalAssistantMessage) {
                        console.warn('[ChatContext] sendMessage: 注意 - 前端消息回写逻辑已禁用。引用和参考文档的持久化需要后端在流式响应结束时自行处理。');
                        // apiClient.updateMessage(finalAssistantMessage).then(response => {
                        //     if (response.code === 0) {
                        //         console.log('[withref] 消息回写成功');
                        //     } else {
                        //         console.error('[withref] 消息回写失败:', response.message);
                        //     }
                        // });
                    }

                    console.groupEnd();

                    // 重置流式响应状态 - 基于会话
                    updateSessionState(sessionId, {
                        isReceivingStream: false,
                        isTyping: false
                    });
                },
                (error: Error) => {
                    console.error('流式消息请求失败:', error);

                    // 清除任何未执行的防抖更新
                    if (updateDebounceTimer) {
                        clearTimeout(updateDebounceTimer);
                        updateDebounceTimer = null;
                    }

                    // 更新UI，显示错误信息
                    setMessages(currentMessages => {
                        const newMessages = [...currentMessages];
                        const lastMessageIndex = newMessages.length - 1;

                        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                            // 如果之前已有部分内容，则保留并标记错误
                            let errorMessage = responseText || '';

                            // 如果没有任何内容，则显示错误信息
                            if (!errorMessage.trim()) {
                                const errorDetail = error?.message || '请求失败，请稍后重试';
                                errorMessage = `消息发送出错: ${errorDetail}`;

                                // 对于超时错误，提供更友好的提示
                                if (errorDetail.includes('超时') || errorDetail.includes('504')) {
                                    errorMessage = `请求超时，可能的原因：
1. 服务器繁忙，请稍后重试
2. 对话历史较长，导致处理时间增加
3. 网络连接不稳定

建议:
- 开始新的对话
- 减少提问长度
- 检查网络连接`;
                                }
                            }

                            newMessages[lastMessageIndex] = {
                                ...newMessages[lastMessageIndex],
                                content: errorMessage,
                                isLoading: false,
                                isError: true,  // 标记为错误消息
                                timestamp: Date.now(),
                                completed: true
                            };
                        }

                        return newMessages;
                    });

                    // 重置会话状态
                    updateSessionState(sessionId, {
                        isReceivingStream: false,
                        isTyping: false,
                        isPaused: false
                    });

                    // 设置全局错误消息，但不要覆盖消息内容本身
                    setApiError(`消息发送失败: ${error?.message || '未知错误'}`);
                }
            );

        } catch (error: any) {
            // 捕获apiClient.streamChatMessage本身抛出的异常
            console.error('发送消息异常:', error);

            // 清除任何未执行的防抖更新
            if (updateDebounceTimer) {
                clearTimeout(updateDebounceTimer);
            }

            // 更新UI，显示错误信息
            setMessages(currentMessages => {
                const newMessages = [...currentMessages];
                const lastMessageIndex = newMessages.length - 1;

                if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
                    newMessages[lastMessageIndex] = {
                        ...newMessages[lastMessageIndex],
                        content: `消息发送失败: ${error?.message || '未知错误'}`,
                        isLoading: false,
                        isError: true,
                        timestamp: Date.now(),
                        completed: true
                    };
                }

                return newMessages;
            });

            // 重置会话状态
            updateSessionState(sessionId, {
                isReceivingStream: false,
                isTyping: false
            });

            // 设置全局错误消息
            setApiError(`消息发送异常: ${error?.message || '未知错误'}`);
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
            isMessageLoading,
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