import React, { useCallback, useMemo } from 'react';
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
import Markdown from 'react-markdown';
import reactStringReplace from 'react-string-replace';
import SyntaxHighlighter from 'react-syntax-highlighter';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { visitParents } from 'unist-util-visit-parents';
import DOMPurify from 'dompurify';
import classNames from 'classnames';
import { pipe } from 'lodash/fp';

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

const showImage = (docType: string) => {
    return ['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(docType?.toLowerCase() || '');
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
    // 提取文档ID列表
    const documentIds = useMemo(() => {
        if (!reference || !reference.doc_aggs || !Array.isArray(reference.doc_aggs)) {
            return [];
        }
        return reference.doc_aggs
            .filter(doc => doc && doc.doc_id && typeof doc.doc_id === 'string')
            .map(doc => doc.doc_id);
    }, [reference?.doc_aggs]);

    // 使用hook获取文档缩略图
    const { thumbnails: hookThumbnails, loading: thumbnailsLoading, error: thumbnailsError } = useDocumentThumbnails(documentIds);

    // 合并缩略图数据，优先使用doc_aggs中的url
    const fileThumbnails = useMemo(() => {
        const thumbnails: { [key: string]: string } = { ...hookThumbnails };

        // 如果doc_aggs中有url，优先使用
        reference?.doc_aggs?.forEach(doc => {
            if (doc && doc.doc_id && doc.url) {
                thumbnails[doc.doc_id] = doc.url;
            }
        });

        return thumbnails;
    }, [reference?.doc_aggs, hookThumbnails]);

    const contentWithCursor = useMemo(() => {
        let text = content;
        if (text === '') {
            text = '搜索中...';
        }
        const nextText = replaceTextByOldReg(text);
        return pipe(replaceThinkToSection, preprocessLaTeX)(nextText);
    }, [content]);

    const handleDocumentButtonClick = useCallback(
        (
            documentId: string,
            chunk: ReferenceChunk,
            isPdf: boolean,
            documentUrl?: string,
        ) =>
            () => {
                if (!isPdf) {
                    if (!documentUrl) {
                        return;
                    }
                    window.open(documentUrl, '_blank');
                } else {
                    clickDocumentButton?.(documentId, chunk);
                }
            },
        [clickDocumentButton],
    );

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

    const getReferenceInfo = useCallback(
        (chunkIndex: number) => {
            // 验证引用数据的基本结构
            if (!reference || !reference.chunks || !Array.isArray(reference.chunks)) {
                console.warn('引用数据结构无效:', reference);
                return {
                    documentUrl: '',
                    fileThumbnail: '',
                    fileExtension: '',
                    imageId: '',
                    chunkItem: null,
                    documentId: '',
                    document: null,
                };
            }

            const chunks = reference.chunks;

            // 详细的索引验证和调试信息
            console.log(`getReferenceInfo调用: 索引=${chunkIndex}, chunks长度=${chunks.length}`);

            // 检查索引是否超出范围
            if (chunkIndex < 0 || chunkIndex >= chunks.length) {
                console.warn(`Chunk索引 ${chunkIndex} 超出范围 [0, ${chunks.length - 1}]`);
                return {
                    documentUrl: '',
                    fileThumbnail: '',
                    fileExtension: '',
                    imageId: '',
                    chunkItem: null,
                    documentId: '',
                    document: null,
                };
            }

            const chunkItem = chunks[chunkIndex];

            // 验证chunk项的有效性
            if (!chunkItem || typeof chunkItem !== 'object') {
                console.warn(`Chunk索引 ${chunkIndex} 对应的项无效:`, chunkItem);
                return {
                    documentUrl: '',
                    fileThumbnail: '',
                    fileExtension: '',
                    imageId: '',
                    chunkItem: null,
                    documentId: '',
                    document: null,
                };
            }

            // 查找对应的文档信息
            const document = reference?.doc_aggs?.find(
                (x) => x && x.doc_id === chunkItem.document_id,
            );

            const documentId = document?.doc_id || '';
            const documentUrl = document?.url || '';
            const fileThumbnail = documentId ? (fileThumbnails[documentId] || '') : '';
            const fileExtension = documentId && document?.doc_name ? getExtension(document.doc_name) : '';
            const imageId = chunkItem?.image_id || '';

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
        [reference?.chunks, reference?.doc_aggs, fileThumbnails],
    );

    const getPopoverContent = useCallback(
        (chunkIndex: number) => {
            const {
                documentUrl,
                fileThumbnail,
                fileExtension,
                imageId,
                chunkItem,
                documentId,
                document,
            } = getReferenceInfo(chunkIndex);

            // 调试信息
            console.log('Popover content for chunk', chunkIndex, ':', {
                chunkItem,
                documentId,
                imageId,
                content: chunkItem?.content,
                hasReference: !!reference,
                chunksLength: reference?.chunks?.length || 0,
                docAggsLength: reference?.doc_aggs?.length || 0,
                thumbnailsLoading,
                thumbnailsError,
                fileThumbnailsCount: Object.keys(fileThumbnails).length
            });

            // 如果没有chunk项，显示详细的错误信息
            if (!chunkItem) {
                const errorMessage = !reference ? '引用数据为空' :
                    !reference.chunks ? '引用块数据缺失' :
                        chunkIndex >= reference.chunks.length ? `引用索引超出范围 (${chunkIndex}/${reference.chunks.length})` :
                            '引用信息不可用';

                return (
                    <div className="ragflow-reference-popover-wrapper">
                        <div className="ragflow-chunk-content-text">
                            {errorMessage}
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-500 mt-2">
                                调试信息: 索引={chunkIndex}, 引用={!!reference ? '存在' : '不存在'}
                            </div>
                        )}
                    </div>
                );
            }

            // 验证chunk内容的有效性
            if (chunkItem.content === null || chunkItem.content === undefined ||
                (typeof chunkItem.content === 'string' && chunkItem.content.trim() === '')) {
                return (
                    <div className="ragflow-reference-popover-wrapper">
                        <div className="ragflow-chunk-content-text">
                            引用内容为空
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-500 mt-2">
                                调试信息: content={chunkItem.content === null ? 'null' :
                                    chunkItem.content === undefined ? 'undefined' : '空字符串'}
                            </div>
                        )}
                    </div>
                );
            }

            if (typeof chunkItem.content !== 'string') {
                return (
                    <div className="ragflow-reference-popover-wrapper">
                        <div className="ragflow-chunk-content-text">
                            引用内容格式错误
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-500 mt-2">
                                调试信息: content类型={typeof chunkItem.content}
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <div key={chunkItem?.id} className="flex gap-2 ragflow-reference-popover-wrapper">
                    {imageId && (
                        <ImageWithPopover id={imageId} />
                    )}
                    <div className={'space-y-2 max-w-[40vw]'}>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(chunkItem?.content ?? '暂无内容'),
                            }}
                            className="ragflow-chunk-content-text"
                        />
                        {documentId && (
                            <Flex gap={'small'} align="center">
                                {fileThumbnail ? (
                                    <img
                                        src={fileThumbnail}
                                        alt="File thumbnail"
                                        className="ragflow-file-thumbnail"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            // 可以在这里添加一个fallback图标
                                        }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <FileIcon extension={fileExtension} />
                                )}
                                <Button
                                    type="link"
                                    className="ragflow-document-link text-wrap"
                                    onClick={handleDocumentButtonClick(
                                        documentId,
                                        chunkItem,
                                        fileExtension === 'pdf',
                                        documentUrl,
                                    )}
                                >
                                    {document?.doc_name}
                                </Button>
                            </Flex>
                        )}
                    </div>
                </div>
            );
        },
        [getReferenceInfo, handleDocumentButtonClick],
    );

    const renderReference = useCallback(
        (text: string) => {
            let replacedText = reactStringReplace(text, reg, (match, i) => {
                const chunkIndex = getChunkIndex(match);

                const { documentUrl, fileExtension, imageId, chunkItem, documentId } =
                    getReferenceInfo(chunkIndex);

                const docType = chunkItem?.doc_type || '';

                return showImage(docType) ? (
                    <Image
                        key={i}
                        id={imageId}
                        className="ragflow-reference-inner-chunk-image"
                        onClick={
                            documentId && chunkItem
                                ? handleDocumentButtonClick(
                                    documentId,
                                    chunkItem,
                                    fileExtension === 'pdf',
                                    documentUrl,
                                )
                                : () => { }
                        }
                    />
                ) : (
                    <Popover
                        content={getPopoverContent(chunkIndex)}
                        key={i}
                        trigger="hover"
                        placement="top"
                        mouseEnterDelay={0.3}
                        mouseLeaveDelay={0.1}
                        overlayClassName="ragflow-reference-popover"
                        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                        destroyTooltipOnHide
                        fresh
                    >
                        <InfoCircleOutlined className="ragflow-reference-icon" />
                    </Popover>
                );
            });

            // 处理光标标记
            replacedText = reactStringReplace(replacedText, curReg, (match, i) => (
                <span className="ragflow-cursor" key={i}></span>
            ));

            return replacedText;
        },
        [getPopoverContent, getReferenceInfo, handleDocumentButtonClick],
    );

    return (
        <div className="ragflow-markdown-content-wrapper">
            <Markdown
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
                {contentWithCursor}
            </Markdown>
        </div>
    );
};

export default MarkdownContent;