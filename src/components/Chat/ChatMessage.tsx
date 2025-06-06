import React, { useMemo } from 'react';
import { ChatMessage as MessageType, Reference, ReferenceChunk } from '../../types';
import MessageContent from './MessageContent';
import './ChatMessage.css';

interface ChatMessageProps {
    message: MessageType;
    isTyping?: boolean;
    reference?: Reference;
    onDocumentClick?: (documentId: string, chunk: ReferenceChunk) => void;
}

/**
 * 聊天消息组件 - 负责消息的整体布局和样式
 */
const ChatMessage: React.FC<ChatMessageProps> = React.memo((
    { message, isTyping = false, reference, onDocumentClick }
) => {
    const { role, isLoading, isError } = message;

    // 消息容器的CSS类名
    const messageClassName = useMemo(() => {
        const classes = ['chat-message'];

        // 角色样式
        if (role === 'user') {
            classes.push('chat-message--user');
        } else if (role === 'assistant') {
            classes.push('chat-message--assistant');
        }

        // 状态样式
        if (isLoading) {
            classes.push('chat-message--loading');
        }
        if (isError) {
            classes.push('chat-message--error');
        }
        if (isTyping) {
            classes.push('chat-message--typing');
        }

        return classes.join(' ');
    }, [role, isLoading, isError, isTyping]);

    return (
        <div className={messageClassName}>
            <div className="chat-message-body">
                <MessageContent
                    message={message}
                    isTyping={isTyping}
                    reference={reference}
                    onDocumentClick={onDocumentClick}
                />
            </div>
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;