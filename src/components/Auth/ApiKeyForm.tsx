import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { apiClient } from '../../api/client';

const ApiKeyForm: React.FC = () => {
    const { setApiKey } = useChatContext();
    const [inputApiKey, setInputApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    // 尝试验证API密钥有效性的函数
    const validateApiKey = async (key: string): Promise<boolean> => {
        try {
            console.log('开始验证API密钥');

            // 确保API密钥格式正确（添加Bearer前缀如果没有，但避免重复添加）
            const formattedKey = key.startsWith('Bearer ') ? key : `Bearer ${key}`;

            // 检查是否有重复的Bearer前缀，使用正则表达式更彻底地处理
            const finalKey = formattedKey.replace(/^Bearer\s+Bearer\s+/, 'Bearer ');

            // 临时设置API密钥进行验证
            apiClient.setApiKey(finalKey);

            // 先测试连接，增加超时提示
            console.log('测试API服务器连接...');
            setDebugInfo('正在测试服务器连接，请稍候...');

            const connectionOk = await apiClient.testConnection();
            if (!connectionOk) {
                console.error('无法连接到RAGFlow服务器');
                setDebugInfo('无法连接到RAGFlow服务器，请检查网络和服务器状态');
                return false;
            }

            // 连接成功后，尝试验证API密钥
            console.log('服务器连接成功，正在验证API密钥...');
            setDebugInfo('服务器连接成功，正在验证API密钥...');

            const response = await apiClient.listChatAssistants();
            console.log('验证请求响应:', response);

            // 检查响应是否成功
            if (response.code === 0) {
                console.log('API密钥验证成功');
                setDebugInfo('API密钥验证成功');
                return true;
            } else {
                console.error('API密钥验证失败:', response.message);
                setDebugInfo(`验证失败 - 错误代码: ${response.code}, 消息: ${response.message}`);
                return false;
            }
        } catch (error) {
            console.error('验证API密钥出错:', error);
            const errorMsg = (error as Error).message;

            // 提供更详细的错误信息
            if (errorMsg.includes('timeout') || errorMsg.includes('超时') || errorMsg.includes('aborted')) {
                setDebugInfo(`连接超时: 服务器响应时间过长，请检查网络连接和服务器状态`);
            } else if (errorMsg.includes('network') || errorMsg.includes('网络') || errorMsg.includes('fetch')) {
                setDebugInfo(`网络错误: 无法连接到服务器，请检查网络连接`);
            } else if (errorMsg.includes('408')) {
                setDebugInfo(`请求超时: 服务器响应超时，请稍后重试`);
            } else {
                setDebugInfo(`验证异常: ${errorMsg}`);
            }

            return false;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedKey = inputApiKey.trim();

        if (!trimmedKey) {
            setError('请输入API密钥');
            return;
        }

        setIsLoading(true);
        setError('');
        setDebugInfo(null);

        try {
            // 先验证API密钥
            console.log('正在验证API密钥...');
            const isValid = await validateApiKey(trimmedKey);
            console.log('验证结果:', isValid);

            if (isValid) {
                // 确保API密钥格式正确（添加Bearer前缀如果没有，但避免重复添加）
                const formattedKey = trimmedKey.startsWith('Bearer ') ? trimmedKey : `Bearer ${trimmedKey}`;

                // 检查是否有重复的Bearer前缀，使用正则表达式更彻底地处理
                const finalKey = formattedKey.replace(/^Bearer\s+Bearer\s+/, 'Bearer ');

                // 设置API密钥到Context
                console.log('设置API密钥到Context');
                setApiKey(finalKey);

                // 手动刷新本地存储，确保localStorage中的值被正确设置
                localStorage.setItem('ragflow_api_key', finalKey);

                console.log('登录过程完成');
                setIsLoading(false);
            } else {
                // 密钥无效，提供更具体的错误信息
                console.error('API密钥验证失败');
                const errorMsg = debugInfo || '';

                if (errorMsg.includes('超时') || errorMsg.includes('timeout')) {
                    setError('连接超时，请检查网络连接和服务器状态');
                } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
                    setError('API密钥无效或已过期，请检查密钥是否正确');
                } else if (errorMsg.includes('无法连接') || errorMsg.includes('网络')) {
                    setError('无法连接到服务器，请检查网络连接和服务器状态');
                } else {
                    setError('API密钥验证失败，请检查密钥和服务器状态');
                }

                // 清除无效的密钥
                apiClient.clearApiKey();
                setIsLoading(false);
            }
        } catch (error) {
            console.error('设置API密钥失败:', error);
            setError(`设置API密钥失败: ${(error as Error).message}`);
            setDebugInfo(`异常详情: ${(error as Error).stack}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <h2>欢迎使用 RAGFlow 聊天</h2>
            <p className="auth-description">请输入您的 RAGFlow API 密钥以继续</p>

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="apiKey">API 密钥</label>
                    <input
                        type="text"
                        id="apiKey"
                        value={inputApiKey}
                        onChange={(e) => setInputApiKey(e.target.value)}
                        placeholder="输入您的 RAGFlow API 密钥"
                        disabled={isLoading}
                        required
                    />
                </div>

                {error && <p className="error-message">{error}</p>}

                {debugInfo && (
                    <div className="debug-info" style={{ background: '#f8f8f8', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '10px', color: '#666' }}>
                        <strong>调试信息:</strong> {debugInfo}
                    </div>
                )}

                <button
                    type="submit"
                    className="submit-button"
                    disabled={isLoading}
                >
                    {isLoading ? '验证中...' : '登录'}
                </button>
            </form>

            <div className="info-text">
                <p>如果您没有 API 密钥，请联系管理员获取。</p>
                <p>API地址: {process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.131'}</p>
            </div>
        </div>
    );
};

export default ApiKeyForm;