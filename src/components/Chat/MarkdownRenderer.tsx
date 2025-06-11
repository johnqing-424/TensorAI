import React, { useMemo, useCallback, useState } from 'react';
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

/**
 * Markdown渲染器组件 - 负责渲染Markdown内容和处理引用
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    isStreaming = false,
    reference,
    onDocumentClick
}) => {
    // 引用弹窗状态
    const [referencePopover, setReferencePopover] = useState<{
        visible: boolean;
        index: number | null;
        position: { top: number; left: number } | null;
    }>({
        visible: false,
        index: null,
        position: null,
    });

    // 引用标记正则表达式 - 匹配ragflow原生格式 ~~数字==
    const referenceRegex = /(~{2}\d+={2})/g;
    const cursorRegex = /\[\[(\d+)\]\]/g;

    // 获取文档ID列表
    const documentIds = useMemo(() => {
        if (!reference?.chunks) return [];
        return Array.from(new Set(reference.chunks.map(chunk => chunk.document_id)));
    }, [reference]);

    // 获取文档缩略图
    const documentThumbnails = useDocumentThumbnails(documentIds);

    // 预处理内容
    const processedContent = useMemo(() => {
        if (!content) return '';
        let processed = content;

        // 应用各种预处理
        processed = preprocessLaTeX(processed);
        processed = replaceThinkToSection(processed);
        processed = replaceTextByOldReg(processed);

        return processed;
    }, [content]);

    // 处理引用点击
    const handleReferenceClick = useCallback((index: number, event: React.MouseEvent) => {
        if (!reference?.chunks || index >= reference.chunks.length) return;

        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        setReferencePopover({
            visible: true,
            index,
            position: {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            }
        });
    }, [reference]);

    // 关闭引用弹窗
    const handlePopoverClose = useCallback(() => {
        setReferencePopover({
            visible: false,
            index: null,
            position: null
        });
    }, []);

    // 处理文档点击
    const handleDocumentClick = useCallback((documentId: string, chunk: ReferenceChunk) => {
        onDocumentClick?.(documentId, chunk);
        handlePopoverClose();
    }, [onDocumentClick, handlePopoverClose]);

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

    // 渲染引用标记
    const renderReferenceMarkers = useCallback((text: string) => {
        // 替换引用标记
        let replacedText = reactStringReplace(text, referenceRegex, (match, i) => {
            // 从 ~~数字== 格式中提取数字
            const index = parseInt(match.slice(2, -2), 10);
            return (
                <span
                    key={`ref-${i}`}
                    className="markdown-reference-marker"
                    onClick={(e) => handleReferenceClick(index, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleReferenceClick(index, e as any);
                        }
                    }}
                >
                    📄
                </span>
            );
        });

        // 替换光标标记
        replacedText = reactStringReplace(replacedText, cursorRegex, (match, i) => (
            <span key={`cursor-${i}`} className="markdown-cursor-marker"></span>
        ));

        return replacedText;
    }, [handleReferenceClick]);

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

    // 渲染引用弹窗
    const renderReferencePopover = () => {
        if (!referencePopover.visible || referencePopover.index === null || !reference?.chunks) {
            return null;
        }

        const chunk = reference.chunks[referencePopover.index];
        if (!chunk) return null;

        return (
            <ReferencePopover
                chunk={chunk}
                position={referencePopover.position}
                onClose={handlePopoverClose}
                onDocumentClick={handleDocumentClick}
            />
        );
    };

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
            {renderReferencePopover()}
        </div>
    );
};

export default MarkdownRenderer;