// Chat组件统一导出
export { default as ChatMessage } from './ChatMessage';
export { default as MessageContent } from './MessageContent';
export { default as MarkdownRenderer } from './MarkdownRenderer';
export { default as LoadingIndicator } from './LoadingIndicator';
export { default as ErrorMessage } from './ErrorMessage';
export { default as ReferencePopover } from './ReferencePopover';

// 工具函数导出
export * from './utils/markdownUtils';
export * from './utils/fileUtils';

// 保持向后兼容
export { default as MarkdownContent } from './MarkdownContent';
export { default as ChatHistory } from './ChatHistory';