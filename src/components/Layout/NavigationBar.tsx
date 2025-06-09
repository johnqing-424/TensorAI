import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 根据原有功能定义功能类型
export type FunctionIdType = 'process' | 'product' | 'model' | 'more';

// 功能图标定义
export const functionIcons = {
    process: { icon: '📝', bgColor: '#e8f4ff', color: '#3370ff' },
    product: { icon: '🔍', bgColor: '#e5f7ed', color: '#10b981' },
    model: { icon: '🤖', bgColor: '#f5f3ff', color: '#8b5cf6' },
    more: { icon: '📄', bgColor: '#f2f4f8', color: '#6366f1' }
};

// 路由映射
export const functionRoutes: Record<FunctionIdType, string> = {
    process: '/process',
    product: '/product',
    model: '/model',
    more: '/more'
};

// 功能标题映射
export const functionTitles: Record<FunctionIdType, string> = {
    process: '流程制度检索',
    product: '产品技术检索',
    model: '大模型知识检索',
    more: '简历筛选助手'
};

const NavigationBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    // 获取当前功能ID
    const getCurrentFunction = (): FunctionIdType | null => {
        const path = currentPath === '/' ? '/process' : currentPath;

        for (const [key, route] of Object.entries(functionRoutes)) {
            if (path === route) {
                return key as FunctionIdType;
            }
        }
        return null;
    };

    const currentFunction = getCurrentFunction();

    // 处理功能点击
    const handleFunctionClick = (e: React.MouseEvent, functionId: FunctionIdType) => {
        e.preventDefault();
        navigate(functionRoutes[functionId]);
    };

    return (
        <div className="quick-nav">
            <div className="quick-nav-inner">
                {Object.entries(functionIcons).map(([id, icon]) => {
                    const functionId = id as FunctionIdType;
                    return (
                        <div
                            key={id}
                            className={`quick-nav-item ${currentFunction === functionId ? 'active' : ''}`}
                            onClick={(e) => handleFunctionClick(e, functionId)}
                        >
                            <span
                                className="quick-nav-icon"
                                style={{ color: icon.color }}
                            >
                                {icon.icon}
                            </span>
                            <span className="quick-nav-text">
                                {functionTitles[functionId]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NavigationBar; 