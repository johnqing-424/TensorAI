import React from 'react';
import { Popover, Typography, Button, Divider, Space, Image as AntImage } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { ReferenceChunk } from '../../types';
import { showImage } from '../../utils/fileUtils';
import './ReferencePopover.css';

const { Text, Paragraph } = Typography;

// 统一的API基础URL
const API_BASE_URL = 'http://123.207.100.71:5007';

interface ReferencePopoverProps {
    chunk: ReferenceChunk;
    onDocumentClick: (documentId: string, chunk: ReferenceChunk) => void;
}

/**
 * 引用弹窗组件 - 显示引用内容的详细信息
 */
const ReferencePopover: React.FC<ReferencePopoverProps & { children: React.ReactNode }> = ({
    chunk,
    onDocumentClick,
    children
}) => {
    // 处理文档点击
    const handleDocumentClick = () => {
        onDocumentClick(chunk.document_id, chunk);
    };

    // 渲染图片内容
    const renderImageContent = () => {
        if (!chunk.image_id) return null;

        // 使用统一的API基础URL构建图片URL
        const imageUrl = `${API_BASE_URL}/document/image/${chunk.image_id}`;

        return (
            <div className="reference-image-container">
                <AntImage
                    src={imageUrl}
                    alt="引用图像"
                    className="reference-image"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                    }}
                    loading="lazy"
                    preview={{
                        mask: <div>查看大图</div>
                    }}
                />
            </div>
        );
    };

    // 渲染文本内容
    const renderTextContent = () => (
        <div
            className="reference-content"
            dangerouslySetInnerHTML={{
                __html: chunk.content || '内容为空'
            }}
        />
    );

    // 渲染弹窗内容
    const renderPopoverContent = () => (
        <div className="reference-popover-inner">
            <div className="reference-popover-header">
                <Text strong className="reference-title" ellipsis>
                    {chunk.document_name || '未知文档'}
                </Text>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div className="reference-popover-body">
                {chunk.doc_type && showImage(chunk.doc_type) ?
                    renderImageContent() :
                    renderTextContent()
                }
            </div>

            <div className="reference-popover-footer">
                <Button
                    type="primary"
                    size="small"
                    onClick={handleDocumentClick}
                    icon={<FileTextOutlined />}
                    className="view-document-btn"
                >
                    查看原文
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={renderPopoverContent()}
            trigger="hover"
            overlayClassName="ant-popover-reference"
            placement="top"
            destroyTooltipOnHide
        >
            <span className="reference-marker">
                {children}
            </span>
        </Popover>
    );
};

export default ReferencePopover;