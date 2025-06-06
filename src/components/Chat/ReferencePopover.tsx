import React from 'react';
import { Popover } from 'antd';
import { ReferenceChunk } from '../../types';
import { showImage } from '../../utils/fileUtils';
import './ReferencePopover.css';

interface ReferencePopoverProps {
    chunk: ReferenceChunk;
    position: { top: number; left: number } | null;
    onClose: () => void;
    onDocumentClick: (documentId: string, chunk: ReferenceChunk) => void;
}

/**
 * 引用弹窗组件 - 显示引用内容的详细信息
 */
const ReferencePopover: React.FC<ReferencePopoverProps> = ({
    chunk,
    position,
    onClose,
    onDocumentClick
}) => {
    // 处理文档点击
    const handleDocumentClick = () => {
        onDocumentClick(chunk.document_id, chunk);
    };

    // 渲染图片内容
    const renderImageContent = () => {
        if (!chunk.image_id) return null;

        const imageUrl = `/api/v1/document/image/${chunk.image_id}`;

        return (
            <div className="reference-popover-image">
                <img
                    src={imageUrl}
                    alt="Reference Image"
                    className="reference-image"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        console.warn(`Failed to load image with id: ${chunk.image_id}`);
                    }}
                    loading="lazy"
                />
            </div>
        );
    };

    // 渲染文本内容
    const renderTextContent = () => (
        <div className="reference-popover-text">
            <p className="reference-content">
                {chunk.content || '内容为空'}
            </p>
        </div>
    );

    // 渲染弹窗内容
    const renderPopoverContent = () => (
        <div className="reference-popover-content">
            <div className="reference-popover-header">
                <h4 className="reference-title">
                    {chunk.document_name || '未知文档'}
                </h4>
                <button
                    className="reference-close-btn"
                    onClick={onClose}
                    type="button"
                    aria-label="关闭"
                >
                    ✕
                </button>
            </div>

            <div className="reference-popover-body">
                {chunk.doc_type && showImage(chunk.doc_type) ?
                    renderImageContent() :
                    renderTextContent()
                }
            </div>

            <div className="reference-popover-footer">
                <button
                    className="reference-document-link"
                    onClick={handleDocumentClick}
                    type="button"
                >
                    查看原文
                </button>
            </div>
        </div>
    );

    if (!position) return null;

    return (
        <Popover
            open={true}
            content={renderPopoverContent()}
            trigger="click"
            placement="topLeft"
            onOpenChange={(visible) => {
                if (!visible) onClose();
            }}
            overlayClassName="reference-popover-overlay"
            getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
            destroyTooltipOnHide
        >
            <div
                className="reference-popover-trigger"
                style={{
                    position: 'fixed',
                    left: position.left,
                    top: position.top,
                    pointerEvents: 'none'
                }}
            >
                <span className="reference-marker">📄</span>
            </div>
        </Popover>
    );
};

export default ReferencePopover;