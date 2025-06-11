import React from 'react';
import { Popover } from 'antd';

interface ImageProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

const Image: React.FC<ImageProps> = ({ id, className, style }) => {
  const imageUrl = `/api/document/image/${id}`;

  const imagePreview = (
    <div className="reference-image-preview">
      <img
        src={imageUrl}
        alt="Reference"
        style={{ maxWidth: '400px', maxHeight: '300px', objectFit: 'contain' }}
      />
    </div>
  );

  return (
    <Popover
      content={imagePreview}
      title="图片预览"
      trigger="hover"
      placement="top"
    >
      <img
        src={imageUrl}
        alt="Reference"
        className={`reference-chunk-image ${className || ''}`}
        style={{
          width: '20px',
          height: '20px',
          objectFit: 'cover',
          cursor: 'pointer',
          borderRadius: '2px',
          ...style
        }}
      />
    </Popover>
  );
};

export default Image;