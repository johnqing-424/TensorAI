import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import ChatHistory from './ChatHistory';
import { useNavigate } from 'react-router-dom';
import ChatInputBox from '../Common/ChatInputBox';

const ChatPage: React.FC = () => {
    const { currentSession } = useChatContext();
    const [inputValue, setInputValue] = useState<string>('');
    const navigate = useNavigate();

    // 不在这里定义handleSendMessage，使用ChatLayout中的处理函数

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
                // 不再传递onSend属性，由父组件ChatLayout处理
                />
            </div>
        </div>
    );
};

export default ChatPage;