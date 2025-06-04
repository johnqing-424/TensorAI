import { ApiResponse, ChatCompletion, ChatCompletionRequest, ChatSession, StreamChatResponse } from '../../types';

class ApiClient {
    private baseUrl: string;
    private token: string | null;
    private appid: string | null = 'process'; // 默认应用ID
    private maxRetries: number = 2;
    private retryDelay: number = 2000;
    private connectionTimeout: number = 30000; // 从20秒增加到30秒
    private requestQueue: Map<string, number> = new Map();
    private isNetworkOnline: boolean = navigator.onLine;
    private errorCount: Map<string, number> = new Map();
    private lastConnectionTest: number = 0;
    private lastConnectionResult: boolean = false;
    private connectionTestInterval: number = 10000; // 10秒内不重复测试连接

    constructor() {
        // 首先从localStorage读取API地址，然后是环境变量，最后是默认值
        const storedApiUrl = localStorage.getItem('ragflow_api_url');
        // 在开发模式下使用相对路径，以便与代理配置一起工作
        const isLocalDev = process.env.NODE_ENV === 'development';

        if (isLocalDev) {
            // 开发环境下使用本地代理绕过CORS
            this.baseUrl = 'http://localhost:3001/proxy';
            console.log(`API客户端初始化（开发模式），使用代理URL: ${this.baseUrl}`);
        } else {
            // 生产环境使用完整URL
            this.baseUrl = storedApiUrl || process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.131:8080';
            console.log(`API客户端初始化，基础URL: ${this.baseUrl}`);
        }

        this.token = localStorage.getItem('ragflow_api_key');
        this.appid = localStorage.getItem('ragflow_appid') || 'process';

        // 监听网络状态变化
        window.addEventListener('online', this.handleNetworkChange);
        window.addEventListener('offline', this.handleNetworkChange);
    }

    // 处理网络状态变化
    private handleNetworkChange = () => {
        this.isNetworkOnline = navigator.onLine;
        console.log(`网络状态变化: ${this.isNetworkOnline ? '在线' : '离线'}`);
    };

    // 设置API Token
    setApiKey(apiKey: string) {
        if (apiKey) {
            console.log('设置API密钥');
            this.token = apiKey;
            localStorage.setItem('ragflow_api_key', apiKey);
        }
    }

    // 设置应用ID
    setAppId(appid: string) {
        this.appid = appid;
        localStorage.setItem('ragflow_appid', appid);
    }

    // 获取API Token
    getApiKey(): string | null {
        return this.token;
    }

    // 获取应用ID
    getAppId(): string | null {
        return this.appid;
    }

