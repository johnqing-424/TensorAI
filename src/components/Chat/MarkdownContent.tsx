import React, { useCallback, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { visitParents } from 'unist-util-visit-parents';
import reactStringReplace from 'react-string-replace';
import classNames from 'classnames';
import { Button, Flex, Popover } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import DOMPurify from 'dompurify';
import { useChatContext } from '../../context/ChatContext';
import { ReferenceChunk, IReferenceChunk } from '../../types';
import { useDocumentThumbnails } from '../../hooks/useDocumentThumbnails';
import { getFileExtension, showImage } from './utils/fileUtils';
import { preprocessLaTeX, replaceThinkToSection } from '../../utils/chatUtils';
import { replaceTextByOldReg } from '../../utils/markdownUtils';
import { pipe } from 'lodash/fp';
import 'katex/dist/katex.min.css';
import './MarkdownContent.css';

// RAGFlow原生引用格式的正则表达式
const reg = /(~{2}\d+={2})/g; // 匹配 ~~数字== 格式

// 提取引用索引的函数
const getChunkIndex = (match: string): number => {
    return Number(match.slice(2, -2));
};

// 工具函数
const getExtension = (filename: string = '') => {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
};

// preprocessLaTeX 函数已移至 utils/markdownUtils.ts 中统一管理

// replaceThinkToSection 函数已移至 utils/markdownUtils.ts 中统一管理

// showImage函数已从utils/fileUtils导入

// replaceTextByOldReg 函数已移至 utils/markdownUtils.ts 中统一管理

// 文件图标组件
const FileIcon: React.FC<{ extension: string }> = ({ extension }) => {
    const getIconPath = (ext: string) => {
        const iconMap: { [key: string]: string } = {
            pdf: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
            doc: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
            docx: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
            txt: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
            default: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z'
        };
        return iconMap[ext] || iconMap.default;
    };

    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d={getIconPath(extension)} />
        </svg>
    );
};

// 图片组件
const Image: React.FC<{ id?: string; className?: string; onClick?: () => void }> = ({
    id,
    className,
    onClick
}) => {
    if (!id) return null;

    // 根据实际的API端点调整图片URL
    const imageUrl = `/api/v1/document/image/${id}`;

    return (
        <img
            src={imageUrl}
            alt="Reference Image"
            className={className}
            onClick={onClick}
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                console.warn(`Failed to load image with id: ${id}`);
            }}
            loading="lazy"
        />
    );
};

// 带悬停预览的图片组件
const ImageWithPopover: React.FC<{ id: string }> = ({ id }) => {
    return (
        <Popover
            placement="left"
            content={<Image id={id} className="ragflow-reference-image-preview" />}
            trigger="hover"
            mouseEnterDelay={0.3}
            mouseLeaveDelay={0.1}
            overlayClassName="ragflow-image-popover"
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            destroyTooltipOnHide
            fresh
        >
            <Image id={id} className="ragflow-reference-chunk-image" />
        </Popover>
    );
};

interface MarkdownContentProps {
    content: string;
    loading?: boolean;
    clickDocumentButton?: (documentId: string, chunk: ReferenceChunk) => void;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({
    content,
    loading,
    clickDocumentButton
}) => {
    const { reference } = useChatContext();
    
    // 获取文档缩略图
    const documentIds = useMemo(() => {
        if (!reference?.chunks) return [];
        return reference.chunks.map(chunk => chunk.document_id).filter(Boolean);
    }, [reference]);
    
    const { thumbnails } = useDocumentThumbnails(documentIds);

    // 处理内容的函数
    const processedContent = useMemo(() => {
        // 使用RAGFlow的处理流程
        return pipe(
            preprocessLaTeX,
            replaceThinkToSection,
            replaceTextByOldReg
        )(content);
    }, [content]);

    // 处理文档按钮点击
    const handleDocumentButtonClick = useCallback((documentId: string, chunk: IReferenceChunk) => {
        // 转换为ReferenceChunk类型
        const referenceChunk: ReferenceChunk = {
            ...chunk,
            content: chunk.content || null,
            image_id: chunk.image_id || '',
            similarity: chunk.term_similarity || chunk.vector_similarity || 0,
            vector_similarity: chunk.vector_similarity || 0,
            term_similarity: chunk.term_similarity || 0,
            positions: [] // IReferenceChunk的positions是string[]，ReferenceChunk需要number[]
        };
        clickDocumentButton?.(documentId, referenceChunk);
    }, [clickDocumentButton]);

    // 获取引用信息
    const getReferenceInfo = useCallback((chunkIndex: number) => {
        if (!reference?.chunks || chunkIndex < 0 || chunkIndex >= reference.chunks.length) {
            return null;
        }
        return reference.chunks[chunkIndex];
    }, [reference]);

    // 获取Popover内容
    const getPopoverContent = useCallback((chunkIndex: number) => {
        const chunk = getReferenceInfo(chunkIndex);
        if (!chunk) return null;

        const isImage = chunk.image_id && showImage(chunk.document_name);
        const thumbnail = thumbnails[chunk.document_id];

        return (
            <div className="referencePopoverWrapper">
                <Flex gap={8} align="flex-start">
                    {isImage ? (
                        <img
                            src={`/api/document/image/${chunk.image_id}`}
                            alt={chunk.document_name}
                            className="referenceChunkImage"
                        />
                    ) : (
                        thumbnail && (
                            <img
                                src={thumbnail}
                                alt={chunk.document_name}
                                className="fileThumbnail"
                            />
                        )
                    )}
                    <Flex vertical gap={8} flex={1}>
                        <Button
                            type="link"
                            className="documentLink"
                            onClick={() => handleDocumentButtonClick(chunk.document_id, chunk)}
                        >
                            {chunk.document_name}
                        </Button>
                        {chunk.content && (
                            <div 
                                className="chunkContentText"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(chunk.content)
                                }}
                            />
                        )}
                    </Flex>
                </Flex>
            </div>
        );
    }, [getReferenceInfo, thumbnails, handleDocumentButtonClick]);

    // 创建引用标记处理函数
    const handleReferenceClick = useCallback((index: number, event: MouseEvent) => {
        if (!reference || !reference.chunks || index >= reference.chunks.length) return;

        const target = event.currentTarget as HTMLElement;
        if (!target) return;

        const rect = target.getBoundingClientRect();

        // 显示引用弹窗逻辑
        console.log('Reference clicked:', index, {
            x: rect.left + rect.width / 2,
            y: rect.top - 10
        });
    }, [reference]);

    // 处理关闭弹窗
    const handlePopoverClose = useCallback(() => {
        // 弹窗关闭逻辑
        console.log('Popover closed');
    }, []);

    // 处理文档点击事件
    const handleDocumentClick = useCallback((documentId: string, chunk: any) => {
        if (clickDocumentButton) {
            clickDocumentButton(documentId, chunk);
        }
    }, [clickDocumentButton]);

    // 格式化代码渲染
    const formatCode = useCallback((code: string, language: string) => {
        try {
            return language ? (
                <SyntaxHighlighter language={language} style={tomorrow as any}>
                    {code}
                </SyntaxHighlighter>
            ) : (
                <code className="language-text">{code}</code>
            );
        } catch (error) {
            return <code className="language-text">{code}</code>;
        }
    }, []);

    // 添加rehypeWrapReference函数
    const rehypeWrapReference = () => {
        return function wrapTextTransform(tree: any) {
            visitParents(tree, 'text', (node, ancestors) => {
                const latestAncestor = ancestors.at(-1);
                if (
                    latestAncestor.tagName !== 'custom-typography' &&
                    latestAncestor.tagName !== 'code'
                ) {
                    node.type = 'element';
                    node.tagName = 'custom-typography';
                    node.properties = {};
                    node.children = [{ type: 'text', value: node.value }];
                }
            });
        };
    };

    // RAGFlow风格的引用渲染函数 - 返回HTML字符串
    const renderReferenceAsHTML = useCallback((text: string): string => {
        if (!reference?.chunks) {
            return text;
        }

        try {
            return text.replace(reg, (match) => {
                const chunkIndex = getChunkIndex(match);
                const chunk = getReferenceInfo(chunkIndex);
                
                if (!chunk) {
                    return match; // 如果找不到对应的chunk，返回原文
                }

                const isImage = chunk.image_id && showImage(chunk.document_name);

                if (isImage) {
                    // 图片引用显示为图片
                    return `<img src="/api/document/image/${chunk.image_id}" alt="${chunk.document_name}" class="referenceInnerChunkImage" style="max-width: 100px; max-height: 100px; cursor: pointer;" />`;
                } else {
                    // 文档引用显示为链接
                    return `<span class="ragflow-reference" data-reference="${chunkIndex}" style="color: #1890ff; cursor: pointer; text-decoration: underline;">[${chunkIndex + 1}]</span>`;
                }
            });
        } catch (error) {
            console.error('Error in renderReferenceAsHTML:', error);
            return text;
        }
    }, [reference, getReferenceInfo]);

    // RAGFlow风格的引用渲染函数 - 返回ReactNode
    const renderReference = useCallback((text: string): React.ReactNode => {
        if (!reference?.chunks) {
            return text;
        }

        try {
            // 处理引用标记 ~~数字==
            return reactStringReplace(text, reg, (match, i) => {
                const chunkIndex = getChunkIndex(match);
                const chunk = getReferenceInfo(chunkIndex);
                
                if (!chunk) {
                    return match; // 如果找不到对应的chunk，返回原文
                }

                const isImage = chunk.image_id && showImage(chunk.document_name);

                if (isImage) {
                    // 图片引用显示为图片预览
                    return (
                        <Popover
                            key={`ref-${i}`}
                            content={
                                <img
                                    src={`/api/document/image/${chunk.image_id}`}
                                    alt={chunk.document_name}
                                    className="referenceImagePreview"
                                />
                            }
                            title={null}
                            trigger="hover"
                            placement="top"
                        >
                            <img
                                src={`/api/document/image/${chunk.image_id}`}
                                alt={chunk.document_name}
                                className="referenceInnerChunkImage"
                            />
                        </Popover>
                    );
                } else {
                    // 文档引用显示为信息图标
                    return (
                        <Popover
                            key={`ref-${i}`}
                            content={getPopoverContent(chunkIndex)}
                            title={null}
                            trigger="hover"
                            placement="top"
                            overlayClassName="reference-popover"
                        >
                            <InfoCircleOutlined className="referenceIcon" />
                        </Popover>
                    );
                }
            });
        } catch (error) {
            console.error('Error in renderReference:', error);
            return text;
        }
    }, [reference, getReferenceInfo, getPopoverContent]);



    // 处理空内容情况
    if (!processedContent) {
        return loading ? (
            <div className="markdown-loading">
                <span className="cursor"></span>
            </div>
        ) : null;
    }

    return (
        <div className="ragflow-markdown-content">
            <div
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(renderReferenceAsHTML(processedContent))
                }}
            />
            {/* 备用Markdown渲染器 */}
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[
                    rehypeKatex,
                    rehypeRaw,
                    rehypeWrapReference
                ]}
                components={{
                    // 自定义代码块渲染
                    code(props: any) {
                        const { node, inline, className, children, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={tomorrow as any}
                                language={match[1]}
                                PreTag="div"
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={className} {...rest}>
                                {children}
                            </code>
                        );
                    },
                    // 自定义引用标记处理
                    span: ({ node, className, children, ...props }) => {
                        if (className?.includes('ragflow-reference')) {
                            const referenceText = (props as any)['data-reference'] as string;
                            if (referenceText) {
                                const result = renderReference(referenceText);
                                // 确保返回的是有效的React元素
                                if (React.isValidElement(result)) {
                                    return result;
                                }
                                // 如果不是有效元素，返回原始文本
                                return <span className={className} {...props}>{referenceText}</span>;
                            }
                        }
                        return <span className={className} {...props}>{children}</span>;
                    }
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownContent;