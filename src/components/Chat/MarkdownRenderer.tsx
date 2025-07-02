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

    // 渲染引用标记
    const renderReferenceMarkers = useCallback((text: string) => {
        // 替换引用标记
        let replacedText = reactStringReplace(text, reg, (match, i) => {
            const chunkIndex = getChunkIndex(match);

            // 检查引用索引是否有效
            if (!reference?.chunks || chunkIndex >= reference.chunks.length) {
                return <span key={`ref-invalid-${i}`}>📄</span>;
            }

            // 获取对应的chunk
            const chunk = reference.chunks[chunkIndex];
            if (!chunk) {
                return <span key={`ref-missing-${i}`}>📄</span>;
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
                    >
                        📄
                    </span>
                </ReferencePopover>
            );
        });

        // 替换光标标记
        replacedText = reactStringReplace(replacedText, cursorRegex, (match, i) => (
            <span key={`cursor-${i}`} className="markdown-cursor-marker"></span>
        ));

        return replacedText;
    }, [reference, onDocumentClick]);

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