    // 清除API Token
    clearApiKey() {
        this.token = null;
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
        if (!this.token || this.token.trim() === '') {
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
            'token': this.token, // 使用token头
            'appid': this.appid || 'process', // 添加appid头
            // 添加CORS相关请求头
            'Origin': window.location.origin,
            'Access-Control-Request-Method': method,
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
                const timeoutId = setTimeout(() => {
                    console.log(`请求超时，正在中止请求: ${url}`);
                    controller.abort();
                }, this.connectionTimeout);

                console.log(`发送请求: ${method} ${url}`);
                const response = await fetch(url, {
                    method,
                    headers: requestHeaders,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                    // 添加CORS设置
                    mode: 'cors',
                    credentials: 'same-origin',
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

                // 如果是超时终止的请求，提供更详细的错误信息
                if (lastError.name === 'AbortError') {
                    console.log(`请求被中止: ${url}，可能是由于超时`);
                    // 不立即中断，允许重试
                    if (retries >= this.maxRetries) {
                        return {
                            code: 408,
                            message: '请求超时，请检查网络连接和服务器状态'
                        };
                    }
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

    // 用户登录
    async login(mobile: string, code: string, useDirect = false) {
        try {
            console.log(`尝试登录，手机号: ${mobile.substring(0, 3)}****${mobile.substring(mobile.length - 4)}`);

            // 尝试多个API服务器地址
            const apiServers = [
                'http://192.168.1.131:8080',  // 原始服务器
                'http://localhost:8080',      // 本地8080端口
                'http://127.0.0.1:8080',      // 另一个本地地址
                'http://192.168.1.131:9380',  // Python API服务器
                'http://localhost:9380',      // 本地Python API服务器
                'http://127.0.0.1:9380'       // 另一个本地Python API地址
            ];

            let url;
            let successServer = null;

            // 如果是开发环境并且不是直接模式，使用相对路径
            if (process.env.NODE_ENV === 'development' && !useDirect) {
                // 使用完整的API地址，而不是相对路径
                url = `${this.baseUrl}/login`;
                console.log(`使用API地址进行登录请求: ${url}`);
            } else {
                // 对于直接模式或生产环境，轮询所有服务器直到成功
                for (const server of apiServers) {
                    url = `${server}/api/login`;
                    console.log(`尝试连接API服务器: ${url}`);

                    try {
                        // 先测试服务器连通性
                        const testResponse = await fetch(`${server}/api/login`, {
                            method: 'HEAD',
                            mode: 'cors',
                            cache: 'no-store'
                        });

                        if (testResponse.status !== 404) {
                            successServer = server;
                            console.log(`找到可用的API服务器: ${server}`);
                            break;
                        }
                    } catch (error: any) {
                        console.log(`服务器 ${server} 连接失败: ${error.message}`);
                    }
                }

                if (!successServer) {
                    console.error('所有API服务器连接失败');
                    return {
                        code: 503,
                        message: '无法连接到API服务器，请检查网络连接或服务器状态'
                    };
                }

                url = `${successServer}/api/login`;
            }

            console.log(`发送登录请求: POST ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'appid': this.appid || 'process',
                    // 添加CORS相关请求头
                    'Origin': window.location.origin,
                    'Access-Control-Request-Method': 'POST',
                },
                body: JSON.stringify({ mobile, code }),
                // 重要：允许跨域请求携带凭证
                mode: 'cors',
                credentials: 'same-origin',
                cache: 'no-store'
            });

            let responseData;
            try {
                const responseText = await response.text();
                console.log('登录响应文本:', responseText);
                try {
                    responseData = JSON.parse(responseText);
                    console.log('登录响应JSON:', responseData);
                } catch (e) {
                    console.error('解析响应JSON失败:', responseText);
                    return {
                        code: 500,
                        message: `解析响应失败: ${responseText}`
                    };
                }
            } catch (e) {
                console.error('读取响应失败:', e);
                return {
                    code: 500,
                    message: '读取响应失败'
                };
            }

            if (!response.ok) {
                return {
                    code: response.status,
                    message: responseData?.message || `请求失败：${response.statusText}`
                };
            }

            // 检查响应结构
            if (responseData.code === 0 && responseData.data) {
                // 如果找到可用服务器，将其保存为默认服务器
                if (successServer) {
                    this.setBaseUrl(successServer);
                }

                // 直接使用API返回的token，不添加Bearer前缀
                this.setApiKey(responseData.data);
                return responseData;
            }

            return responseData;
        } catch (error) {
            console.error('API客户端: 登录失败', error);
            return {
                code: 500,
                message: `登录失败: ${(error as Error).message || '未知错误'}`
            };
        }
    }

    // 获取会话列表
    async listChatSessions() {
        try {
            const response = await this.request('/sessions', 'GET');
            return response;
        } catch (error) {
            console.error('API客户端: 获取会话列表失败', error);
            return {
                code: 500,
                message: `获取会话列表失败: ${(error as Error).message || '未知错误'}`,
                data: []
            };
        }
    }

    // 创建聊天会话
    async createChatSession(name: string = '新会话') {
        // 根据API文档，请求体应该只包含name字段
        return this.request<ChatSession>(
            '/sessions',
            'POST',
            { name }
        );
    }

    // 删除会话
    async deleteSession(sessionIds: string[]) {
        return this.request<boolean>(
            '/sessions',
            'DELETE',
            { ids: sessionIds }
        );
    }

    // 获取消息记录
    async getMessages(sessionId: string) {
        return this.request(
            `/messages?sessionId=${sessionId}`,
            'GET'
        );
    }

    // 发送聊天消息（非流式）
    async sendChatMessage(
        sessionId: string,
        message: string
    ): Promise<ApiResponse<ChatCompletion>> {
        return this.request<ChatCompletion>(
            '/messages',
            'POST',
            { sessionId, message }
        );
    }

    // 发送聊天消息（流式）
    async streamChatMessage(
        sessionId: string,
        message: string,
        onChunkReceived: (chunk: ApiResponse<StreamChatResponse>) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> {
        if (!this.token) {
            onError(new Error('未提供API密钥'));
            return;
        }

        if (!this.checkNetworkStatus()) {
            onError(new Error('网络连接不可用'));
            return;
        }

        // 进行请求节流
        try {
            await this.throttleRequest('/messages/stream');
        } catch (e) {
            console.error('请求节流出错:', e);
        }

        const url = `${this.baseUrl}/messages/stream`;
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
                        'token': this.token || '',
                        'appid': this.appid || 'process',
                        'Accept': 'text/event-stream',
                        // 添加Keep-Alive标头以维持连接
                        'Connection': 'keep-alive',
                        'Keep-Alive': 'timeout=60, max=1000',
                        // 添加CORS相关请求头
                        'Origin': window.location.origin,
                        'Access-Control-Request-Method': 'POST',
                    },
                    body: JSON.stringify({ sessionId, message }),
                    signal: controller.signal,
                    mode: 'cors',
                    credentials: 'include',
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

                                onChunkReceived(chunk);

                                // 判断是否是完成事件
                                if (line.includes('event:complete')) {
                                    if (readTimeoutId) clearTimeout(readTimeoutId);
                                    onComplete();
                                    return;
                                }
                            } catch (e) {
                                console.error('解析数据块错误:', e);
                            }
                        } else if (line.startsWith('event:complete')) {
                            // 处理完成事件
                            if (readTimeoutId) clearTimeout(readTimeoutId);
                            onComplete();
                            return;
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
                console.error(`流式请求错误 (${err.name}): ${err.message}`);

                // 检查是否是AbortError
                if (err.name === 'AbortError') {
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

        console.log(`测试API连接... URL: ${this.baseUrl}/api/sessions`);
        this.lastConnectionTest = now;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('连接测试超时，正在中止请求');
                controller.abort();
            }, 25000); // 25秒超时

            // 准备请求头
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            };

            // 只有当token存在时才添加到请求头
            if (this.token) {
                headers['token'] = this.token;
            }

            // 只有当appid存在时才添加到请求头
            if (this.appid) {
                headers['appid'] = this.appid;
            }

            // 尝试发送一个POST请求到API端点，不用HEAD方法
            console.log('正在尝试连接到API服务器...');
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                signal: controller.signal,
                headers,
                mode: 'cors',
                body: JSON.stringify({ mobile: '10000000000', code: '123456' }),
                credentials: 'same-origin'
            });

            clearTimeout(timeoutId);

            if (response.status !== 404) {
                console.log('API连接测试成功');
                this.lastConnectionResult = true;
                return true;
            } else {
                console.error(`API连接测试失败: HTTP ${response.status} (${response.statusText})`);
                this.lastConnectionResult = false;
                return false;
            }
        } catch (error) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                console.error('API连接测试超时');
            } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                console.error(`API连接失败: 无法连接到 ${this.baseUrl} (服务器可能未运行或URL不正确)`);
            } else {
                console.error('API连接测试出错:', error);
            }
            this.lastConnectionResult = false;
            return false;
        }
    }

    // 设置API地址
    setBaseUrl(url: string) {
        if (url && url.trim() !== '') {
            this.baseUrl = url;
            localStorage.setItem('ragflow_api_url', url);
            console.log(`API基础URL已更新: ${url}`);
            return true;
        }
        return false;
    }

    // 发送短信验证码
    async sendVerificationCode(mobile: string) {
        try {
            console.log(`尝试发送验证码到: ${mobile.substring(0, 3)}****${mobile.substring(mobile.length - 4)}`);

            // 创建特殊请求，不需要token验证
            // 根据登录API测试，应该使用/api前缀
            const apiUrl = this.baseUrl; // 使用当前配置的API地址
            const url = `${apiUrl}/api/sendCode`;

            const headers = {
                'Content-Type': 'application/json',
                'appid': this.appid || 'process',
                // 添加CORS相关请求头
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'POST',
            };

            console.log('发送验证码请求:', url);
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ mobile }),
                // 重要：允许跨域请求携带凭证
                mode: 'cors',
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: errorText || response.statusText };
                }

                return {
                    code: response.status,
                    message: errorData.message || `请求失败：${response.statusText}`,
                };
            }

            const data = await response.json();
            console.log('验证码发送响应:', data);
            return data;
        } catch (error) {
            console.error('API客户端: 发送验证码失败', error);
            return {
                code: 500,
                message: `发送验证码失败: ${(error as Error).message || '未知错误'}`
            };
        }
    }

    // 直接测试API连接
    async testDirectApi() {
        try {
            console.log('尝试直接测试API连接...');

            // 使用完整的URL测试，绕过可能的代理问题
            const directUrl = 'http://192.168.1.131:8080/api/sessions';
            console.log(`测试URL: ${directUrl}`);

            const response = await fetch(directUrl, {
                method: 'HEAD',
                headers: {
                    'Cache-Control': 'no-cache',
                    'appid': this.appid || 'process'
                }
            });

            console.log(`直接API测试响应: ${response.status} ${response.statusText}`);
            return response.ok;
        } catch (error) {
            console.error('直接API测试失败:', error);
            return false;
        }
    }
}

// 导出单例实例
export const apiClient = new ApiClient();