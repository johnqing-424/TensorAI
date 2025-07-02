import React, { useMemo, useCallback } from 'react';
import { ChatMessage, Reference, ReferenceChunk } from '../../types';
import MarkdownRenderer from './MarkdownRenderer';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import './MessageContent.css'; // 添加CSS文件引用

interface MessageContentProps {
    message: ChatMessage;
    isTyping?: boolean;
    reference?: Reference;
    onDocumentClick?: (documentId: string, chunk: ReferenceChunk) => void;
}

/**
 * 消息内容组件 - 统一管理消息内容的渲染逻辑
 * 根据消息状态选择合适的渲染方式
 */
const MessageContent: React.FC<MessageContentProps> = ({
    message,
    isTyping = false,
    reference,
    onDocumentClick
}) => {
    const { content, isLoading, isError, role, completed } = message;

    // 确定当前消息的状态
    const messageState = useMemo(() => {
        // 临时调试日志 - 跟踪所有助手消息的状态
        if (role === 'assistant') {
            console.log('MessageContent组件渲染状态:', {
                role,
                isLoading,
                isError,
                isTyping,
                completed,
                content: content ? content.substring(0, 50) + '...' : '(空内容)',
                contentLength: content ? content.length : 0,
                isEmpty: !content || content === '',
                messageId: message.id,
                timestamp: message.timestamp,
                loadingCondition: isLoading && (!content || content === '...'),
                finalState: isError ? 'error' : (isLoading && (!content || content === '...')) ? 'loading' : (isTyping && role === 'assistant') ? 'typing' : 'normal'
            });
        }

        if (isError) {
            return 'error';
        }
        // 仅当消息为空且正在加载时显示加载状态
        // 当消息已有内容且仍在加载时，显示正常内容（流式显示）
        if (isLoading && (!content || content === '...')) {
            return 'loading';
        }
        if (isTyping && role === 'assistant') {
            return 'typing';
        }
        return 'normal';
    }, [isLoading, isError, isTyping, role, content]);

    // 渲染加载状态
    const renderLoading = useCallback(() => (
        <LoadingIndicator type="message" />
    ), []);

    // 渲染错误状态
    const renderError = useCallback(() => (
        <ErrorMessage
            message="很抱歉，发生了错误。请稍后再试或联系管理员。"
            type="message"
        />
    ), []);

    // 渲染参考文档列表
    const renderReferenceDocuments = useCallback(() => {
        // 只在有参考文档时显示
        if (!reference || !reference.doc_aggs || reference.doc_aggs.length === 0) {
            return null;
        }

        return (
            <div className="reference-documents">
                <div className="reference-title">参考文档：</div>
                <ul className="reference-list">
                    {reference.doc_aggs.map(doc => {
                        // 从文件名获取扩展名
                        const fileName = doc.doc_name;
                        const displayName = fileName.split('/').pop() || fileName;
                        const ext = fileName.split('.').pop()?.toLowerCase() || '';

                        // 根据文件类型设置图标
                        let docIcon = '📄';
                        if (ext === 'pdf') docIcon = '📕';
                        else if (ext === 'docx' || ext === 'doc') docIcon = '📘';
                        else if (ext === 'xlsx' || ext === 'xls') docIcon = '📗';
                        else if (ext === 'pptx' || ext === 'ppt') docIcon = '📙';

                        // 构建文档链接
                        const docUrl = doc.url || `http://192.168.1.131:9222/document/${doc.doc_id}?ext=${ext}&prefix=document`;

                        return (
                            <li key={doc.doc_id} className="reference-list-item">
                                <a
                                    href={docUrl}
                                    className="document-link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.open(docUrl, '_blank');
                                    }}
                                >
                                    <span className="document-icon">{docIcon}</span>
                                    <span className="document-name">{displayName}</span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }, [reference]);

    // 渲染正常内容
    const renderNormalContent = useCallback(() => {
        // 处理空内容的情况
        if (!content && !isTyping) {
            return (
                <div className="empty-message-content">
                    <span className="empty-text">[无内容]</span>
                </div>
            );
        }

        // 计算是否处于流式显示状态
        const isStreaming: boolean = Boolean(
            isTyping || (isLoading && content && content !== '...')
        );

        return (
            <>
                <MarkdownRenderer
                    content={content || ''}
                    isStreaming={isStreaming}
                    reference={reference}
                    onDocumentClick={onDocumentClick}
                />
                {/* 在内容下方显示参考文档链接 */}
                {renderReferenceDocuments()}
            </>
        );
    }, [content, isTyping, isLoading, reference, onDocumentClick, renderReferenceDocuments]);

    // 根据状态渲染对应内容
    const renderContent = useCallback(() => {
        switch (messageState) {
            case 'loading':
                return renderLoading();
            case 'error':
                return renderError();
            case 'typing':
            case 'normal':
            default:
                return renderNormalContent();
        }
    }, [messageState, renderLoading, renderError, renderNormalContent]);

    return (
        <div className={`message-content message-content--${messageState}`}>
            {renderContent()}
        </div>
    );
};

export default MessageContent;