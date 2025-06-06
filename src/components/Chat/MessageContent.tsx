import React, { useMemo, useCallback } from 'react';
import { ChatMessage, Reference, ReferenceChunk } from '../../types';
import MarkdownRenderer from './MarkdownRenderer';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';

interface MessageContentProps {
    message: ChatMessage;
    isTyping?: boolean;
    reference?: Reference;
    onDocumentClick?: (documentId: string, chunk: ReferenceChunk) => void;
}

/**
 * 消息内容组件 - 统一管理消息内容的渲染逻辑
 * 根据消息状态选择合适的渲染方式
 */
const MessageContent: React.FC<MessageContentProps> = ({
    message,
    isTyping = false,
    reference,
    onDocumentClick
}) => {
    const { content, isLoading, isError, role } = message;

    // 确定当前消息的状态
    const messageState = useMemo(() => {
        if (isLoading) return 'loading';
        if (isError) return 'error';
        if (isTyping && role === 'assistant') return 'typing';
        return 'normal';
    }, [isLoading, isError, isTyping, role]);

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

        return (
            <MarkdownRenderer
                content={content || ''}
                isStreaming={isTyping}
                reference={reference}
                onDocumentClick={onDocumentClick}
            />
        );
    }, [content, isTyping, reference, onDocumentClick]);

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
        <div className={`message-content message-content--${messageState}`}>
            {renderContent()}
        </div>
    );
};

export default MessageContent;