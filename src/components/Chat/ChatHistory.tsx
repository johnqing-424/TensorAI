import React, { useRef, useEffect, useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import './ChatHistory.css'; // 添加引用CSS文件

const ChatHistory: React.FC = () => {
    const { messages, isTyping, apiError, latestReference, isSidebarVisible } = useChatContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // 调试日志 - 监听消息变化（仅在开发环境下启用）
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log("ChatHistory: 消息列表更新", messages.length);
        }
    }, [messages.length]); // 只监听消息数量变化，避免频繁重渲染

    // 强化的滚动到底部函数 - 使用容器内滚动
    const scrollToBottom = () => {
        console.log("执行滚动到底部");

        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'auto'
            });
        }

        // 使用延时确保在DOM更新后滚动到底部
        setTimeout(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    // 监听消息变化，滚动到底部
    useEffect(() => {
        if (messages.length > 0 && isAtBottom) {
            scrollToBottom();
        }
    }, [messages, messages.length, isAtBottom]);

    // 单独监听打字状态变化
    useEffect(() => {
        if (isTyping && isAtBottom) {
            scrollToBottom();
        }
    }, [isTyping, isAtBottom]);

    // 监听侧边栏状态变化，自动重新调整滚动
    useEffect(() => {
        // 侧边栏状态变化后延迟执行滚动，确保布局重新计算完成
        const timer = setTimeout(() => {
            if (isAtBottom) {
                scrollToBottom();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [isSidebarVisible, isAtBottom]);

    // 监听滚动事件，判断是否在底部
    useEffect(() => {
        const handleScroll = () => {
            if (messagesContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
                setIsAtBottom(distanceFromBottom < 50);
            }
        };

        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            // 初始检查一次
            handleScroll();
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const handleDocumentClick = (documentId: string, chunk: any) => {
        console.log('Document clicked:', documentId, chunk);
        // 这里可以添加文档预览逻辑
    };

    return (
        <div className="chat-history" ref={messagesContainerRef}>
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
                        {/* 消息列表 - 使用message-row实现左右布局 */}
                        {messages.map((message, index) => (
                            <div
                                key={`row-${message.id || `message-${index}`}-${message.timestamp || index}`}
                                className={`message-row message-row--${message.role}`}
                            >
                                <ChatMessage
                                    key={`${message.id || `message-${index}`}-${message.timestamp || index}`}
                                    message={message}
                                    isTyping={isTyping && index === messages.length - 1 && message.role === 'assistant'}
                                    reference={message.role === 'assistant' && index === messages.length - 1 ? latestReference || undefined : undefined}
                                    onDocumentClick={handleDocumentClick}
                                />
                            </div>
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
                {/* 放置在最底部，用于滚动目标 */}
                <div ref={messagesEndRef} className="scroll-target" />
            </div>
        </div>
    );
};

export default ChatHistory;