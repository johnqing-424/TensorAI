import React, { useMemo, useEffect, useState, useRef } from 'react';
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

    // 使用useRef跟踪内容变化，避免不必要的重渲染
    const lastContentRef = useRef(content);

    // 使用useRef跟踪上次更新时间，实现节流
    const lastUpdateRef = useRef(0);

    // 减少重渲染次数的计数器
    const [updateCounter, setUpdateCounter] = useState(0);

    // 控制重渲染频率的节流时间间隔（毫秒）
    const throttleInterval = 100;

    // 优化的更新机制，使用节流减少重渲染
    useEffect(() => {
        if (role === 'assistant' && isLoading) {
            const now = Date.now();

            // 只在开发环境记录日志，且仅当内容有明显变化时
            if (process.env.NODE_ENV === 'development' &&
                (content.length - lastContentRef.current.length > 10 || completed)) {
                console.log(
                    `消息更新 [${completed ? '完成' : '加载中'}]: ${content.substring(0, 15)}... (${timestamp})`,
                    { content: content.length, isLoading, timestamp, completed }
                );
            }

            // 当内容变化且距离上次更新超过节流间隔时才触发更新
            if ((content !== lastContentRef.current) &&
                (now - lastUpdateRef.current > throttleInterval || completed)) {

                lastContentRef.current = content;
                lastUpdateRef.current = now;

                // 使用功能性更新避免依赖过期状态
                setUpdateCounter(prev => prev + 1);
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
    }, [role, isError, isTyping, completed]);

    // 使用唯一key确保组件正确更新，但减少不必要的更改
    const uniqueKey = useMemo(() => (
        `${message.id}-${updateCounter}`
    ), [message.id, updateCounter]);

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