/**
 * 格式化日期时间
 * @param dateStr ISO日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDateTime = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateStr || '未知时间';
    }
};

/**
 * 截断文本
 * @param text 原文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

/**
 * 生成随机ID
 * @returns 随机ID字符串
 */
export const generateRandomId = (): string => {
    return Math.random().toString(36).substring(2, 15);
}; 