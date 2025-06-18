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

// 预设验证码样例
const SAMPLE_CODES = [
    '123456',
    '888888',
    '000000'
];

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onSuccess }) => {
    const { setApiKey } = useChatContext();
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
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

    // 验证验证码格式
    const validateCode = (code: string): boolean => {
        const codeRegex = /^\d{6}$/;
        return codeRegex.test(code);
    };

    // 验证手机号格式
    const validatePhone = (phone: string): boolean => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    };

    // 处理登录
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phone) {
            setError('请输入手机号');
            return;
        }

        if (!validatePhone(phone)) {
            setError('请输入正确的手机号格式');
            return;
        }

        if (!code) {
            setError('请输入验证码');
            return;
        }

        if (!validateCode(code)) {
            setError('请输入6位数字验证码');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('开始登录流程:', { phone, code });
            setDebugInfo(`开始登录 - 手机号: ${phone}, 验证码: ${code}`);

            // 调用登录API
            const response = await apiClient.login(phone, code);
            console.log('登录API响应:', response);

            if (response.code === 0 && response.data) {
                // 登录成功，设置API密钥
                setApiKey(response.data);
                console.log('登录成功:', { phone, token: response.data });
                setDebugInfo(`登录成功 - 手机号: ${phone}, 获得token: ${response.data}`);

                // 登录成功，调用回调
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                console.error('登录失败:', response);
                setError(response.message || '登录失败，请检查手机号和验证码');
                setDebugInfo(`登录失败 - code: ${response.code}, message: ${response.message}`);
            }
        } catch (error) {
            console.error('登录异常:', error);
            setError('登录失败，请重试');
            setDebugInfo(`登录异常: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 处理验证码输入变化
    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.replace(/\D/g, ''); // 只允许数字
        if (newValue.length <= 6) {
            setCode(newValue);
        }
    };

    return (
        <div className="auth-form-container">
            <h2>欢迎使用TensorAI</h2>
            <p className="auth-description">请输入您的手机号和验证码</p>

            {error && <div className="error-message">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="phone">手机号</label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="请输入11位手机号"
                        disabled={isLoading}
                        maxLength={11}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="code">验证码</label>
                    <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={handleCodeChange}
                        placeholder="请输入6位验证码"
                        disabled={isLoading}
                        maxLength={6}
                    />
                    <div style={styles.noteText}>
                        测试验证码: {SAMPLE_CODES.join(', ')}
                    </div>
                </div>

                <button
                    type="submit"
                    className="submit-button"
                    disabled={isLoading || !phone || !code}
                >
                    {isLoading ? '登录中...' : '登录'}
                </button>

                <p className="info-text">
                    * 需要同时提供正确的手机号和验证码才能登录
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
                        <p style={{ fontSize: '14px', marginBottom: '5px' }}>选择预设验证码:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {SAMPLE_CODES.map((sampleCode, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        setCode(sampleCode);
                                        setDebugInfo(`已选择预设验证码: ${sampleCode}`);
                                    }}
                                    style={{ padding: '4px 8px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                    {sampleCode}
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
                                    'http://192.168.1.131:8080',
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