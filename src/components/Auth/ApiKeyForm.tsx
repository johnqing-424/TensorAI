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
            console.log('开始验证API密钥:', key);

            // 临时设置API密钥进行验证
            apiClient.setApiKey(key);

            // 尝试获取聊天助手列表，如果成功则密钥有效
            console.log('发送验证请求...');
            const response = await apiClient.listChatAssistants();
            console.log('验证请求响应:', response);

            // 检查响应是否成功
            if (response.code === 0) {
                console.log('API密钥验证成功');
                return true;
            } else {
                console.error('API密钥验证失败:', response.message);
                setDebugInfo(`错误代码: ${response.code}, 消息: ${response.message}`);
                return false;
            }
        } catch (error) {
            console.error('验证API密钥出错:', error);
            setDebugInfo(`验证异常: ${(error as Error).message}`);
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
                // 设置API密钥到Context
                console.log('设置API密钥到Context');
                setApiKey(trimmedKey);

                // 手动刷新本地存储，确保localStorage中的值被正确设置
                localStorage.setItem('ragflow_api_key', trimmedKey);

                console.log('登录过程完成');
                setIsLoading(false);
            } else {
                // 密钥无效
                console.error('API密钥验证失败');
                setError('API密钥无效，请检查后重试');
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