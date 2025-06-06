import { ApiResponse, ChatCompletion, ChatMessage, ChatSession, Reference, StreamChatResponse } from '../../types';

// 添加从后端响应类型定义
interface SessionResponseDTO {
    chat_id: string;
    create_date: string;
    create_time: number;
    id: string;
    messages: MessageResponse[];
    name: string;
    update_date: string;
    update_time: number;
}

interface MessageResponse {
    role: string;
    content: string;
    reference?: string;
}

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
        // 从环境变量或localStorage获取API基础URL
        this.baseUrl = localStorage.getItem('ragflow_api_url') || 'http://localhost:3001/proxy';
        this.token = localStorage.getItem('ragflow_api_key');
        this.appid = localStorage.getItem('ragflow_appid') || 'process'; // 默认appid为process

        console.log(`API客户端初始化: baseUrl=${this.baseUrl}, token=${this.token ? '已设置' : '未设置'}`);

        // 添加网络状态监听
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
        if (!apiKey) {
            console.error('尝试设置无效的API密钥');
            return false;
        }

        console.log(`设置API密钥: ${apiKey.substring(0, 8)}...`);
        this.token = apiKey;

        // 同时更新localStorage
        try {
            localStorage.setItem('ragflow_api_key', apiKey);
            console.log('API密钥已保存到localStorage');
            return true;
        } catch (error) {
            console.error('保存API密钥到localStorage失败:', error);
            return false;
        }
    }

    // 设置应用ID
    setAppId(appid: string) {
        this.appid = appid;
        if (appid) {
            localStorage.setItem('ragflow_appid', appid);
        } else {
            localStorage.removeItem('ragflow_appid');
        }
    }

    // 获取API密钥
    getApiKey(): string | null {
        if (!this.token) {
            // 从localStorage尝试获取
            this.token = localStorage.getItem('ragflow_api_key');
            if (this.token) {
                console.log(`从localStorage中恢复API密钥: ${this.token.substring(0, 8)}...`);
            }
        }
        return this.token;
    }

    // 获取应用ID
    getAppId(): string | null {
        return this.appid || localStorage.getItem('ragflow_appid') || 'process';
    }

    // 清除API密钥
    clearApiKey() {
        console.log('清除API密钥');
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
        // 检查网络状态
        if (!this.checkNetworkStatus()) {
            return {
                code: -1,
                message: "网络连接不可用，请检查您的网络连接后重试。"
            };
        }

        // 检查token是否存在
        if (!this.token) {
            console.error('API请求失败: 未提供token');
            return {
                code: 401,
                message: "未认证，请先登录"
            };
        }

        // 节流请求，防止短时间内大量相同请求
        await this.throttleRequest(endpoint);

        // 获取当前的appid (从localStorage或实例变量)
        const currentAppId = this.getAppId() || 'process';

        // 构建请求头
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'token': this.token,
            'appid': currentAppId
        };

        // 添加其他自定义请求头
        Object.assign(requestHeaders, headers);

        // 打印请求信息以便调试
        console.log(`API请求: ${method} ${endpoint}`);
        console.log(`请求头: token=${this.token.substring(0, 5)}..., appid=${currentAppId}`);

        // 构建请求URL，确保API路径正确
        const apiEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint}`;
        const url = `${this.baseUrl}${apiEndpoint}`;

        try {
            // 发送请求
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(body) : undefined,
                cache: 'no-store'
            });

            console.log(`收到响应: ${response.status} ${response.statusText}`);

            // 检查HTTP状态码
            if (!response.ok) {
                // 服务器返回错误状态码
                let errorMessage = `HTTP错误 ${response.status}`;
                let errorResponse: any = {};

                try {
                    errorResponse = await response.json();
                    errorMessage = errorResponse.message || errorMessage;
                } catch (e) {
                    // 无法解析JSON，使用默认错误消息
                }

                return {
                    code: response.status,
                    message: errorMessage,
                    error: errorResponse
                };
            }

            // 解析JSON响应
            const data = await response.json();
            return data as ApiResponse<T>;
        } catch (error) {
            // 处理网络错误或解析错误
            console.error('API请求异常:', error);
            return {
                code: -1,
                message: `请求失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 用户登录方法
     * @param mobile 手机号
     * @param code 验证码
     * @param useDirect 是否直接调用（跳过代理）
     * @returns 登录结果
     */
    async login(mobile: string, code: string, useDirect = false) {
        try {
            // 注意：cors-proxy.js 中对登录路径有特殊处理，不需要 /api 前缀
            const loginEndpoint = "/login";
            const url = `${this.baseUrl}${loginEndpoint}`;

            console.log('发送登录请求:', {
                url,
                mobile,
                code
            });

            // 直接发送请求，不通过 request 方法以避免 token 检查
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    mobile,
                    code
                }),
                cache: 'no-store'
            });

            console.log('登录响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('登录请求失败:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            console.log('登录响应数据:', result);

            if (result.code === 0 && result.data) {
                // 登录成功，保存token
                this.setApiKey(result.data);
                return {
                    code: 0,
                    message: "登录成功",
                    data: result.data
                };
            } else {
                // 登录失败
                return {
                    code: result.code || 1,
                    message: result.message || "登录失败，请检查手机号和验证码"
                };
            }
        } catch (error) {
            console.error('登录异常:', error);
            return {
                code: -1,
                message: `登录异常: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }



    // 获取会话列表
    async listChatSessions() {
        return this.request<ChatSession[]>('/sessions', 'GET');
    }

    // 创建聊天会话
    async createChatSession(name: string = '新会话') {
        return this.request<SessionResponseDTO>('/sessions', 'POST', { name });
    }

    // 更新会话名称
    async updateSessionName(sessionId: string, name: string) {
        return this.request<void>('/sessions/update', 'PUT', {
            sessionId,
            name
        });
    }

    // 删除会话
    async deleteSession(sessionIds: string[]) {
        return this.request<void>('/sessions', 'DELETE', { ids: sessionIds });
    }

    // 获取消息记录
    async getMessages(sessionId: string) {
        // 确保使用最新的appid
        const currentAppId = this.getAppId();
        console.log(`使用appid: ${currentAppId} 发送请求: /messages?sessionId=${sessionId}`);

        return this.request<MessageResponse[]>(`/messages?sessionId=${sessionId}`, 'GET');
    }

    // 发送聊天消息（非流式）
    async sendChatMessage(
        sessionId: string,
        message: string
    ): Promise<ApiResponse<ChatCompletion>> {
        return this.request<ChatCompletion>('/messages', 'POST', {
            sessionId,
            message
        });
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
            onError(new Error("未提供认证信息"));
            return;
        }

        // 获取当前的appid
        const currentAppId = this.getAppId();
        if (!currentAppId) {
            console.warn("未设置appid，使用默认值'process'");
        }

        // 构建请求URL和请求体
        const url = `${this.baseUrl}/messages/stream`;
        const requestBody = {
            sessionId,
            message
        };

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'token': this.token,
            'appid': currentAppId || 'process'
        };

        console.log(`使用appid: ${headers.appid} 发送流式请求`);

        try {
            // 使用EventSource或fetch流式API进行SSE连接
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }

            // 获取响应流的reader
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("无法获取响应流");
            }

            // 用于存储部分接收的数据
            const decoder = new TextDecoder();
            let buffer = '';

            // 读取流数据
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // 解码接收到的数据块
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // 处理完整的SSE事件
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';  // 最后一行可能不完整，保留到下一次

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    // 解析事件数据
                    if (line.startsWith('data:')) {
                        try {
                            const jsonStr = line.substring(5).trim();
                            
                            // 跳过空的或非JSON数据
                            if (jsonStr === '' || jsonStr === 'true' || jsonStr === 'false') {
                                continue;
                            }
                            
                            // 尝试解析JSON，如果失败则跳过该数据块
                            try {
                                const parsedData = JSON.parse(jsonStr);
                                onChunkReceived(parsedData);
                            } catch (parseError: any) {
                                 console.warn('跳过无效JSON数据:', jsonStr, '错误:', parseError.message);
                                continue;
                            }
                        } catch (e) {
                            console.error("解析SSE数据出错", e);
                        }
                    }
                }
            }

            // 处理完成
            onComplete();
        } catch (error) {
            console.error("流式请求失败", error);
            onError(error instanceof Error ? error : new Error(String(error)));
        }
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

// 创建API客户端实例
const apiClient = new ApiClient();

// 导出默认实例和类
export default apiClient;
export { ApiClient };