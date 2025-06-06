import React, { useRef, useEffect, useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import './ChatHistory.css'; // 添加引用CSS文件

const ChatHistory: React.FC = () => {
    const { messages, isTyping, apiError, latestReference } = useChatContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(true);

    // 调试日志 - 监听消息变化（仅在开发环境下启用）
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log("ChatHistory: 消息列表更新", messages.length);
        }
    }, [messages.length]); // 只监听消息数量变化，避免频繁重渲染

    const scrollToBottom = () => {
        // 使用 setTimeout 确保在 DOM 更新后执行滚动
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            {
                threshold: 0.1,
            }
        );

        if (messagesEndRef.current) {
            observer.observe(messagesEndRef.current);
        }

        return () => observer.disconnect();
    }, []); // 移除不必要的依赖项，避免重复创建observer

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleDocumentClick = (documentId: string, chunk: any) => {
        console.log('Document clicked:', documentId, chunk);
        // 这里可以添加文档预览逻辑
    };

    return (
        <div className="chat-history">
            <div className="messages-container">
                {/* 空状态提示 */}
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💬</div>
                        <h3>开始对话</h3>
                        <p>向我提问任何问题，我会基于知识库为您提供准确的答案。</p>
                        <div className="example-questions">
                            <div className="example-question">"请介绍一下..."</div>
                            <div className="example-question">"如何使用..."</div>
                            <div className="example-question">"什么是..."</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 消息列表 */}
                        {messages.map((message, index) => (
                            <ChatMessage
                                key={message.id || `message-${index}`} // 优先使用消息ID，避免不必要的重新渲染
                                message={message}
                                isTyping={isTyping && index === messages.length - 1 && message.role === 'assistant'}
                                reference={message.role === 'assistant' && index === messages.length - 1 ? latestReference || undefined : undefined}
                                onDocumentClick={handleDocumentClick}
                            />
                        ))}
                        {/* API错误提示 */}
                        {apiError && messages.length > 0 && (
                            <div className="api-error-banner">
                                <span className="error-icon">⚠️</span>
                                <span className="error-message">{apiError}</span>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default ChatHistory;