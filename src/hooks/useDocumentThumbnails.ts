import { useState, useEffect } from 'react';

interface DocumentThumbnails {
    [documentId: string]: string;
}

/**
 * 获取文档缩略图的Hook
 * 模拟RAGFlow原生版本的useFetchDocumentThumbnailsByIds功能
 */
export const useDocumentThumbnails = (documentIds: string[]) => {
    const [thumbnails, setThumbnails] = useState<DocumentThumbnails>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!documentIds || documentIds.length === 0) {
            setThumbnails({});
            return;
        }

        const fetchThumbnails = async () => {
            setLoading(true);
            setError(null);

            try {
                const thumbnailData: DocumentThumbnails = {};

                // 为每个文档ID生成缩略图URL
                // 这里可以根据实际的API端点进行调整
                for (const docId of documentIds) {
                    if (docId && typeof docId === 'string') {
                        // 尝试构建缩略图URL，可以根据实际API调整
                        thumbnailData[docId] = `/api/v1/document/thumbnail/${docId}`;

                        // 如果有实际的API端点，可以在这里调用
                        // const response = await apiClient.getDocumentThumbnail(docId);
                        // thumbnailData[docId] = response.data.thumbnail_url;
                    }
                }

                setThumbnails(thumbnailData);
            } catch (err) {
                console.error('获取文档缩略图失败:', err);
                setError(err instanceof Error ? err.message : '获取缩略图失败');

                // 设置默认的缩略图
                const defaultThumbnails: DocumentThumbnails = {};
                documentIds.forEach(docId => {
                    if (docId) {
                        defaultThumbnails[docId] = '';
                    }
                });
                setThumbnails(defaultThumbnails);
            } finally {
                setLoading(false);
            }
        };

        fetchThumbnails();
    }, [documentIds]);

    return {
        thumbnails,
        loading,
        error,
        refetch: () => {
            if (documentIds && documentIds.length > 0) {
                // 重新触发useEffect
                setThumbnails({});
            }
        }
    };
};

export default useDocumentThumbnails;