import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Reference, ReferenceChunk } from '../../types';
import { useDocumentThumbnails } from '../../hooks/useDocumentThumbnails';
import { Button, Flex, Popover } from 'antd';
import './MarkdownContent.css';
/**
 * RAGFlow风格的Markdown内容渲染组件
 * 支持引用悬停、图片预览、文档链接等功能
 * 
 * 功能特性：
 * - 引用标记识别和悬停显示 (~~数字==)
 * - 图片预览和悬停放大
 * - 文档链接和缩略图显示
 * - 光标动画效果 (~~数字$$)
 * - LaTeX数学公式渲染
 * - 代码语法高亮
 * 
 * 依赖要求：
 * - @ant-design/icons
 * - react-markdown
 * - react-string-replace
 * - react-syntax-highlighter
 * - rehype-katex, rehype-raw
 * - remark-gfm, remark-math
 * - unist-util-visit-parents
 * - dompurify
 * - classnames
 * - lodash/fp
 */
import { InfoCircleOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import reactStringReplace from 'react-string-replace';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { visitParents } from 'unist-util-visit-parents';
import DOMPurify from 'dompurify';
import classNames from 'classnames';
import { pipe } from 'lodash/fp';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

import 'katex/dist/katex.min.css';

const reg = /(~{2}\d+={2})/g;
const oldReg = /(#{2}\d+\${2})/g;
const curReg = /(~{2}\d+\${2})/g;

const getChunkIndex = (match: string) => {
    const index = Number(match.slice(2, -2));
    console.log(`getChunkIndex: 原始匹配="${match}", 提取索引=${index}`);
    // 如果引用是从1开始的，需要减1转换为数组索引
    return index - 1;
};
const getCursorIndex = (match: string) => Number(match.slice(2, -2));

// 工具函数
const getExtension = (filename: string = '') => {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
};

const preprocessLaTeX = (text: string) => {
    return text
        .replace(/\$\$([^$]+)\$\$/g, '\n\n$$$$1$$\n\n')
        .replace(/\$([^$]+)\$/g, '$$$1$$');
};

const replaceThinkToSection = (text: string) => {
    return text.replace(/<think>([\s\S]*?)<\/think>/g, '<section class="think">$1</section>');
};

const showImage = (docType: any) => {
    // 确保docType是字符串类型，如果不是则转换为空字符串
    const docTypeStr = typeof docType === 'string' ? docType : '';
    return ['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(docTypeStr.toLowerCase());
};

// To be compatible with the old index matching mode
const replaceTextByOldReg = (text: string) => {
    return text?.replace(oldReg, function (substring) {
        return `~~${substring.slice(2, -2)}==`;
    });
};

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
    loading: boolean;
    reference: Reference;
    clickDocumentButton?: (documentId: string, chunk: ReferenceChunk) => void;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({
    reference,
    clickDocumentButton,
    content,
    loading
}) => {
    const [showPopover, setShowPopover] = useState<{
        visible: boolean;
        index: number | null;
        position: { top: number; left: number } | null;
    }>({
        visible: false,
        index: null,
        position: null,
    });

    // 添加引用标记正则表达式
    const reg = /\(\((\d+)\)\)/g;
    const curReg = /\[\[(\d+)\]\]/g;

    // 添加调试日志
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            // 只在内容确实应该存在但为空时才警告（避免流式加载时的正常空状态）
            if (!content && content !== undefined && content !== '') {
                console.warn("MarkdownContent: 内容异常为空");
            } else if (content && content.length > 1000) {
                console.log("MarkdownContent: 长内容渲染，长度 =", content.length);
            }

            if (reference && reference.chunks && reference.chunks.length > 0) {
                console.log("MarkdownContent: 包含引用，共", reference.chunks.length, "个片段");
            }
        }
    }, [content?.length, reference?.chunks?.length]); // 只监听长度变化，减少重渲染

    // 提前声明所需的文档ID，即使reference可能为空
    const documentIds = useMemo(() => {
        if (reference && reference.chunks) {
            return Array.from(new Set(reference.chunks.map(chunk => chunk.document_id)));
        }
        return [];
    }, [reference]);

    // 无条件使用Hook
    const documentThumbnails = useDocumentThumbnails(documentIds);

    // 预处理引用内容
    const processedContent = useMemo(() => {
        if (!content) return '';
        let processedText = content;
        // 处理LaTeX
        processedText = preprocessLaTeX(processedText);
        // 替换think标签
        processedText = replaceThinkToSection(processedText);
        // 替换旧版引用
        processedText = replaceTextByOldReg(processedText);
        return processedText;
    }, [content]);

    // 创建引用标记处理函数
    const handleReferenceClick = useCallback((index: number, event: MouseEvent) => {
        if (!reference || !reference.chunks || index >= reference.chunks.length) return;

        const target = event.currentTarget as HTMLElement;
        if (!target) return;

        const rect = target.getBoundingClientRect();

        setShowPopover({
            visible: true,
            index,
            position: {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            }
        });
    }, [reference]);

    // 处理关闭弹窗
    const handlePopoverClose = useCallback(() => {
        setShowPopover({
            visible: false,
            index: null,
            position: null
        });
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
                <SyntaxHighlighter language={language} style={vs}>
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

    // 添加renderReference函数
    const renderReference = useCallback((text: string) => {
        // 基本实现，用于传递给rehype插件
        let replacedText = reactStringReplace(text, reg, (match, i) => {
            const index = parseInt(match, 10);
            return (
                <span
                    key={i}
                    className="ragflow-reference-icon"
                    onClick={(e) => handleReferenceClick(index, e as any)}
                >
                    📄
                </span>
            );
        });

        // 处理光标标记
        replacedText = reactStringReplace(replacedText, curReg, (match, i) => (
            <span className="ragflow-cursor" key={i}></span>
        ));

        return replacedText;
    }, [handleReferenceClick]);

    const renderReferencePopover = () => {
        if (!showPopover.visible || showPopover.index === null || !reference || !reference.chunks) {
            return null;
        }

        const chunk = reference.chunks[showPopover.index];
        if (!chunk) return null;

        return (
            <Popover
                open={showPopover.visible}
                title={`引用: ${chunk.document_name || '未知文档'}`}
                content={
                    <div className="ragflow-reference-popover-wrapper">
                        {chunk.doc_type && showImage(chunk.doc_type) ? (
                            <div className="ragflow-reference-chunk-image">
                                <ImageWithPopover id={chunk.image_id} />
                                <div
                                    className="ragflow-document-link"
                                    onClick={() => handleDocumentClick(chunk.document_id, chunk)}
                                >
                                    查看原文
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="ragflow-chunk-content-text">
                                    {chunk.content || '内容为空'}
                                </div>
                                <div
                                    className="ragflow-document-link"
                                    onClick={() => handleDocumentClick(chunk.document_id, chunk)}
                                >
                                    查看原文
                                </div>
                            </>
                        )}
                    </div>
                }
                trigger="click"
                placement="top"
                onOpenChange={(visible) => {
                    if (!visible) handlePopoverClose();
                }}
                overlayClassName="ragflow-reference-popover"
                getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
            >
                <div style={{ position: 'fixed', left: showPopover.position?.left, top: showPopover.position?.top }}>
                    <span className="ragflow-reference-icon">📄</span>
                </div>
            </Popover>
        );
    };

    // 处理空内容情况
    if (!content && !loading) {
        return <div className="empty-content">[无内容]</div>;
    }

    return (
        <div className="ragflow-markdown-content-wrapper">
            <ReactMarkdown
                rehypePlugins={[rehypeWrapReference, rehypeKatex, rehypeRaw]}
                remarkPlugins={[remarkGfm, remarkMath]}
                components={{
                    'custom-typography': ({ children }: { children: string }) =>
                        renderReference(children),
                    code(props: any) {
                        const { children, className, node, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || '');
                        return match ? (
                            <SyntaxHighlighter
                                {...rest}
                                PreTag="div"
                                language={match[1]}
                                wrapLongLines
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code {...rest} className={classNames(className, 'text-wrap')}>
                                {children}
                            </code>
                        );
                    },
                } as any}
            >
                {processedContent}
            </ReactMarkdown>
            {renderReferencePopover()}
        </div>
    );
};

export default MarkdownContent;