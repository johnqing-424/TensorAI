import React, { useState, KeyboardEvent } from 'react';
import { useChatContext } from '../../context/ChatContext';

const ChatInput: React.FC = () => {
    const { currentMessage, setCurrentMessage, sendMessage, isTyping } = useChatContext();
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentMessage.trim() && !isTyping) {
            sendMessage(currentMessage);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentMessage(e.target.value);

        // 自动调整文本区域的高度
        const textarea = e.target;
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 150); // 最大高度为150px
        textarea.style.height = `${newHeight}px`;
    };

    return (
        <div className={`chat-input-container ${isFocused ? 'focused' : ''}`}>
            <form onSubmit={handleSubmit} className="chat-form">
                <textarea
                    className="chat-input"
                    placeholder="输入消息..."
                    value={currentMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={isTyping}
                    rows={1}
                />
                <button
                    type="submit"
                    className="send-button"
                    disabled={!currentMessage.trim() || isTyping}
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
            {isTyping && (
                <div className="typing-status">
                    AI 正在回复中...
                </div>
            )}
        </div>
    );
};

export default ChatInput; 