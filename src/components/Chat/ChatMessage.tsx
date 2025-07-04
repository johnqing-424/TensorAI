import React from 'react';
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
const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    isTyping = false,
    reference,
    onDocumentClick
}) => {
    const { role, isLoading, isError } = message;

    // 确定消息样式类
    const getMessageClass = () => {
        let className = 'chat-message';
        if (role === 'user') {
            className += ' chat-message--user';
        } else if (role === 'assistant') {
            className += ' chat-message--assistant';
        }

        if (isLoading) {
            className += ' chat-message--loading';
        }

        if (isError) {
            className += ' chat-message--error';
        }

        if (isTyping) {
            className += ' chat-message--typing';
        }

        return className;
    };

    return (
        <div className={getMessageClass()}>
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
};

export default ChatMessage;