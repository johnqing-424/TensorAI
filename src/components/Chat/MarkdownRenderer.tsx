import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { visitParents } from 'unist-util-visit-parents';
import reactStringReplace from 'react-string-replace';
import classNames from 'classnames';
import { Reference, ReferenceChunk } from '../../types';
import ReferencePopover from './ReferencePopover';
import { useDocumentThumbnails } from '../../hooks/useDocumentThumbnails';
import {
    preprocessLaTeX,
    replaceThinkToSection,
    replaceTextByOldReg
} from '../../utils/markdownUtils';
import { InfoCircleOutlined } from '@ant-design/icons';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
    reference?: Reference;
    onDocumentClick?: (documentId: string, chunk: ReferenceChunk) => void;
}

// 定义引用标记正则表达式 - 使用和ragflow原生相同的格式
const reg = /(~{2}\d+={2})/g;

// 从引用标记中提取索引数字
const getChunkIndex = (match: string): number => Number(match.slice(2, -2));

// 添加基础URL常量
const API_BASE_URL = 'http://123.207.100.71:5007';

// 修改图片组件，使用正确的基础URL
const Image: React.FC<{ id?: string; className?: string; onClick?: () => void }> = ({
    id,
    className,
    onClick
}) => {
    if (!id) return null;

    // 使用与文档链接相同的基础URL构建图片URL
    const imageUrl = `${API_BASE_URL}/v1/document/image/${id}`;

    return (
        <img
            src={imageUrl}
            alt="Reference Image"
            className={className}
            onClick={onClick}
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // 减少日志输出，只在开发环境输出
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`Failed to load image with id: ${id}`);
                }
                // 可以在这里添加一个小图标或文本提示图片加载失败
                const parent = target.parentElement;
                if (parent) {
                    const errorSpan = document.createElement('span');
                    errorSpan.className = 'image-load-error';
                    errorSpan.title = '图片加载失败';
                    errorSpan.textContent = '📷';
                    parent.appendChild(errorSpan);
                }
            }}
            loading="lazy"
        />
    );
};

