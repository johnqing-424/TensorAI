import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';

// 输入框组件接口
interface SearchInputBoxProps {
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    onSearch?: (query: string) => void;
}

// 搜索输入框组件
const SearchInputBox: React.FC<SearchInputBoxProps> = ({
    inputValue,
    setInputValue,
    onSearch = () => { }
}) => {
    // 处理搜索按钮点击
    const handleSearch = () => {
        if (inputValue.trim()) {
            onSearch(inputValue);
        }
    };

    // 处理按键事件（按回车搜索）
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    return (
        <div className="search-input-container">
            <div className="search-input-wrapper">
                <input
                    type="text"
                    className="search-input"
                    placeholder="输入关键词进行搜索..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className="search-button"
                    onClick={handleSearch}
                    disabled={!inputValue.trim()}
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};

// 搜索结果项组件
interface SearchResultItemProps {
    title: string;
    content: string;
    source: string;
    onClick: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
    title,
    content,
    source,
    onClick
}) => {
    return (
        <div className="search-result-item" onClick={onClick}>
            <div className="search-result-title">{title}</div>
            <div className="search-result-content">{content}</div>
            <div className="search-result-source">{source}</div>
        </div>
    );
};

const SearchPage: React.FC = () => {
    const [searchValue, setSearchValue] = useState<string>('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // 处理搜索
    const handleSearch = (query: string) => {
        console.log("搜索查询:", query);
        // 模拟搜索结果
        const mockResults = [
            {
                id: '1',
                title: '搜索结果示例 1',
                content: '这是一个搜索结果的内容摘要，包含了关于' + query + '的相关信息...',
                source: '知识库 - 技术文档'
            },
            {
                id: '2',
                title: '搜索结果示例 2',
                content: '另一个与' + query + '相关的搜索结果内容摘要...',
                source: '知识库 - 产品手册'
            },
            {
                id: '3',
                title: query + ' 相关资料',
                content: '这是关于' + query + '的详细资料和使用说明...',
                source: '知识库 - 培训资料'
            }
        ];

        setSearchResults(mockResults);
        setHasSearched(true);
    };

    // 处理点击搜索结果
    const handleResultClick = (resultId: string) => {
        console.log("点击搜索结果:", resultId);
        // 这里可以添加处理点击搜索结果的逻辑
    };

    return (
        <div className="page search-page">
            <div className="search-header">
                <h1 className="search-title">知识搜索</h1>
                <p className="search-description">快速从知识库中查找信息</p>
            </div>

            <div className="search-container">
                <SearchInputBox
                    inputValue={searchValue}
                    setInputValue={setSearchValue}
                    onSearch={handleSearch}
                />

                <div className="search-results">
                    {hasSearched && searchResults.length === 0 && (
                        <div className="no-results">
                            <div className="no-results-icon">🔍</div>
                            <div className="no-results-text">
                                未找到与"{searchValue}"相关的结果
                            </div>
                        </div>
                    )}

                    {searchResults.map((result) => (
                        <SearchResultItem
                            key={result.id}
                            title={result.title}
                            content={result.content}
                            source={result.source}
                            onClick={() => handleResultClick(result.id)}
                        />
                    ))}
                </div>

                {!hasSearched && (
                    <div className="search-suggestions">
                        <h3>热门搜索</h3>
                        <div className="suggestion-tags">
                            <div className="suggestion-tag" onClick={() => setSearchValue('产品文档')}>产品文档</div>
                            <div className="suggestion-tag" onClick={() => setSearchValue('API设计')}>API设计</div>
                            <div className="suggestion-tag" onClick={() => setSearchValue('前端开发')}>前端开发</div>
                            <div className="suggestion-tag" onClick={() => setSearchValue('技术架构')}>技术架构</div>
                        </div>
                    </div>
                )}
            </div>

            <style>
                {`
                .search-page {
                    padding: 20px;
                    max-width: 900px;
                    margin: 0 auto;
                }
                
                .search-header {
                    margin-bottom: 20px;
                }
                
                .search-title {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 500;
                }
                
                .search-description {
                    margin: 5px 0 0;
                    font-size: 14px;
                    color: #666;
                }
                
                .search-input-container {
                    margin: 20px auto;
                    width: 100%;
                    max-width: 800px;
                }
                
                .search-input-wrapper {
                    display: flex;
                    border: 1px solid rgba(234, 235, 238, 0.5);
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    background: rgba(255, 255, 255, 0.75);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    transition: all 0.3s ease;
                }
                
                .search-input {
                    flex: 1;
                    padding: 16px 20px;
                    border: none;
                    outline: none;
                    font-size: 16px;
                    min-height: 50px;
                    line-height: 1.4;
                    background: transparent;
                }
                
                .search-button {
                    background-color: #3370ff;
                    color: white;
                    border: none;
                    padding: 0 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .search-button:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
                
                .search-results {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .search-result-item {
                    padding: 15px;
                    border: 1px solid #eee;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .search-result-item:hover {
                    background-color: #f9f9f9;
                }
                
                .search-result-title {
                    font-size: 18px;
                    font-weight: 500;
                    color: #3370ff;
                    margin-bottom: 5px;
                }
                
                .search-result-content {
                    font-size: 14px;
                    color: #333;
                    margin-bottom: 10px;
                    line-height: 1.5;
                }
                
                .search-result-source {
                    font-size: 12px;
                    color: #888;
                }
                
                .no-results {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 40px 0;
                    color: #666;
                }
                
                .no-results-icon {
                    font-size: 32px;
                    margin-bottom: 10px;
                }
                
                .search-suggestions {
                    margin-top: 30px;
                }
                
                .search-suggestions h3 {
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 15px;
                }
                
                .suggestion-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                
                .suggestion-tag {
                    background-color: #f0f2f5;
                    padding: 6px 12px;
                    border-radius: 16px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .suggestion-tag:hover {
                    background-color: #e6e8eb;
                }
                `}
            </style>
        </div>
    );
};

export default SearchPage;