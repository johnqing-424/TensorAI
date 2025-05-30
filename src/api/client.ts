import { ApiResponse, ChatCompletion, ChatCompletionRequest, ChatSession, StreamChatResponse } from '../types';

class ApiClient {
    private baseUrl: string;
    private apiKey: string | null;
    private maxRetries: number = 2;
    private retryDelay: number = 2000;
    private connectionTimeout: number = 10000;
    private requestQueue: Map<string, number> = new Map();
    private isNetworkOnline: boolean = navigator.onLine;
    private errorCount: Map<string, number> = new Map();
    private lastConnectionTest: number = 0;
    private lastConnectionResult: boolean = false;
    private connectionTestInterval: number = 10000; // 10秒内不重复测试连接

    constructor() {
        // 从环境变量获取API地址，如果没有则使用默认地址
        this.baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.131';
        this.apiKey = localStorage.getItem('ragflow_api_key');

        // 监听网络状态变化
        window.addEventListener('online', this.handleNetworkChange);
        window.addEventListener('offline', this.handleNetworkChange);
    }

    // 处理网络状态变化
    private handleNetworkChange = () => {
        this.isNetworkOnline = navigator.onLine;
        console.log(`网络状态变化: ${this.isNetworkOnline ? '在线' : '离线'}`);
    };

