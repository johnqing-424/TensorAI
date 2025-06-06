import React, { useState, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import apiClient from '../../services/api/client';

// 定义组件属性
interface ApiKeyFormProps {
    onSuccess?: () => void;
}

// 样式对象
const styles = {
    codeGroup: {
        marginBottom: '15px'
    },
    codeInputContainer: {
        display: 'flex',
        alignItems: 'center'
    },
    codeInput: {
        flex: 1,
        marginRight: '10px'
    },
    codeButton: {
        whiteSpace: 'nowrap' as const,
        padding: '6px 10px',
        background: '#4a90e2',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        minWidth: '90px'
    },
    codeButtonDisabled: {
        background: '#ccc',
        cursor: 'not-allowed' as const
    },
    infoBox: {
        padding: '10px',
        background: '#f8f8f8',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        marginBottom: '15px'
    },
    noteText: {
        fontSize: '13px',
        color: '#666',
        margin: '5px 0'
    },
    highlightCode: {
        fontWeight: 'bold',
        color: '#e53935',
        background: '#f5f5f5',
        padding: '2px 4px',
        borderRadius: '2px'
    },
    warningText: {
        color: '#ff6d00',
        fontSize: '13px',
        fontWeight: 'bold',
        marginTop: '5px'
    }
};

// 预设token样例 - 确保使用横线而不是下划线
const SAMPLE_TOKENS = [
    'token-zjts',
    'token-bruce',
    'token-yuehan'
];

// 有效token列表 - 用于验证token是否有效
const VALID_TOKENS = [
    'token-zjts',
    'token-bruce',
    'token-yuehan',
    'token-local'
];

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onSuccess }) => {
    const { setApiKey } = useChatContext();
    const [token, setToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
    const [apiUrl, setApiUrl] = useState(process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.131:8080');
    const [showApiSettings, setShowApiSettings] = useState(false);

    // 当API URL变化时，更新调试信息
    useEffect(() => {
        setDebugInfo(`当前API地址: ${apiUrl}`);
    }, [apiUrl]);

    // 测试API连接的函数
    const testConnection = async () => {
        setDebugInfo('正在测试API服务器连接...');
        setIsLoading(true);

        try {
            const connectionOk = await apiClient.testConnection();
            if (connectionOk) {
                setDebugInfo('API服务器连接成功!');
            } else {
                setDebugInfo('无法连接到API服务器，请检查网络和服务器状态');
            }
        } catch (error) {
            setDebugInfo(`连接测试出错: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 更新API地址的函数
    const updateApiUrl = () => {
        if (apiUrl) {
            if (apiClient.setBaseUrl(apiUrl)) {
                setDebugInfo(`API地址已更新为: ${apiUrl}`);
                // 不需要刷新页面，因为我们已经直接更新了API客户端
                // 可以立即测试连接
                testConnection();
            } else {
                setDebugInfo('API地址更新失败，请检查地址格式');
            }
        }
    };

    // 验证token格式和有效性
    const validateToken = (tokenValue: string): { valid: boolean; token: string; message?: string } => {
        let finalToken = tokenValue;

        // 如果使用了下划线而不是横线，自动修正
        if (tokenValue.includes('_')) {
            finalToken = tokenValue.replace(/_/g, '-');
            return {
                valid: true,
                token: finalToken,
                message: `检测到token格式问题，已自动将 "_" 修正为 "-": ${finalToken}`
            };
        }

        // 验证token是否在有效列表中
        if (!VALID_TOKENS.includes(finalToken)) {
            return {
                valid: false,
                token: finalToken,
                message: `无效的访问令牌: ${finalToken}`
            };
        }

        return { valid: true, token: finalToken };
    };

    // 处理直接登录
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setError('请输入访问令牌');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 验证并自动修正token格式
            const validation = validateToken(token);

            if (!validation.valid) {
                setError(validation.message || '无效的访问令牌');
                setIsLoading(false);
                return;
            }

            const validatedToken = validation.token;
            if (validation.message) {
                setDebugInfo(validation.message);
            }

            // 直接设置API密钥
            apiClient.setApiKey(validatedToken);
            setApiKey(validatedToken);
            console.log('直接使用token登录:', validatedToken);
            setDebugInfo(`已设置访问令牌: ${validatedToken}`);

            // 如果token被修正了，更新显示
            if (validatedToken !== token) {
                setToken(validatedToken);
            }

            // 登录成功，调用回调
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            setError('设置访问令牌失败');
            console.error('设置访问令牌失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 处理token输入变化，自动格式化
    const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setToken(newValue);

        // 如果检测到下划线，显示警告但不立即更正
        if (newValue.includes('_')) {
            setDebugInfo('注意: token格式应使用横线"-"而不是下划线"_"');
        }
    };

    return (
        <div className="auth-form-container">
            <h2>欢迎使用TensorAI</h2>
            <p className="auth-description">请输入您的访问令牌</p>

            {error && <div className="error-message">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="token">访问令牌</label>
                    <input
                        id="token"
                        type="text"
                        value={token}
                        onChange={handleTokenChange}
                        placeholder="例如：token-zjts"
                        disabled={isLoading}
                    />
                    {token.includes('_') && (
                        <div style={styles.warningText}>
                            请使用横线"-"而不是下划线"_"
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="submit-button"
                    disabled={isLoading}
                >
                    {isLoading ? '登录中...' : '登录'}
                </button>

                <p className="info-text">
                    * 如需访问令牌，请联系管理员
                </p>
            </form>

            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <button
                    type="button"
                    onClick={() => setShowApiSettings(!showApiSettings)}
                    style={{ background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', fontSize: '14px' }}
                >
                    {showApiSettings ? '隐藏设置' : '显示设置'}
                </button>
            </div>

            {showApiSettings && (
                <div style={{ marginTop: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <div className="form-group">
                        <label htmlFor="apiUrl">API 服务器地址</label>
                        <input
                            type="text"
                            id="apiUrl"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            placeholder="例如: http://192.168.1.131:8080"
                        />
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setApiUrl('http://192.168.1.131:8080');
                                setDebugInfo('已设置API地址: http://192.168.1.131:8080');
                            }}
                            style={{ padding: '4px 8px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            192.168.1.131:8080
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setApiUrl('http://localhost:8080');
                                setDebugInfo('已设置API地址: http://localhost:8080');
                            }}
                            style={{ padding: '4px 8px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            localhost:8080
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setApiUrl('http://127.0.0.1:8080');
                                setDebugInfo('已设置API地址: http://127.0.0.1:8080');
                            }}
                            style={{ padding: '4px 8px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            127.0.0.1:8080
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setApiUrl('http://192.168.1.131:9380');
                                setDebugInfo('已设置API地址: http://192.168.1.131:9380');
                            }}
                            style={{ padding: '4px 8px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            192.168.1.131:9380
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={updateApiUrl}
                            style={{ padding: '6px 12px', background: '#888', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', flex: '1' }}
                        >
                            更新 API 地址
                        </button>
                        <button
                            type="button"
                            onClick={testConnection}
                            style={{ padding: '6px 12px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', flex: '1' }}
                        >
                            测试连接
                        </button>
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <p style={{ fontSize: '14px', marginBottom: '5px' }}>选择预设令牌:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {SAMPLE_TOKENS.map((sampleToken, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        setToken(sampleToken);
                                        setDebugInfo(`已选择预设令牌: ${sampleToken}`);
                                    }}
                                    style={{ padding: '4px 8px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                    {sampleToken}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={async () => {
                                setDebugInfo('正在测试多个API服务器...');
                                const servers = [
                                    'http://192.168.1.131:8080',
                                    'http://localhost:8080',
                                    'http://127.0.0.1:8080',
                                    'http://192.168.1.131:9380',
                                    'http://localhost:9380',
                                    'http://127.0.0.1:9380'
                                ];

                                let results = '';
                                for (const server of servers) {
                                    try {
                                        const response = await fetch(`${server}/api/login`, {
                                            method: 'HEAD',
                                            mode: 'cors',
                                            cache: 'no-store',
                                            // 设置较短的超时时间
                                            signal: AbortSignal.timeout(3000)
                                        });
                                        results += `${server}: ${response.status} ${response.statusText}\n`;
                                        // 如果找到可用服务器，自动设置
                                        if (response.status !== 404) {
                                            setApiUrl(server);
                                        }
                                    } catch (error: any) {
                                        results += `${server}: ${error.message}\n`;
                                    }
                                }
                                setDebugInfo(`API服务器测试结果:\n${results}`);
                            }}
                            style={{ width: '100%', padding: '6px 12px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                        >
                            自动测试所有服务器
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiKeyForm;