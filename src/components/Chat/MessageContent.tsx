import React, { useMemo, useCallback, useRef } from 'react';
import { ChatMessage, Reference, ReferenceChunk } from '../../types';
import MarkdownRenderer from './MarkdownRenderer';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import { List, Typography, Space, Divider, Flex } from 'antd';
import { FileOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FilePptOutlined, FileImageOutlined, FileTextOutlined } from '@ant-design/icons';
import './MessageContent.css'; // 添加引用CSS文件

const { Text, Link } = Typography;

interface MessageContentProps {
    message: ChatMessage;
    isTyping?: boolean;
    onDocumentClick?: (documentId: string, chunk: ReferenceChunk) => void;
}

/**
 * 消息内容组件 - 统一管理消息内容的渲染逻辑
 * 根据消息状态选择合适的渲染方式
 */
const MessageContent: React.FC<MessageContentProps> = ({
    message,
    isTyping = false,
    onDocumentClick
}) => {
    const { content, isLoading, isError, role, completed, reference } = message;
    const contentRef = useRef<HTMLDivElement>(null);

    // 确定当前消息的状态
    const messageState = useMemo(() => {
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

    // 获取文件图标
    const getFileIcon = useCallback((extension: string) => {
        switch (extension.toLowerCase()) {
            case 'pdf':
                return <FilePdfOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />;
            case 'doc':
            case 'docx':
                return <FileWordOutlined style={{ fontSize: '16px', color: '#1890ff' }} />;
            case 'xls':
            case 'xlsx':
                return <FileExcelOutlined style={{ fontSize: '16px', color: '#52c41a' }} />;
            case 'ppt':
            case 'pptx':
                return <FilePptOutlined style={{ fontSize: '16px', color: '#fa8c16' }} />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
            case 'webp':
                return <FileImageOutlined style={{ fontSize: '16px', color: '#13c2c2' }} />;
            default:
                return <FileOutlined style={{ fontSize: '16px', color: '#8c8c8c' }} />;
        }
    }, []);

    // 渲染参考文档列表 - 独立于消息气泡
    const renderReferenceDocuments = useCallback(() => {
        // 只有助手消息且有引用数据时才显示
        const chunks = reference?.chunks || [];

        if (role !== 'assistant' || !chunks.length) {
            return null;
        }

        // withref分支：显示参考文档
        return (
            <div className="reference-documents">
                <div className="reference-title">
                    <FileTextOutlined className="reference-title-icon" />
                    <span>参考文档</span>
                </div>

                <List
                    size="small"
                    dataSource={chunks}
                    renderItem={(chunk: ReferenceChunk) => {
                        // 确保chunk是有效对象
                        if (!chunk || !chunk.document_name) {
                            if (process.env.NODE_ENV === 'development') {
                                console.warn('遇到无效的文档引用项:', chunk);
                            }
                            return null;
                        }

                        // 从文件名获取扩展名
                        const fileName = chunk.document_name;
                        const displayName = fileName.split('/').pop() || fileName;
                        const ext = fileName.split('.').pop()?.toLowerCase() || '';

                        return (
                            <List.Item className="reference-list-item">
                                <Link
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (onDocumentClick) {
                                            onDocumentClick(chunk.document_id, chunk);
                                        }
                                    }}
                                >
                                    <Space>
                                        {getFileIcon(ext)}
                                        <Text ellipsis style={{ maxWidth: 'calc(100% - 24px)' }} title={displayName}>
                                            {displayName}
                                        </Text>
                                    </Space>
                                </Link>
                            </List.Item>
                        );
                    }}
                />
            </div>
        );
    }, [reference, role, getFileIcon, onDocumentClick]);

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
            <MarkdownRenderer
                content={content || ''}
                isStreaming={isStreaming}
                reference={reference}
                onDocumentClick={onDocumentClick}
            />
        );
    }, [content, isTyping, isLoading, reference, onDocumentClick]);

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

    // 直接返回包含消息内容和参考文档列表的片段
    return (
        <>
            <div className={`message-content message-content--${messageState}`} ref={contentRef}>
                {renderContent()}
            </div>
            {/* 参考文档列表独立于消息气泡，并根据消息完成状态渲染 */}
            {renderReferenceDocuments()}
        </>
    );
};

export default MessageContent;