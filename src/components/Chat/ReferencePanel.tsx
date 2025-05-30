import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';

const ReferencePanel: React.FC = () => {
    const { latestReference } = useChatContext();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!latestReference || !latestReference.chunks || latestReference.chunks.length === 0) {
        return null;
    }

    // 根据文档对参考资料进行分组
    const groupedChunks = latestReference.chunks.reduce((acc, chunk) => {
        const docId = chunk.document_id;
        if (!acc[docId]) {
            acc[docId] = {
                document_name: chunk.document_name,
                document_id: docId,
                chunks: [],
            };
        }
        acc[docId].chunks.push(chunk);
        return acc;
    }, {} as Record<string, { document_name: string; document_id: string; chunks: typeof latestReference.chunks }>);

    return (
        <div className={`reference-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="reference-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3>参考资料</h3>
                <div className="reference-toggle">
                    {isExpanded ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="reference-content">
                    {Object.values(groupedChunks).map((group) => (
                        <div key={group.document_id} className="reference-document">
                            <div className="document-header">
                                <h4>{group.document_name}</h4>
                            </div>
                            {group.chunks.map((chunk, index) => (
                                <div key={`${chunk.id}-${index}`} className="reference-chunk">
                                    <div className="chunk-similarity">
                                        相关度: {(chunk.similarity * 100).toFixed(0)}%
                                    </div>
                                    {/* 如果存在高亮版本，则使用高亮版本 */}
                                    {chunk.highlight ? (
                                        <div
                                            className="chunk-content"
                                            dangerouslySetInnerHTML={{ __html: chunk.highlight }}
                                        />
                                    ) : (
                                        <div className="chunk-content">{chunk.content}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReferencePanel; 