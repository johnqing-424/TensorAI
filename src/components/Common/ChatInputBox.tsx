import React from 'react';
import './ChatInputBox.css';
import './ChatInputBox-welcome-override.css';
import { useChatContext } from '../../context/ChatContext'; // 引入ChatContext

// 按钮配置接口
interface ButtonConfig {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title?: string;
}

// 输入框组件接口
interface ChatInputBoxProps {
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    placeholder?: string;
    onSend?: (message: string) => void;
    className?: string;
    disabled?: boolean;
    maxHeight?: number;
    // 按钮配置
    topButtons?: ButtonConfig[];
    bottomButtons?: ButtonConfig[];
    // 兼容性属性（保持向后兼容）
    isDeepThinking?: boolean;
    toggleDeepThinking?: () => void;
    showFileUpload?: boolean;
    showDeepThinking?: boolean;
    customButtons?: React.ReactNode;
    buttonsPosition?: 'top' | 'bottom' | 'both';
}

// 聊天输入框组件
const ChatInputBox: React.FC<ChatInputBoxProps> = ({
    inputValue,
    setInputValue,
    placeholder = '我是腾视AI大模型聊天，输入您想问的任何内容...',
    onSend = () => { },
    className = '',
    disabled = false,
    maxHeight = 150,
    topButtons = [],
    bottomButtons = [],
    // 兼容性属性
    isDeepThinking = false,
    toggleDeepThinking = () => { },
    showFileUpload = true,
    showDeepThinking = true,
    customButtons,
    buttonsPosition = 'bottom'
}) => {
    // 从上下文中获取流式响应状态
    const { isReceivingStream, isPaused, toggleStreamPause } = useChatContext();

    // 生成默认按钮（向后兼容）
    const getDefaultButtons = (): ButtonConfig[] => {
        const buttons: ButtonConfig[] = [];

        // 暂时注释掉上传文件按钮
        // if (showFileUpload) {
        //     buttons.push({
        //         id: 'file-upload',
        //         label: '上传文件',
        //         title: '上传文件',
        //         icon: (
        //             <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
        //                 <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        //             </svg>
        //         ),
        //         onClick: () => {
        //             // 文件上传逻辑
        //             console.log('文件上传');
        //         }
        //     });
        // }

        // 暂时注释掉深度思考按钮
        // if (showDeepThinking) {
        //     buttons.push({
        //         id: 'deep-thinking',
        //         label: '深度思考',
        //         title: '深度思考',
        //         active: isDeepThinking,
        //         icon: (
        //             <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        //                 <path d="M15.5 8c.827 0 1.5-.673 1.5-1.5S16.327 5 15.5 5 14 5.673 14 6.5 14.673 8 15.5 8zm-7 0c.827 0 1.5-.673 1.5-1.5S9.327 5 8.5 5 7 5.673 7 6.5 7.673 8 8.5 8zm3.5 9.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 8.5 12 8.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-1c1.933 0 3.5-1.567 3.5-3.5S13.933 9.5 12 9.5 8.5 11.067 8.5 13s1.567 3.5 3.5 3.5z" />
        //                 <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 100-16 8 8 0 000 16z" />
        //             </svg>
        //         ),
        //         onClick: toggleDeepThinking
        //     });
        // }

        return buttons;
    };

    // 确定最终的按钮配置
    const finalTopButtons = topButtons.length > 0 ? topButtons :
        (buttonsPosition === 'top' || buttonsPosition === 'both') ? getDefaultButtons() : [];
    const finalBottomButtons = bottomButtons.length > 0 ? bottomButtons :
        (buttonsPosition === 'bottom' || buttonsPosition === 'both') ? getDefaultButtons() : [];

    // 处理发送按钮点击
    const handleSend = () => {
        if (inputValue.trim() && !disabled) {
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

    // 处理textarea变化和自动调整高度
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);

        // 自动调整文本区域的高度
        const textarea = e.target;
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
    };

    // 渲染按钮组
    const renderButtons = (buttons: ButtonConfig[]) => {
        if (buttons.length === 0) return null;

        return (
            <div className="chat-input-buttons">
                {buttons.map((button) => (
                    <button
                        key={button.id}
                        title={button.title || button.label}
                        className={`chat-input-btn ${button.active ? 'active' : ''}`}
                        onClick={button.onClick}
                        disabled={button.disabled || disabled}
                    >
                        {button.icon}
                        {button.label && <span>{button.label}</span>}
                    </button>
                ))}
            </div>
        );
    };

    // 渲染发送或暂停/继续按钮
    const renderSendOrPauseButton = () => {
        // 如果正在接收流式响应，则显示暂停/继续按钮
        if (isReceivingStream) {
            return (
                <button
                    className="chat-input-send-btn chat-input-pause-btn"
                    onClick={toggleStreamPause}
                    title={isPaused ? "继续" : "暂停"}
                >
                    {isPaused ? (
                        // 继续图标（播放按钮）
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    ) : (
                        // 暂停图标
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    )}
                </button>
            );
        }

        // 否则显示普通发送按钮
        return (
            <button
                className="chat-input-send-btn"
                onClick={handleSend}
                disabled={!inputValue.trim() || disabled}
                title="发送消息"
            >
                {/* 发送图标 - 纸飞机样式 */}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
            </button>
        );
    };

    return (
        <div className={`chat-input-box ${className}`}>
            {/* 顶部按钮 */}
            {finalTopButtons.length > 0 && (
                <div className="chat-input-buttons chat-input-buttons-top">
                    {renderButtons(finalTopButtons)}
                </div>
            )}

            {/* 自定义按钮（兼容性） */}
            {customButtons && (
                <div className="chat-input-buttons chat-input-buttons-top">
                    {customButtons}
                </div>
            )}

            {/* 输入区域 */}
            <div className="chat-input-wrapper">
                <textarea
                    className="chat-input-textarea"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isReceivingStream} // 流式响应时禁用输入
                    rows={1}
                    style={{ resize: 'none' }}
                />
                {/* 渲染发送或暂停/继续按钮 */}
                {renderSendOrPauseButton()}
            </div>

            {/* 底部按钮 */}
            {finalBottomButtons.length > 0 && (
                <div className="chat-input-buttons chat-input-buttons-bottom">
                    {renderButtons(finalBottomButtons)}
                </div>
            )}
        </div>
    );
};

export default ChatInputBox;
export type { ChatInputBoxProps, ButtonConfig };