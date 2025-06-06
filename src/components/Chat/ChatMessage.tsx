import React, { useCallback, useMemo, useEffect } from 'react';
import { ChatMessage as MessageType, Reference, ReferenceChunk } from '../../types';
import MarkdownContent from './MarkdownContent';

interface ChatMessageProps {
    message: MessageType;
    isTyping?: boolean;
    reference?: Reference;
    onDocumentClick?: (documentId: string, chunk: ReferenceChunk) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo((
    { message, isTyping = false, reference, onDocumentClick }
) => {
    const { role, content, isLoading, isError } = message;

    // 调试日志（仅在开发环境下启用）
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && !content && role === 'assistant') {
            console.warn("警告: 助手消息内容为空", message);
        }
    }, [content, role, message.id]); // 只在必要时触发

    // 消息类型的CSS类名
    const messageClassName = useMemo(() => {
        const classes = ['chat-message'];
        if (role === 'user') {
            classes.push('user-message');
        } else if (role === 'assistant') {
            classes.push('assistant-message');
        }
        if (isLoading) {
            classes.push('loading-message');
        }
        if (isError) {
            classes.push('error-message');
        }
        return classes.join(' ');
    }, [role, isLoading, isError]);

    // 渲染消息内容
    const renderContent = useCallback(() => {
        if (isLoading) {
            return (
                <div className="message-content">
                    <div className="typing-indicator">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                </div>
            );
        }

        if (isError) {
            return (
                <div className="message-content error">
                    <p>很抱歉，发生了错误。请稍后再试或联系管理员。</p>
                </div>
            );
        }

        // 渲染Markdown内容
        return (
            <div className="message-content">
                <MarkdownContent
                    content={content || ''}
                    loading={isTyping}
                    reference={reference || { total: 0, chunks: [], doc_aggs: [] }}
                    clickDocumentButton={onDocumentClick}
                />
            </div>
        );
    }, [content, isLoading, isError, isTyping, reference, onDocumentClick]);

    return (
        <div className={messageClassName}>
            {renderContent()}
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;