/**
 * Markdown处理工具函数
 */

/**
 * 预处理LaTeX数学公式
 * 将特定格式的LaTeX标记转换为标准格式
 */
export const preprocessLaTeX = (text: string): string => {
    if (!text) return '';

    let processed = text;

    // 首先处理块级数学公式 $$...$$ (必须在行内公式之前处理)
    // 使用非贪婪匹配，避免跨越多个公式
    processed = processed.replace(/\$\$((?:(?!\$\$)[\s\S])*?)\$\$/g, '\\[$1\\]');

    // 然后处理行内数学公式 $...$
    // 使用非贪婪匹配，避免匹配到已经处理过的块级公式
    processed = processed.replace(/(?<!\\)\$([^$\n]+?)\$(?!\$)/g, '\\($1\\)');

    return processed;
};

/**
 * 替换think标签为section标签
 * 将 <think>...</think> 转换为可折叠的section
 */
export const replaceThinkToSection = (text: string): string => {
    if (!text) return '';

    return text.replace(
        /<think>([\s\S]*?)<\/think>/gi,
        '<details><summary>💭 思考过程</summary>\n\n$1\n\n</details>'
    );
};

/**
 * 替换旧版引用格式
 * 处理旧版本的引用标记格式
 */
export const replaceTextByOldReg = (text: string): string => {
    if (!text) return '';

    let processed = text;

    // 替换旧版引用格式 ##数字$$ 为新格式 ((数字))
    processed = processed.replace(/##(\d+)\$\$/g, '(($1))');

    // 替换旧版引用格式 [ref:数字] 为新格式 ((数字))
    processed = processed.replace(/\[ref:(\d+)\]/g, '(($1))');

    // 替换其他可能的旧格式
    processed = processed.replace(/\{ref:(\d+)\}/g, '(($1))');

    return processed;
};

/**
 * 清理Markdown内容
 * 移除不必要的空白和格式化内容
 */
export const cleanMarkdownContent = (text: string): string => {
    if (!text) return '';

    let cleaned = text;

    // 移除多余的空行（保留最多2个连续换行）
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 清理行尾空白
    cleaned = cleaned.replace(/[ \t]+$/gm, '');

    // 清理开头和结尾的空白
    cleaned = cleaned.trim();

    return cleaned;
};

/**
 * 提取引用索引
 * 从文本中提取所有的引用索引号
 */
export const extractReferenceIndices = (text: string): number[] => {
    if (!text) return [];

    const referenceRegex = /\(\((\d+)\)\)/g;
    const indices: number[] = [];
    let match;

    while ((match = referenceRegex.exec(text)) !== null) {
        const index = parseInt(match[1], 10);
        if (!indices.includes(index)) {
            indices.push(index);
        }
    }

    return indices.sort((a, b) => a - b);
};

/**
 * 检查是否包含数学公式
 * 检测文本中是否包含LaTeX数学公式
 */
export const containsMathFormula = (text: string): boolean => {
    if (!text) return false;

    // 检查行内公式
    if (/\\\([^)]+\\\)/.test(text)) return true;

    // 检查块级公式
    if (/\\\[[^\]]+\\\]/.test(text)) return true;

    // 检查原始$格式
    if (/\$[^$]+\$/.test(text)) return true;
    if (/\$\$[^$]+\$\$/.test(text)) return true;

    return false;
};

/**
 * 检查是否包含代码块
 * 检测文本中是否包含代码块
 */
export const containsCodeBlock = (text: string): boolean => {
    if (!text) return false;

    // 检查围栏代码块
    if (/```[\s\S]*?```/.test(text)) return true;

    // 检查缩进代码块
    if (/^    .+$/m.test(text)) return true;

    return false;
};

/**
 * 检查是否包含表格
 * 检测文本中是否包含Markdown表格
 */
export const containsTable = (text: string): boolean => {
    if (!text) return false;

    // 简单的表格检测：包含管道符和连字符的行
    const lines = text.split('\n');
    let hasTableHeader = false;
    let hasTableSeparator = false;

    for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i].trim();
        const nextLine = lines[i + 1].trim();

        // 检查表格头部（包含管道符）
        if (currentLine.includes('|') && currentLine.split('|').length >= 3) {
            hasTableHeader = true;

            // 检查分隔符行（包含连字符和管道符）
            if (nextLine.includes('|') && nextLine.includes('-')) {
                hasTableSeparator = true;
                break;
            }
        }
    }

    return hasTableHeader && hasTableSeparator;
};

/**
 * 获取内容统计信息
 * 返回内容的基本统计信息
 */
export const getContentStats = (text: string) => {
    if (!text) {
        return {
            characters: 0,
            words: 0,
            lines: 0,
            paragraphs: 0,
            references: 0,
            hasMath: false,
            hasCode: false,
            hasTable: false
        };
    }

    const lines = text.split('\n');
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const references = extractReferenceIndices(text);

    return {
        characters: text.length,
        words: words.length,
        lines: lines.length,
        paragraphs: paragraphs.length,
        references: references.length,
        hasMath: containsMathFormula(text),
        hasCode: containsCodeBlock(text),
        hasTable: containsTable(text)
    };
};

/**
 * 截断文本
 * 智能截断文本，保持Markdown格式的完整性
 */
export const truncateMarkdown = (text: string, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text;

    // 在单词边界截断
    let truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > maxLength * 0.8) {
        truncated = truncated.substring(0, lastSpaceIndex);
    }

    // 确保代码块和数学公式的完整性
    const openCodeBlocks = (truncated.match(/```/g) || []).length;
    const openMathBlocks = (truncated.match(/\\\[/g) || []).length;
    const closeMathBlocks = (truncated.match(/\\\]/g) || []).length;

    // 如果有未闭合的代码块，尝试找到合适的截断点
    if (openCodeBlocks % 2 !== 0) {
        const lastCodeBlockStart = truncated.lastIndexOf('```');
        if (lastCodeBlockStart > 0) {
            truncated = truncated.substring(0, lastCodeBlockStart);
        }
    }

    // 如果有未闭合的数学块，尝试找到合适的截断点
    if (openMathBlocks !== closeMathBlocks) {
        const lastMathBlockStart = truncated.lastIndexOf('\\[');
        if (lastMathBlockStart > 0) {
            truncated = truncated.substring(0, lastMathBlockStart);
        }
    }

    return truncated.trim() + '...';
};