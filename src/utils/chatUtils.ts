import { Message } from '../types';

/**
 * 格式化消息时间戳
 */
export const formatMessageTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 小于1分钟
    if (diff < 60000) {
        return '刚刚';
    }

    // 小于1小时
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
    }

    // 小于24小时
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
    }

    // 超过24小时，显示具体日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();

    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

/**
 * 生成唯一的消息ID
 */
export const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 检查消息是否为空
 */
export const isEmptyMessage = (message: Message): boolean => {
    return !message.content || message.content.trim().length === 0;
};

/**
 * 截断长消息内容
 */
export const truncateMessage = (content: string, maxLength: number = 100): string => {
    if (content.length <= maxLength) {
        return content;
    }
    return content.substring(0, maxLength) + '...';
};

/**
 * 清理消息内容中的特殊字符
 */
export const sanitizeMessageContent = (content: string): string => {
    // 移除潜在的XSS攻击字符
    return content
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

/**
 * RAGFlow风格的LaTeX预处理
 */
export const preprocessLaTeX = (text: string): string => {
    // 处理行内LaTeX公式
    text = text.replace(/\$([^$]+)\$/g, '\\($1\\)');
    // 处理块级LaTeX公式
    text = text.replace(/\$\$([^$]+)\$\$/g, '\\[$1\\]');
    return text;
};

/**
 * 将think标签替换为section
 */
export const replaceThinkToSection = (text: string): string => {
    return text
        .replace(/<think>/g, '<section class="think">')
        .replace(/<\/think>/g, '</section>');
};

/**
 * 兼容旧版引用格式的转换函数
 */
export const replaceTextByOldReg = (text: string): string => {
    // 将 ##数字$$ 格式转换为 ~~数字== 格式
    return text.replace(/(#{2}\d+\${2})/g, (match) => {
        const number = match.slice(2, -2);
        return `~~${number}==`;
    });
};

/**
 * 获取会话ID
 */
export const getConversationId = (): string => {
    return sessionStorage.getItem('conversationId') || '';
};

/**
 * 设置会话ID
 */
export const setConversationId = (id: string): void => {
    sessionStorage.setItem('conversationId', id);
};