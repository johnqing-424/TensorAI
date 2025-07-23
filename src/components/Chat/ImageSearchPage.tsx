import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ImageSearchPage.css'; // 假设CSS文件也会被创建或复制

// 接口定义
interface ImageData {
    imageId: string;
    timestamp: string;
    location: string;
    person_count: number;
    description: string;
    behaviors: string;
    clothing: string;
    videoUrl: string;
    picUrl: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// 新增：视频弹窗组件
const VideoModal: React.FC<{ videoUrl: string; onClose: () => void }> = ({ videoUrl, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <video src={videoUrl} controls autoPlay className="modal-video" />
            </div>
        </div>
    );
};

// ResultCard 子组件
const ResultCard: React.FC<{ result: ImageData; mediaBaseUrl: string; onThumbnailClick: (videoUrl: string) => void }> = ({ result, mediaBaseUrl, onThumbnailClick }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const videoErrorRef = useRef<HTMLDivElement>(null);

    const showImage = () => {
        if (imageRef.current) imageRef.current.style.display = 'block';
        if (videoRef.current) {
            videoRef.current.style.display = 'none';
            videoRef.current.pause();
        }
        if (videoErrorRef.current) videoErrorRef.current.style.display = 'none';
    };

    const playVideo = () => {
        if (imageRef.current) imageRef.current.style.display = 'none';
        if (videoRef.current) {
            videoRef.current.style.display = 'block';
            videoRef.current.play().catch(e => {
                console.error('Video play failed:', e);
                if (videoErrorRef.current) videoErrorRef.current.style.display = 'block';
            });
        }
        if (videoErrorRef.current) videoErrorRef.current.style.display = 'none';
    };

    return (
        <div className="result-card">
            <div className="media-container">
                <img 
                    ref={imageRef} 
                    src={`${mediaBaseUrl}${result.picUrl}`} 
                    alt={result.description || '图片'} 
                    className="result-image"
                    onClick={() => result.videoUrl && onThumbnailClick(result.videoUrl)}
                    style={{ cursor: 'pointer' }}
                />
                {result.videoUrl && (
                    <>
                        <video ref={videoRef} src={result.videoUrl} className="result-video" controls onError={() => { if(videoErrorRef.current) videoErrorRef.current.style.display = 'block';}}></video>
                        <div ref={videoErrorRef} className="video-error">
                            视频无法正常播放，请尝试
                            <a href={result.videoUrl} className="download-link" download>下载视频</a>
                            或使用其他播放器打开。
                        </div>
                        <div className="media-controls">
                            <button className="media-btn" title="显示图片" onClick={showImage}>🖼️</button>
                            <button className="media-btn" title="播放视频" onClick={playVideo}>▶️</button>
                        </div>
                    </>
                )}
            </div>
            <div className="result-details">
                <div className="result-id">ID: {result.imageId}</div>
                <div className="result-meta">
                    {result.timestamp && <div className="meta-item"><span className="meta-icon">⏱</span> {result.timestamp}</div>}
                    {result.location && <div className="meta-item"><span className="meta-icon">📍</span> {result.location}</div>}
                    {result.person_count && <div className="meta-item"><span className="meta-icon">👥</span> {result.person_count}人</div>}
                    {result.behaviors && <div className="meta-item"><span className="meta-icon">🚶</span> {result.behaviors}</div>}
                    {result.clothing && <div className="meta-item"><span className="meta-icon">👕</span> {result.clothing}</div>}
                </div>
                {result.description && <div className="result-description">{result.description}</div>}
            </div>
        </div>
    );
};

// 主组件
function ImageSearchPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '您好！我是图片搜索助手，请输入您要查询的内容，例如："找出所有穿白色T恤的人"。' }
    ]);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ImageData[]>([]);
    const [totalTime, setTotalTime] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
    const conversationContainerRef = useRef<HTMLDivElement>(null);

    const mediaBaseUrl = 'http://192.168.1.131:9999/';
    const apiUrl = 'http://192.168.1.131:9090/api/image-search/query';

    useEffect(() => {
        if (conversationContainerRef.current) {
            conversationContainerRef.current.scrollTop = conversationContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        const startTime = Date.now();

        const userMessage: Message = { role: 'user', content: query };
        const loadingMessage: Message = { role: 'assistant', content: '正在搜索匹配的图片...' };
        
        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setQuery('');

        try {
            const response = await axios.post(apiUrl, { question: query });
            const data = response.data;
            
            const endTime = Date.now();
            setTotalTime((endTime - startTime) / 1000);

            if (data.code === 0 && data.data) {
                const description = data.data.description;
                if (description) {
                    const assistantResponse: Message = { role: 'assistant', content: description };
                    setMessages(prev => [...prev.slice(0, -1), assistantResponse]);
                } else {
                    setMessages(prev => prev.slice(0, -1));
                }
                setSearchResults(data.data.images || []);
            } else {
                throw new Error(data.desc || '未能解析响应');
            }
        } catch (error) {
            const endTime = Date.now();
            setTotalTime((endTime - startTime) / 1000);
            const errorMessage: Message = { role: 'assistant', content: `搜索失败: ${error instanceof Error ? error.message : String(error)}` };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearConversation = () => {
        setMessages([{ role: 'assistant', content: '您好！我是图片搜索助手，请输入您要查询的内容，例如："找出所有穿白色T恤的人"。' }]);
        setSearchResults([]);
        setTotalTime(0);
    };

    const handleThumbnailClick = (videoUrl: string) => {
        setModalVideoUrl(videoUrl);
    };

    return (
        <div className="container">
            <header>
                <h1>多轮对话图片与视频搜索系统</h1>
                <p className="subtitle">智能图像分析与检索平台</p>
            </header>

            <div className="main-content">
                <section className="conversation-section">
                    <div className="conversation-header">
                        <h2 className="conversation-title">对话历史</h2>
                        <button className="clear-btn" onClick={handleClearConversation}>清空对话</button>
                    </div>
                    <div className="conversation-container" ref={conversationContainerRef}>
                        {messages.map((msg, index) => (
                            <div key={index} className={`message message-${msg.role}`}>
                                <div className="message-header">
                                    <div className={`message-avatar ${msg.role}-avatar`}>{msg.role === 'user' ? '你' : 'AI'}</div>
                                    <div>{msg.role === 'user' ? '用户' : '智能助手'}</div>
                                </div>
                                <div className={`message-content ${msg.role}-content`}>{msg.content}</div>
                            </div>
                        ))}
                    </div>
                    <div className="input-section">
                        <input
                            type="text"
                            className="message-input"
                            placeholder="输入您的查询问题..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                            disabled={isLoading}
                        />
                        <button className="send-btn" onClick={handleSendMessage} disabled={isLoading}>发送</button>
                    </div>
                </section>

                <section className="results-section">
                    <div className="results-header">
                        <h2 className="results-title">搜索结果</h2>
                        <span className="result-count">{searchResults.length} 张图片</span>
                    </div>
                    <div className="results-container">
                        {searchResults.length > 0 ? (
                            searchResults.map(result => (
                                <ResultCard 
                                    key={result.imageId} 
                                    result={result} 
                                    mediaBaseUrl={mediaBaseUrl} 
                                    onThumbnailClick={handleThumbnailClick}
                                />
                            ))
                        ) : (
                            <div className="no-results">
                                <h3>未找到匹配的图片</h3>
                                <p>请尝试使用不同的关键词进行搜索</p>
                            </div>
                        )}
                    </div>
                    {totalTime > 0 && (
                        <div className="time-summary">
                            本次搜索耗时: <span>{totalTime.toFixed(2)}</span>秒
                        </div>
                    )}
                </section>
            </div>
            
            {modalVideoUrl && <VideoModal videoUrl={modalVideoUrl} onClose={() => setModalVideoUrl(null)} />}
        </div>
    );
}

export default ImageSearchPage;