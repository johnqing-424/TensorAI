import React, { useMemo, useEffect, useState } from 'react';
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
    const { role, isLoading, isError, content, timestamp, completed } = message;
    // 使用本地state强制更新组件
    const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

    // 添加调试日志，监控流式消息更新
    useEffect(() => {
        if (role === 'assistant' && (isLoading || timestamp)) {
            console.log(
                `消息更新 [${completed ? '完成' : '加载中'}]: ${content.substring(0, 15)}... (${timestamp})`,
                message
            );

            // 流式消息内容更新时强制组件重新渲染
            if (isLoading) {
                setForceUpdateCounter(prev => prev + 1);
            }
        }
    }, [role, content, isLoading, timestamp, completed]);

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
        if (completed) {
            classes.push('chat-message--completed');
        }

        return classes.join(' ');
    }, [role, isLoading, isError, isTyping, completed]);

    // 使用唯一key确保组件正确更新
    const uniqueKey = `${message.id}-${timestamp || Date.now()}-${forceUpdateCounter}`;

    return (
        <div className={messageClassName} key={uniqueKey}>
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