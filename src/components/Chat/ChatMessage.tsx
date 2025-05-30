import React, { useCallback, useMemo } from 'react';
import { ChatMessage as MessageType, Reference, ReferenceChunk } from '../../types';
import MarkdownContent from './MarkdownContent';

interface ChatMessageProps {
    message: MessageType;
    isTyping?: boolean;
    reference?: Reference;
    onDocumentClick?: (documentId: string, chunk: ReferenceChunk) => void;
}

// 助手图标组件
const AssistantIcon: React.FC = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
            d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V7H9V9H3V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V9H21ZM5 3H13V7H19V9H5V3Z"
            fill="currentColor"
        />
    </svg>
);

// 用户头像组件
const UserAvatar: React.FC = () => (
    <div className="user-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
    </div>
);

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({
    message,
    isTyping = false,
    reference,
    onDocumentClick
}) => {
    const { role, content, isLoading, isError } = message;

    // 根据角色确定样式类
    const messageClass = useMemo(() => {
        const baseClass = role === 'user' ? 'ragflow-user-message' : 'ragflow-assistant-message';
        const errorClass = isError ? ' ragflow-error-message' : '';
        const loadingClass = isLoading ? ' ragflow-loading-message' : '';
        return `ragflow-message ${baseClass}${errorClass}${loadingClass}`;
    }, [role, isError, isLoading]);

    const handleDocumentClick = useCallback(
        (documentId: string, chunk: ReferenceChunk) => {
            onDocumentClick?.(documentId, chunk);
        },
        [onDocumentClick]
    );

    return (
        <div className={messageClass}>
            <div className="ragflow-message-avatar">
                {role === 'user' ? <UserAvatar /> : <AssistantIcon />}
            </div>
            <div className="ragflow-message-content">
                {role === 'assistant' ? (
                    <MarkdownContent
                        content={content}
                        loading={isLoading || false}
                        reference={reference || { total: 0, chunks: [], doc_aggs: [] }}
                        clickDocumentButton={handleDocumentClick}
                    />
                ) : (
                    <div className="ragflow-user-content">
                        {content}
                    </div>
                )}
                {(isTyping || isLoading) && (
                    <span className="ragflow-typing-indicator">
                        <span className="ragflow-dot"></span>
                        <span className="ragflow-dot"></span>
                        <span className="ragflow-dot"></span>
                    </span>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.message.content === nextProps.message.content &&
        prevProps.isTyping === nextProps.isTyping &&
        prevProps.message.isLoading === nextProps.message.isLoading &&
        prevProps.message.isError === nextProps.message.isError &&
        prevProps.reference === nextProps.reference;
});

export default ChatMessage;