/**
 * Markdown渲染器组件 - 负责渲染Markdown内容和处理引用
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    isStreaming = false,
    reference,
    onDocumentClick
}) => {
    const cursorRegex = /\[\[(\d+)\]\]/g;

    // 获取文档ID列表
    const documentIds = useMemo(() => {
        if (!reference?.chunks) return [];
        return Array.from(new Set(reference.chunks.map(chunk => chunk.document_id)));
    }, [reference]);

    // 获取文档缩略图
    const { thumbnails: fileThumbnails } = useDocumentThumbnails(documentIds);

    // 预处理内容
    const processedContent = useMemo(() => {
        if (!content) return '';
        let processed = content;

        // 首先替换旧版引用格式为ragflow原生格式
        processed = replaceTextByOldReg(processed);

        // 应用各种预处理
        processed = preprocessLaTeX(processed);
        processed = replaceThinkToSection(processed);

        return processed;
    }, [content]);

    // 创建引用包装插件
    const createReferenceWrapperPlugin = useCallback(() => {
        return function wrapTextTransform(tree: any) {
            visitParents(tree, 'text', (node, ancestors) => {
                const latestAncestor = ancestors.at(-1);
                if (
                    latestAncestor?.tagName !== 'custom-typography' &&
                    latestAncestor?.tagName !== 'code'
                ) {
                    node.type = 'element';
                    node.tagName = 'custom-typography';
                    node.properties = {};
                    node.children = [{ type: 'text', value: node.value }];
                }
            });
        };
    }, []);

    // 获取引用信息
    const getReferenceInfo = useCallback(
        (chunkIndex: number) => {
            const chunks = reference?.chunks ?? [];
            const chunkItem = chunks[chunkIndex];
            const document = reference?.doc_aggs?.find(
                (x) => x?.doc_id === chunkItem?.document_id,
            );
            const documentId = document?.doc_id;
            const documentUrl = document?.url;
            const fileThumbnail = documentId ? fileThumbnails[documentId] : '';
            const fileExtension = documentId ? getFileExtension(document?.doc_name) : '';
            const imageId = chunkItem?.image_id;

            return {
                documentUrl,
                fileThumbnail,
                fileExtension,
                imageId,
                chunkItem,
                documentId,
                document,
            };
        },
        [fileThumbnails, reference?.chunks, reference?.doc_aggs],
    );

    // 辅助函数，获取文件扩展名
    const getFileExtension = (filename?: string) => {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
    };

    // 判断是否为图片类型
    const isImageType = (docType?: string): boolean => {
        if (!docType) return false;
        return ['image', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(docType.toLowerCase());
    };

    // 渲染引用标记
    const renderReferenceMarkers = useCallback((text: string) => {
        if (!text) return text;

        // 替换引用标记
        let replacedText = reactStringReplace(text, reg, (match, i) => {
            const chunkIndex = getChunkIndex(match);

            // 没有引用数据，不渲染引用标记
            if (!reference) {
                // 移除开发环境下的频繁日志输出
                // if (process.env.NODE_ENV === 'development') {
                //     console.log('没有引用数据，跳过引用标记渲染');
                // }
                return <span key={`ref-empty-${i}`}></span>;
            }

            // 检查引用索引是否有效
            if (!reference.chunks || !Array.isArray(reference.chunks) || chunkIndex >= reference.chunks.length) {
                if (process.env.NODE_ENV === 'development' && chunkIndex !== -1) {
                    // 只在索引无效且不是-1时输出日志
                    console.log('无效的引用索引:', chunkIndex, '总chunks数:', reference.chunks?.length || 0);
                }
                return <span key={`ref-invalid-${i}`}></span>;
            }

            // 获取对应的chunk
            const chunk = reference.chunks[chunkIndex];
            if (!chunk) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('未找到chunk，索引:', chunkIndex);
                }
                return <span key={`ref-missing-${i}`}></span>;
            }

            const { documentId, imageId, chunkItem, documentUrl } = getReferenceInfo(chunkIndex);
            const docType = chunk.doc_type;

            // withref分支：显示引用标记
            // 如果是图片类型，直接显示图片
            if (docType && isImageType(docType) && imageId) {
                return (
                    <Image
                        key={`img-${i}`}
                        id={imageId}
                        className="reference-inline-image"
                        onClick={() => {
                            if (documentId && onDocumentClick) {
                                onDocumentClick(documentId, chunk);
                            } else if (documentUrl) {
                                window.open(documentUrl, '_blank');
                            }
                        }}
                    />
                );
            }

            // 使用Popover组件包装引用标记
            return (
                <ReferencePopover
                    key={`ref-${i}`}
                    chunk={chunk}
                    onDocumentClick={onDocumentClick || (() => { })}
                >
                    <span
                        className="markdown-reference-marker"
                        role="button"
                        tabIndex={0}
                        aria-label="查看引用"
                    >
                        <InfoCircleOutlined />
                    </span>
                </ReferencePopover>
            );
        });

        // 替换光标标记
        replacedText = reactStringReplace(replacedText, cursorRegex, (match, i) => (
            <span key={`cursor-${i}`} className="markdown-cursor-marker"></span>
        ));

        return replacedText;
    }, [reference, onDocumentClick, getReferenceInfo, isImageType]);

    // 自定义代码块渲染
    const renderCodeBlock = useCallback((props: any) => {
        const { children, className, node, ...rest } = props;
        const match = /language-(\w+)/.exec(className || '');

        if (match) {
            return (
                <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    language={match[1]}
                    style={vs}
                    wrapLongLines
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            );
        }

        return (
            <code {...rest} className={classNames(className, 'markdown-inline-code')}>
                {children}
            </code>
        );
    }, []);

    // Markdown组件配置
    const markdownComponents = useMemo(() => ({
        'custom-typography': ({ children }: { children: string }) =>
            renderReferenceMarkers(children),
        code: renderCodeBlock,
    }), [renderReferenceMarkers, renderCodeBlock]);

    // 处理空内容
    if (!content && !isStreaming) {
        return (
            <div className="markdown-renderer markdown-renderer--empty">
                <span className="empty-content-text">[无内容]</span>
            </div>
        );
    }

    return (
        <div className={classNames(
            'markdown-renderer',
            {
                'markdown-renderer--streaming': isStreaming,
                'markdown-renderer--has-references': reference?.chunks && reference.chunks.length > 0
            }
        )}>
            <ReactMarkdown
                rehypePlugins={[createReferenceWrapperPlugin, rehypeKatex, rehypeRaw]}
                remarkPlugins={[remarkGfm, remarkMath]}
                components={markdownComponents as any}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;