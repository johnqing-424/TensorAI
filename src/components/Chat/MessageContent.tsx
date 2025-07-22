import React, { useMemo, useCallback, useRef } from 'react';
import { ChatMessage } from '../../types';
import MarkdownRenderer from './MarkdownRenderer';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import './MessageContent.css';

interface MessageContentProps {
    message: ChatMessage;
    isTyping?: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({
    message,
    isTyping = false,
}) => {
    const { content, isLoading, isError, role } = message;
    const contentRef = useRef<HTMLDivElement>(null);

    // 确定当前消息的状态
    const messageState = useMemo(() => {
        if (isError) {
            return 'error';
        }
        if (isLoading && (!content || content === '...')) {
            return 'loading';
        }
        if (isTyping && role === 'assistant') {
            return 'typing';
        }
        return 'normal';
    }, [isLoading, isError, isTyping, role, content]);

    // 渲染加载状态
    const renderLoading = useCallback(() => (
        <LoadingIndicator type="message" />
    ), []);

    // 渲染错误状态
    const renderError = useCallback(() => (
        <ErrorMessage
            message="很抱歉，发生了错误。请稍后再试或联系管理员。"
            type="message"
        />
    ), []);

    // 渲染正常内容
    const renderNormalContent = useCallback(() => {
        // 处理空内容的情况
        if (!content && !isTyping) {
            return (
                <div className="empty-message-content">
                    <span className="empty-text">[无内容]</span>
                </div>
            );
        }

        // 计算是否处于流式显示状态
        const isStreaming: boolean = Boolean(
            isTyping || (isLoading && content && content !== '...')
        );

        return (
            <MarkdownRenderer
                content={content || ''}
                isStreaming={isStreaming}
            />
        );
    }, [content, isTyping, isLoading]);

    // 根据状态渲染对应内容
    const renderContent = useCallback(() => {
        switch (messageState) {
            case 'loading':
                return renderLoading();
            case 'error':
                return renderError();
            case 'typing':
            case 'normal':
            default:
                return renderNormalContent();
        }
    }, [messageState, renderLoading, renderError, renderNormalContent]);

    return (
        <div className={`message-content message-content--${messageState}`} ref={contentRef}>
            {renderContent()}
        </div>
    );
};

export default MessageContent;