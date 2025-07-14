import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useChatContext } from '../../context/ChatContext';
import ChatMessage from './ChatMessage';
import './ChatHistory.css'; // 添加引用CSS文件

const ChatHistory: React.FC = () => {
    const { messages, isTyping, apiError, isSidebarVisible } = useChatContext();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [scrollLocked, setScrollLocked] = useState(true);
    const lastScrollTime = useRef<number>(0);

    // 使用防抖优化滚动处理，防止频繁滚动
    const scrollToBottom = useCallback(() => {
        const now = Date.now();
        const MIN_SCROLL_INTERVAL = 100; // 最小滚动间隔为100毫秒

        // 如果距离上次滚动不足100毫秒，则跳过本次滚动
        if (now - lastScrollTime.current < MIN_SCROLL_INTERVAL) {
            return;
        }

        lastScrollTime.current = now;

        if (messagesContainerRef.current && scrollLocked) {
            requestAnimationFrame(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTo({
                        top: messagesContainerRef.current.scrollHeight,
                        behavior: 'auto'
                    });
                }
            });
        }
    }, [scrollLocked]);

    // 监听消息变化，滚动到底部
    useEffect(() => {
        if (messages.length > 0 && isAtBottom) {
            scrollToBottom();
        }
    }, [messages, messages.length, isAtBottom, scrollToBottom]);

    // 单独监听打字状态变化
    useEffect(() => {
        if (isTyping && isAtBottom) {
            scrollToBottom();
        }
    }, [isTyping, isAtBottom, scrollToBottom]);

    // 监听侧边栏状态变化，自动重新调整滚动
    useEffect(() => {
        // 侧边栏状态变化后延迟执行滚动，确保布局重新计算完成
        const timer = setTimeout(() => {
            if (isAtBottom) {
                scrollToBottom();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [isSidebarVisible, isAtBottom, scrollToBottom]);

    // 优化的滚动事件处理
    const handleScroll = useCallback(() => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            const newIsAtBottom = distanceFromBottom < 50;

            if (isAtBottom !== newIsAtBottom) {
                setIsAtBottom(newIsAtBottom);
            }

            // 如果用户向上滚动，则解锁自动滚动
            if (!newIsAtBottom && scrollLocked) {
                setScrollLocked(false);
            }
            // 如果用户滚动到底部，重新锁定自动滚动
            else if (newIsAtBottom && !scrollLocked) {
                setScrollLocked(true);
            }
        }
    }, [isAtBottom, scrollLocked]);

    // 监听滚动事件，使用事件委托和节流优化
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // 使用节流优化滚动事件处理
        let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
        const throttledScrollHandler = () => {
            if (scrollTimeout) return;

            scrollTimeout = setTimeout(() => {
                handleScroll();
                scrollTimeout = null;
            }, 100); // 100毫秒节流间隔
        };

        container.addEventListener('scroll', throttledScrollHandler, { passive: true });

        // 初始检查一次
        handleScroll();

        return () => {
            if (container) {
                container.removeEventListener('scroll', throttledScrollHandler);
            }
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
        };
    }, [handleScroll]);

    const handleDocumentClick = (documentId: string, chunk: any) => {
        // 构建文档预览URL
        const fileExtension = chunk.document_name ?
            chunk.document_name.split('.').pop()?.toLowerCase() : '';

        // 构建文档URL，不再依赖全局reference，直接使用chunk信息
        const docUrl = chunk.url || `/document/${documentId}?ext=${fileExtension || ''}&prefix=document`;

        // 打开文档预览
        window.open(docUrl, '_blank');
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
                        {messages.map((message, index) => {
                            // 使用稳定的key确保正确的渲染顺序
                            const messageKey = message.id || `message-${index}`;
                            return (
                                <div
                                    key={`row-${messageKey}`}
                                    className={`message-row message-row--${message.role}`}
                                >
                                    <ChatMessage
                                        message={message}
                                        isTyping={isTyping && index === messages.length - 1 && message.role === 'assistant'}
                                        onDocumentClick={handleDocumentClick}
                                    />
                                </div>
                            );
                        })}
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

            {/* 如果不在底部，显示"滚动到底部"按钮 */}
            {!isAtBottom && messages.length > 0 && (
                <button
                    className="scroll-to-bottom-button"
                    onClick={() => {
                        setScrollLocked(true);
                        setIsAtBottom(true);
                        if (messagesContainerRef.current) {
                            messagesContainerRef.current.scrollTo({
                                top: messagesContainerRef.current.scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                    }}
                >
                    ↓
                </button>
            )}
        </div>
    );
};

export default ChatHistory;