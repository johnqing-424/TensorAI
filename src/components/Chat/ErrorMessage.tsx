import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
    message: string;
    type?: 'message' | 'inline' | 'banner';
    severity?: 'error' | 'warning' | 'info';
    onRetry?: () => void;
    onDismiss?: () => void;
    showIcon?: boolean;
}

/**
 * 错误消息组件 - 统一管理各种错误状态的显示
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
    message,
    type = 'message',
    severity = 'error',
    onRetry,
    onDismiss,
    showIcon = true
}) => {
    // 获取错误图标
    const getErrorIcon = () => {
        switch (severity) {
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            case 'error':
            default:
                return '❌';
        }
    };

    // 渲染操作按钮
    const renderActions = () => {
        if (!onRetry && !onDismiss) return null;

        return (
            <div className="error-actions">
                {onRetry && (
                    <button
                        className="error-action-btn error-action-btn--retry"
                        onClick={onRetry}
                        type="button"
                    >
                        重试
                    </button>
                )}
                {onDismiss && (
                    <button
                        className="error-action-btn error-action-btn--dismiss"
                        onClick={onDismiss}
                        type="button"
                    >
                        ✕
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={`error-message error-message--${type} error-message--${severity}`}>
            <div className="error-content">
                {showIcon && (
                    <span className="error-icon">
                        {getErrorIcon()}
                    </span>
                )}
                <span className="error-text">
                    {message}
                </span>
            </div>
            {renderActions()}
        </div>
    );
};

export default ErrorMessage;