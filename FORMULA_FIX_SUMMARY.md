# 数学公式渲染问题修复总结

## 问题描述
用户反馈在聊天界面中，数学公式显示为原始的 LaTeX 代码而不是渲染后的公式，例如：
- `\\text{Attention}(Q, K, V) = \\text{Softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V`
- `##数字$$` 格式的引用标记干扰了公式渲染

## 根本原因分析
1. **双重转义问题**：多个 `preprocessLaTeX` 函数实现不一致，导致公式被重复处理
2. **正则表达式缺陷**：原有的正则表达式无法正确处理复杂的嵌套公式
3. **引用格式冲突**：`##数字$$` 格式与数学公式的 `$$` 标记冲突
4. **处理顺序问题**：块级公式和行内公式的处理顺序不当

## 修复内容

### 1. 统一 preprocessLaTeX 函数实现
修复了以下文件中的 `preprocessLaTeX` 函数：
- `/src/utils/markdownUtils.ts`
- `/src/components/Chat/MarkdownContent.tsx`
- `/src/components/Chat/utils/markdownUtils.ts`

**修复前的问题代码**：
```javascript
// MarkdownContent.tsx 中的错误实现
const preprocessLaTeX = (text: string) => {
    return text
        .replace(/\$\$([^$]+)\$\$/g, '\n\n$$$$1$$\n\n')  // 错误：产生四个$符号
        .replace(/\$([^$]+)\$/g, '$$$1$$');              // 错误：产生三个$符号
};
```

**修复后的正确实现**：
```javascript
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
```

### 2. 修复引用格式处理
更新了 `replaceTextByOldReg` 函数，确保正确处理 `##数字$$` 格式：

**修复前**：
```javascript
const replaceTextByOldReg = (text: string) => {
    return text?.replace(oldReg, function (substring) {
        return `~~${substring.slice(2, -2)}==`;  // 可能误处理数学公式
    });
};
```

**修复后**：
```javascript
const replaceTextByOldReg = (text: string) => {
    if (!text) return text;
    // 只处理引用标记，避免干扰数学公式
    // 确保匹配的是引用格式 ##数字$$，而不是数学公式中的内容
    return text.replace(/##(\d+)\$\$/g, function (match, number) {
        return `~~${number}==`;
    });
};
```

### 3. 改进的正则表达式特性
- **非贪婪匹配**：使用 `*?` 避免跨越多个公式
- **负向后查找**：使用 `(?<!\\)` 避免匹配已转义的内容
- **负向前查找**：使用 `(?!\$)` 避免匹配块级公式的一部分
- **处理顺序**：先处理块级公式，再处理行内公式

## 技术细节

### KaTeX 渲染流程
1. **输入**：用户输入 `$E=mc^2$` 或 `$$E=mc^2$$`
2. **预处理**：`preprocessLaTeX` 转换为 `\(E=mc^2\)` 或 `\[E=mc^2\]`
3. **Markdown 解析**：`remark-math` 插件识别数学标记
4. **渲染**：`rehype-katex` 插件生成 HTML
5. **样式**：`katex.min.css` 提供样式

### 依赖库配置
项目正确配置了以下依赖：
- `katex`: ^0.16.22
- `react-markdown`: ^10.1.0
- `rehype-katex`: ^7.0.0
- `remark-math`: ^6.0.0

## 测试验证
创建了测试文件 `test-formula.md` 包含：
- 行内公式测试
- 块级公式测试
- 引用标记测试
- 混合内容测试

## 预期效果
修复后，以下内容应该正确渲染：
- `$E = mc^2$` → 渲染为行内公式
- `$$\text{Attention}(Q, K, V) = \text{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$` → 渲染为块级公式
- `##1$$` → 转换为引用标记 `((1))`
- 复杂的多行公式和嵌套公式都能正确处理

## 注意事项
1. 需要重启开发服务器以使更改生效
2. 清除浏览器缓存以确保加载最新的 JavaScript 代码
3. 确保网络连接正常，以便加载 KaTeX 字体文件