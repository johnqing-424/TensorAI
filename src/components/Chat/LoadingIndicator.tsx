import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
    type?: 'message' | 'typing' | 'inline';
    size?: 'small' | 'medium' | 'large';
    text?: string;
}

/**
 * 加载指示器组件 - 统一管理各种加载状态的显示
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    type = 'message',
    size = 'medium',
    text
}) => {
    // 渲染打字机效果的加载动画
    const renderTypingDots = () => (
        <div className={`loading-dots loading-dots--${size}`}>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
        </div>
    );

    // 渲染旋转加载动画
    const renderSpinner = () => (
        <div className={`loading-spinner loading-spinner--${size}`}>
            <div className="spinner"></div>
        </div>
    );

    // 渲染脉冲加载动画
    const renderPulse = () => (
        <div className={`loading-pulse loading-pulse--${size}`}>
            <div className="pulse"></div>
        </div>
    );

    // 根据类型选择合适的加载动画
    const renderLoadingAnimation = () => {
        switch (type) {
            case 'typing':
                return renderTypingDots();
            case 'inline':
                return renderPulse();
            case 'message':
            default:
                return renderTypingDots();
        }
    };

    return (
        <div className={`loading-indicator loading-indicator--${type} loading-indicator--${size}`}>
            {renderLoadingAnimation()}
            {text && (
                <span className="loading-text">{text}</span>
            )}
        </div>
    );
};

export default LoadingIndicator;