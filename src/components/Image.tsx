import React, { useState } from 'react';
import { Popover, message } from 'antd';

interface ImageProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

const Image: React.FC<ImageProps> = ({ id, className, style }) => {
  // 使用window.location.origin替代硬编码URL，确保保留/api前缀
  const imageUrl = `${window.location.origin}/api/document/image/${id}`;
  const [loadError, setLoadError] = useState(false);

  const handleImageError = () => {
    setLoadError(true);
    message.error('图片加载失败');
  };

  const imagePreview = (
    <div className="reference-image-preview">
      {!loadError ? (
        <img
          src={imageUrl}
          alt="Reference"
          style={{ maxWidth: '400px', maxHeight: '300px', objectFit: 'contain' }}
          onError={handleImageError}
        />
      ) : (
        <div style={{ padding: '10px', color: '#ff4d4f' }}>图片加载失败</div>
      )}
    </div>
  );

  return (
    <Popover
      content={imagePreview}
      title="图片预览"
      trigger="hover"
      placement="top"
      destroyTooltipOnHide={{ keepParent: true }}
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
        onError={handleImageError}
      />
    </Popover>
  );
};

export default Image;