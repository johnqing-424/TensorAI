import { useState, useEffect } from 'react';

interface DocumentThumbnails {
    [documentId: string]: string;
}

// 使用与文档链接相同的基础URL
const API_BASE_URL = 'http://123.207.100.71:5007';

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

                // 使用与文档链接相同的构建方式，确保一致性
                for (const docId of documentIds) {
                    if (docId && typeof docId === 'string') {
                        // 使用与文档链接同样的基础URL构建缩略图URL
                        thumbnailData[docId] = `${API_BASE_URL}/document/thumbnails/${docId}`;
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