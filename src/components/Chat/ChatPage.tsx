import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import ChatHistory from './ChatHistory';
import { useNavigate } from 'react-router-dom';
import { FunctionIdType } from '../Layout/NavigationBar';

// 输入框组件接口
interface ChatInputBoxProps {
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    placeholder?: string;
    onSend?: (message: string) => void;
}

// 聊天输入框组件
const ChatInputBox: React.FC<ChatInputBoxProps> = ({
    inputValue,
    setInputValue,
    placeholder = '发消息，输入 @ 选择技能或选择文件',
    onSend = () => { }
}) => {
    // 处理发送按钮点击
    const handleSend = () => {
        if (inputValue.trim()) {
            onSend(inputValue);
            setInputValue('');
        }
    };

    // 处理按键事件（按回车发送）
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-input-container">
            <textarea
                className="chat-input"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div className="chat-toolbar">
                <div className="chat-tools">
                    {/* 文件上传按钮 */}
                    <button title="上传文件">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </button>
                </div>
                <button
                    className="chat-send"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                >
                    发送
                </button>
            </div>
        </div>
    );
};

const ChatPage: React.FC = () => {
    const { currentSession, selectedChatAssistant } = useChatContext();
    const [inputValue, setInputValue] = useState<string>('');
    const navigate = useNavigate();

    // 处理发送消息
    const handleSendMessage = (message: string) => {
        console.log("发送消息:", message);

        const { sendMessage, currentSession, createChatSession } = useChatContext();
        const navigate = useNavigate();

        // 获取当前选中的功能ID或默认功能ID
        const appId = selectedChatAssistant?.id || 'process';

        // 如果当前没有会话，先创建一个新会话
        if (!currentSession) {
            createChatSession('新对话').then(newSession => {
                if (newSession) {
                    // 导航到新会话的URL
                    navigate(`/${appId}/${newSession.id}`);
                    // 发送消息
                    setTimeout(() => {
                        sendMessage(message);
                    }, 100); // 短暂延迟确保会话已创建
                }
            });
        } else {
            // 已有会话，直接发送消息
            sendMessage(message);
        }
    };

    return (
        <div className="page chat-page">
            <div className="chat-header">
                <h2>{currentSession?.name || '新对话'}</h2>
            </div>

            <div className="chat-messages">
                <ChatHistory />
            </div>

            <div className="chat-input-wrapper">
                <ChatInputBox
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    onSend={handleSendMessage}
                />
            </div>
        </div>
    );
};

export default ChatPage;