    // 设置API密钥
    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
        localStorage.setItem('ragflow_api_key', apiKey);
    }

    // 获取API密钥
    getApiKey(): string | null {
        return this.apiKey;
    }

    // 清除API密钥
    clearApiKey() {
        this.apiKey = null;
        localStorage.removeItem('ragflow_api_key');
    }

    // 延迟函数
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 请求节流函数
    private async throttleRequest(endpoint: string): Promise<void> {
        const key = `${this.baseUrl}${endpoint}`;
        const now = Date.now();
        const lastRequest = this.requestQueue.get(key) || 0;

        // 确保两次请求之间至少间隔1.5秒
        const minInterval = 1500;
        const elapsed = now - lastRequest;

        if (elapsed < minInterval) {
            // 需要等待的时间
            const waitTime = minInterval - elapsed;
            await this.delay(waitTime);
        }

        // 更新最后请求时间
        this.requestQueue.set(key, Date.now());
    }

    // 检查网络状态
    private checkNetworkStatus(): boolean {
        if (!this.isNetworkOnline) {
            console.error('网络连接不可用');
            return false;
        }
        return true;
    }

    // 基础请求方法，带重试机制和节流控制
    private async request<T>(
        endpoint: string,
        method: string = 'GET',
        body?: any,
        headers: Record<string, string> = {}
    ): Promise<ApiResponse<T>> {
        if (!this.apiKey || this.apiKey.trim() === '') {
            console.error('未提供API密钥或API密钥为空');
            return { code: 401, message: '未提供API密钥' };
        }

        if (!this.checkNetworkStatus()) {
            return { code: 503, message: '网络连接不可用' };
        }

        // 进行请求节流
        await this.throttleRequest(endpoint);

        const url = `${this.baseUrl}${endpoint}`;
        const requestHeaders: HeadersInit = {
            'Authorization': `Bearer ${this.apiKey}`,
            ...headers,
        };

        if (body && !headers['Content-Type']) {
            requestHeaders['Content-Type'] = 'application/json';
        }

        let retries = 0;
        let lastError: Error | null = null;

        while (retries <= this.maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.connectionTimeout);

                console.log(`发送请求: ${method} ${url}`);
                const response = await fetch(url, {
                    method,
                    headers: requestHeaders,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                    // 添加缓存控制
                    cache: 'no-store'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        errorData = { message: errorText || response.statusText };
                    }

                    // 如果是401错误，清除API密钥
                    if (response.status === 401 || response.status === 403) {
                        console.error('API密钥无效，清除认证状态');
                        this.clearApiKey();
                    }

                    return {
                        code: response.status,
                        message: errorData.message || `请求失败：${response.statusText}`,
                    };
                }

                const data = await response.json();
                return data;
            } catch (error) {
                lastError = error as Error;

                // 检查是否是资源不足错误
                const isResourceError = lastError.message &&
                    (lastError.message.includes('ERR_INSUFFICIENT_RESOURCES') ||
                        lastError.message.includes('aborted') ||
                        lastError.message.includes('ERR_NAME_NOT_RESOLVED'));

                // 如果是超时终止的请求，不再重试
                if (lastError.name === 'AbortError') {
                    console.log(`请求超时: ${url}`);
                    break;
                }

                // 检查网络状态
                if (!this.checkNetworkStatus()) {
                    break;
                }

                retries++;

                if (retries <= this.maxRetries) {
                    // 使用指数退避策略，资源错误时等待更长时间
                    const backoffTime = isResourceError ?
                        this.retryDelay * Math.pow(2, retries) :
                        this.retryDelay * retries;

                    console.log(`请求失败，${retries}/${this.maxRetries}次重试: ${url}，等待 ${backoffTime}ms`);
                    await this.delay(backoffTime);
                }
            }
        }

        return {
            code: 500,
            message: `请求出错：${lastError?.message || '未知错误'}`,
        };
    }

    // 获取聊天助手列表
    async listChatAssistants(page: number = 1, pageSize: number = 30) {
        try {
            const response = await this.request('/api/v1/chats', 'GET');
            return response;
        } catch (error) {
            console.error('API客户端: 获取聊天助手列表出错', error);
            return {
                code: 500,
                message: `获取聊天助手列表出错: ${(error as Error).message || '未知错误'}`,
                data: []
            };
        }
    }

    // 创建聊天会话
    async createChatSession(chatId: string, name: string = '新会话') {
        return this.request<ChatSession>(
            `/api/v1/chats/${chatId}/sessions`,
            'POST',
            { name }
        );
    }

    // 获取聊天会话列表
    async listChatSessions(chatId: string, page: number = 1, pageSize: number = 30) {
        return this.request(
            `/api/v1/chats/${chatId}/sessions?page=${page}&page_size=${pageSize}`,
            'GET'
        );
    }

    // 发送聊天消息（非流式）
    async sendChatMessage(
        chatId: string,
        request: ChatCompletionRequest
    ): Promise<ApiResponse<ChatCompletion>> {
        return this.request<ChatCompletion>(
            `/api/v1/chats/${chatId}/completions`,
            'POST',
            { ...request, stream: false }
        );
    }

    // 发送聊天消息（流式）
    async streamChatMessage(
        chatId: string,
        request: ChatCompletionRequest,
        onChunkReceived: (chunk: ApiResponse<StreamChatResponse>) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> {
        if (!this.apiKey) {
            onError(new Error('未提供API密钥'));
            return;
        }

        if (!this.checkNetworkStatus()) {
            onError(new Error('网络连接不可用'));
            return;
        }

        // 进行请求节流
        try {
            await this.throttleRequest(`/api/v1/chats/${chatId}/completions`);
        } catch (e) {
            console.error('请求节流出错:', e);
        }

        const url = `${this.baseUrl}/api/v1/chats/${chatId}/completions`;
        let retries = 0;

        const attemptStreamRequest = async () => {
            let controller: AbortController | null = new AbortController();
            let timeoutId: NodeJS.Timeout | null = null;

            try {
                console.log(`发送流式请求: ${url}`);

                // 设置更长的超时时间，流式请求可能需要更多时间
                const streamTimeout = 30000; // 30秒
                timeoutId = setTimeout(() => {
                    if (controller) {
                        console.warn(`流式请求超时 (${streamTimeout / 1000}秒)`);
                        controller.abort();
                        controller = null;
                    }
                }, streamTimeout);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        // 添加Keep-Alive标头以维持连接
                        'Connection': 'keep-alive',
                        'Keep-Alive': 'timeout=60, max=1000',
                    },
                    body: JSON.stringify({ ...request, stream: true }),
                    signal: controller.signal,
                    cache: 'no-store'
                });

                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                if (!response.ok) {
                    let errorMessage: string;
                    let errorData: any = {};

                    try {
                        errorData = await response.json();
                        errorMessage = errorData.message || `请求失败：${response.statusText}`;
                    } catch (e) {
                        errorMessage = `请求失败：${response.statusText || response.status}`;
                    }

                    // 检查特定的错误类型
                    if (errorMessage.includes('list index out of range')) {
                        errorMessage = '后端索引越界错误：消息或引用数组不匹配';
                        console.log('检测到后端索引越界错误，这通常在没有现有会话时发生');
                    }

                    throw new Error(errorMessage);
                }

                if (!response.body) {
                    throw new Error('响应没有正文');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                // 设置一个读取超时
                let readTimeoutId: NodeJS.Timeout | null = null;
                const resetReadTimeout = () => {
                    if (readTimeoutId) clearTimeout(readTimeoutId);
                    readTimeoutId = setTimeout(() => {
                        console.warn('流式响应读取超时');
                        reader.cancel('读取超时');
                    }, 15000); // 15秒无数据视为超时
                };

                // 初始化读取超时
                resetReadTimeout();

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        if (readTimeoutId) clearTimeout(readTimeoutId);
                        break;
                    }

                    // 重置读取超时
                    resetReadTimeout();

                    buffer += decoder.decode(value, { stream: true });

                    // 处理可能的多行数据
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';  // 最后一行可能不完整，保留到下一次

                    for (const line of lines) {
                        if (line.trim() === '') continue;

                        // 处理SSE格式的数据
                        if (line.startsWith('data:')) {
                            try {
                                const jsonStr = line.slice(5).trim();
                                const chunk = JSON.parse(jsonStr);

                                // 检查错误响应
                                if (chunk.code !== 0) {
                                    // 如果是索引错误，特殊处理
                                    if (chunk.message && chunk.message.includes('list index out of range')) {
                                        console.error('流式响应中的索引越界错误');
                                        throw new Error('后端索引越界错误：消息或引用数组不匹配');
                                    } else {
                                        console.error('流式响应错误:', chunk.message);
                                    }
                                }

                                onChunkReceived(chunk);

                                // 判断是否是最后一个块
                                if (chunk.data === true) {
                                    if (readTimeoutId) clearTimeout(readTimeoutId);
                                    onComplete();
                                    return;
                                }
                            } catch (e) {
                                console.error('解析数据块错误:', e);
                            }
                        }
                    }
                }

                onComplete();
            } catch (error) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                const err = error as Error;

                // 详细记录错误类型和信息
                console.error(`流式请求错误 (${err.name}): ${err.message}`);

                // 检查是否是AbortError
                if (err.name === 'AbortError') {
                    // 这可能是由于超时或者用户取消导致的
                    console.warn('流式请求被中止 (可能是超时或用户取消)');
                }

                // 检查是否是资源不足错误或网络问题
                const isResourceError = err.message &&
                    (err.message.includes('ERR_INSUFFICIENT_RESOURCES') ||
                        err.message.includes('aborted') ||
                        err.message.includes('ERR_NAME_NOT_RESOLVED'));

                // 检查网络状态
                if (!this.checkNetworkStatus()) {
                    onError(new Error('网络连接中断'));
                    return;
                }

                // 特殊处理索引越界错误
                if (err.message && err.message.includes('list index out of range')) {
                    onError(new Error('后端索引越界错误：消息或引用数组不匹配'));
                    return;
                }

                if (retries < this.maxRetries) {
                    retries++;
                    // 资源错误时使用更长的等待时间
                    const backoffTime = isResourceError ?
                        this.retryDelay * Math.pow(2, retries) :
                        this.retryDelay * retries;

                    console.log(`流式请求失败，${retries}/${this.maxRetries}次重试，等待 ${backoffTime}ms`);
                    setTimeout(attemptStreamRequest, backoffTime);
                } else {
                    let errorMessage = `发送消息失败: ${err.message}`;

                    // 为特定错误类型提供更友好的消息
                    if (err.name === 'AbortError') {
                        errorMessage = '发送消息超时，请检查网络连接并稍后重试';
                    } else if (isResourceError) {
                        errorMessage = '服务器资源不足，请稍后重试';
                    }

                    onError(new Error(errorMessage));
                }
            }
        };

        await attemptStreamRequest();
    }

    // 健康检查和测试连接方法
    async testConnection(): Promise<boolean> {
        const now = Date.now();

        // 如果距离上次连接测试不到设定的间隔时间，直接返回缓存结果
        if (now - this.lastConnectionTest < this.connectionTestInterval) {
            console.log(`API连接测试缓存结果: ${this.lastConnectionResult ? '成功' : '失败'} (缓存 ${Math.round((now - this.lastConnectionTest) / 1000)}秒)`);
            return this.lastConnectionResult;
        }

        console.log('测试API连接...');
        this.lastConnectionTest = now;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

            // 尝试发送一个简单请求到健康检查端点
            let response;
            try {
                // 优先尝试健康检查端点
                response = await fetch(`${this.baseUrl}/api/v1/health`, {
                    method: 'HEAD',
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });
            } catch (error) {
                console.log('健康检查端点不可访问，尝试根端点...');
                // 如果健康检查端点不存在，尝试访问根地址
                response = await fetch(`${this.baseUrl}/api/v1`, {
                    method: 'HEAD',
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });
            }

            clearTimeout(timeoutId);

            if (response.ok) {
                console.log('API连接测试成功');
                this.lastConnectionResult = true;
                return true;
            } else {
                console.error(`API连接测试失败: HTTP ${response.status}`);
                this.lastConnectionResult = false;
                return false;
            }
        } catch (error) {
            console.error('API连接测试出错:', error);
            this.lastConnectionResult = false;
            return false;
        }
    }
}

// 导出单例实例
export const apiClient = new ApiClient(); 