import React, { useState, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { apiClient } from '../../api/client';

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
    }
};

// 默认测试验证码
const TEST_VERIFICATION_CODE = '123456';

const ApiKeyForm: React.FC = () => {
    const { setApiKey } = useChatContext();
    const [mobile, setMobile] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCodeLoading, setIsCodeLoading] = useState(false);
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
    const [apiUrl, setApiUrl] = useState(process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.131:8080');
    const [showApiSettings, setShowApiSettings] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // 处理倒计时
    useEffect(() => {
        if (countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown]);

    // 当API URL变化时，更新调试信息
    useEffect(() => {
        setDebugInfo(`当前API地址: ${apiUrl}`);
    }, [apiUrl]);

    // 请求验证码的函数
    const requestVerificationCode = async () => {
        if (!mobile || mobile.length < 11) {
            setError('请输入正确的手机号');
            return;
        }

        setIsCodeLoading(true);
        setError('');

        try {
            // 发送真实验证码请求
            const response = await apiClient.sendVerificationCode(mobile);

            if (response.code === 0) {
                setDebugInfo(`验证码已发送到 ${mobile}`);
                setCountdown(60); // 设置60秒倒计时
            } else {
                setError(`发送验证码失败: ${response.message}`);
            }
        } catch (error) {
            setError(`发送验证码异常: ${(error as Error).message}`);
            setDebugInfo(`异常: ${(error as Error).stack}`);
        } finally {
            setIsCodeLoading(false);
        }
    };

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

    // 尝试验证API密钥有效性的函数
    const validateLogin = async (mobile: string, code: string): Promise<boolean> => {
        try {
            console.log('开始验证登录');

            // 使用真实API登录
            const response = await apiClient.login(mobile, code);

            if (response.code === 0 && response.data) {
                console.log('登录成功，获取到token');
                setDebugInfo('登录成功');

                // apiClient.login方法已经设置了token到localStorage
                return true;
            } else {
                console.error('登录失败:', response.message);
                setDebugInfo(`登录失败: ${response.message}`);
                return false;
            }
        } catch (error) {
            console.error('验证登录出错:', error);
            setDebugInfo(`验证异常: ${(error as Error).message}`);
            return false;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!mobile.trim()) {
            setError('请输入手机号');
            return;
        }

        if (!code.trim()) {
            setError('请输入验证码');
            return;
        }

        setIsLoading(true);
        setError('');
        setDebugInfo(null);

        try {
            // 先验证登录
            console.log('正在验证登录信息...');
            const isValid = await validateLogin(mobile, code);
            console.log('验证结果:', isValid);

            if (isValid) {
                console.log('登录过程完成');
                setIsLoading(false);
                // apiClient.login方法已经设置了token到localStorage
            } else {
                // 登录失败，提供更具体的错误信息
                console.error('登录验证失败');
                const errorMsg = debugInfo || '';

                if (errorMsg.includes('超时') || errorMsg.includes('timeout')) {
                    setError('连接超时，请检查网络连接和服务器状态');
                } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
                    setError('手机号或验证码无效，请重新输入');
                } else if (errorMsg.includes('无法连接') || errorMsg.includes('网络')) {
                    setError('无法连接到服务器，请检查网络连接和服务器状态');
                } else {
                    setError('登录验证失败，请检查输入信息和服务器状态');
                }

                // 清除无效的密钥
                apiClient.clearApiKey();
                setIsLoading(false);
            }
        } catch (error) {
            console.error('登录失败:', error);
            setError(`登录失败: ${(error as Error).message}`);
            setDebugInfo(`异常详情: ${(error as Error).stack}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <h2>欢迎使用 RAGFlow 聊天</h2>
            <p className="auth-description">请输入您的手机号和验证码以继续</p>

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="mobile">手机号</label>
                    <input
                        type="text"
                        id="mobile"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="请输入手机号"
                        disabled={isLoading}
                        required
                    />
                </div>

                <div className="form-group" style={styles.codeGroup}>
                    <label htmlFor="code">验证码</label>
                    <div style={styles.codeInputContainer}>
                        <input
                            type="text"
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="请输入验证码"
                            disabled={isLoading}
                            required
                            style={styles.codeInput}
                        />
                        <button
                            type="button"
                            onClick={requestVerificationCode}
                            disabled={isCodeLoading || countdown > 0 || isLoading}
                            style={{
                                ...styles.codeButton,
                                ...(isCodeLoading || countdown > 0 || isLoading ? styles.codeButtonDisabled : {})
                            }}
                        >
                            {countdown > 0 ? `${countdown}秒后重试` : isCodeLoading ? '发送中...' : '获取验证码'}
                        </button>
                    </div>
                </div>

                {error && <p className="error-message">{error}</p>}

                {debugInfo && (
                    <div className="debug-info" style={{ background: '#f8f8f8', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '10px', color: '#666' }}>
                        <strong>调试信息:</strong> {debugInfo}
                    </div>
                )}

                {/* 显示当前存储的token */}
                {apiClient.getApiKey() && (
                    <div style={{ background: '#f0f7ff', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '10px', color: '#333' }}>
                        <strong>当前令牌:</strong> {apiClient.getApiKey()}
                    </div>
                )}

                <button
                    type="submit"
                    className="submit-button"
                    disabled={isLoading}
                >
                    {isLoading ? '验证中...' : '登录'}
                </button>

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
                                onClick={async () => {
                                    setDebugInfo('正在测试API连接...');
                                    try {
                                        const response = await fetch(`${apiUrl}/api/login`, {
                                            method: 'POST',
                                            mode: 'cors',
                                            cache: 'no-store',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ mobile: '10000000000', code: '123456' })
                                        });
                                        setDebugInfo(`API连接测试结果: ${response.status} ${response.statusText}`);
                                    } catch (error: any) {
                                        setDebugInfo(`API连接测试失败: ${error.message}`);
                                    }
                                }}
                                style={{ padding: '6px 12px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', flex: '1' }}
                            >
                                测试连接
                            </button>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setCode('token-zjts');
                                    setDebugInfo('已填入测试验证码');
                                }}
                                style={{ width: '100%', padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                            >
                                使用测试验证码
                            </button>
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
            </form>

            <div className="info-text">
                <p>如果您没有账号，请联系管理员获取。</p>
                <p>API地址: {apiUrl}</p>
            </div>
        </div>
    );
};

export default ApiKeyForm;