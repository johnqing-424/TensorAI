/**
 * Markdown 处理工具函数
 */

/**
 * 预处理 LaTeX 数学公式
 * 将 $...$ 和 $$...$$ 格式转换为标准的 LaTeX 格式
 */
export const preprocessLaTeX = (content: string): string => {
    if (!content) return '';

    let processed = content;

    // 首先处理块级数学公式 $$...$$ (必须在行内公式之前处理)
    // 使用非贪婪匹配，避免跨越多个公式
    processed = processed.replace(/\$\$((?:(?!\$\$)[\s\S])*?)\$\$/g, '\\[$1\\]');

    // 然后处理行内数学公式 $...$
    // 使用非贪婪匹配，避免匹配到已经处理过的块级公式
    processed = processed.replace(/(?<!\\)\$([^$\n]+?)\$(?!\$)/g, '\\($1\\)');

    return processed;
};

/**
 * 将 <think> 标签替换为可折叠的 <section>
 */
export const replaceThinkToSection = (content: string): string => {
    if (!content) return '';

    return content.replace(
        /<think>([\s\S]*?)<\/think>/g,
        '<details><summary>思考过程</summary>\n\n$1\n\n</details>'
    );
};

/**
 * 替换旧版引用格式
 * 处理旧版本的引用标记格式
 */
export const replaceTextByOldReg = (content: string): string => {
    if (!content) return '';

    let processed = content;

    // 替换旧版引用格式 ##数字$$ 为新格式 ((数字))
    processed = processed.replace(/##(\d+)\$\$/g, '(($1))');

    // 替换旧版引用格式 [ref:数字] 为新格式 ((数字))
    processed = processed.replace(/\[ref:(\d+)\]/g, '(($1))');

    // 替换其他可能的旧格式
    processed = processed.replace(/\{ref:(\d+)\}/g, '(($1))');

    return processed;
};

/**
 * 清理 Markdown 内容
 * 移除多余的空行和格式化内容
 */
export const cleanMarkdownContent = (content: string): string => {
    if (!content) return '';

    return content
        .replace(/\n{3,}/g, '\n\n') // 移除多余的空行
        .replace(/^\s+|\s+$/g, '') // 移除首尾空白
        .replace(/\r\n/g, '\n'); // 统一换行符
};

/**
 * 从内容中提取引用索引
 */
export const extractReferenceIndices = (content: string): number[] => {
    if (!content) return [];

    const matches = content.match(/\[(\d+)\]/g);
    if (!matches) return [];

    return matches
        .map(match => parseInt(match.replace(/[\[\]]/g, ''), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);
};

/**
 * 检查内容是否包含数学公式
 */
export const containsMathFormula = (content: string): boolean => {
    if (!content) return false;

    return /\$[^$]+\$|\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/.test(content);
};

/**
 * 检查内容是否包含代码块
 */
export const containsCodeBlock = (content: string): boolean => {
    if (!content) return false;

    return /```[\s\S]*?```|`[^`]+`/.test(content);
};

/**
 * 检查内容是否包含表格
 */
export const containsTable = (content: string): boolean => {
    if (!content) return false;

    return /\|[^\n]*\|/.test(content);
};

/**
 * 获取内容统计信息
 */
export const getContentStats = (content: string) => {
    if (!content) {
        return {
            characters: 0,
            words: 0,
            lines: 0,
            hasMath: false,
            hasCode: false,
            hasTable: false,
            references: []
        };
    }

    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(word => word.length > 0);

    return {
        characters: content.length,
        words: words.length,
        lines: lines.length,
        hasMath: containsMathFormula(content),
        hasCode: containsCodeBlock(content),
        hasTable: containsTable(content),
        references: extractReferenceIndices(content)
    };
};

/**
 * 智能截断文本，保持 Markdown 格式完整性
 */
export const truncateMarkdown = (content: string, maxLength: number): string => {
    if (!content || content.length <= maxLength) return content;

    // 在合适的位置截断，避免破坏 Markdown 格式
    const truncated = content.substring(0, maxLength);

    // 找到最后一个完整的段落或句子
    const lastParagraph = truncated.lastIndexOf('\n\n');
    const lastSentence = truncated.lastIndexOf('。');
    const lastPeriod = truncated.lastIndexOf('.');

    const cutPoint = Math.max(lastParagraph, lastSentence, lastPeriod);

    if (cutPoint > maxLength * 0.8) {
        return truncated.substring(0, cutPoint + 1) + '...';
    }

    return truncated + '...';
};