import React from 'react';
import ChatInputBox, { ButtonConfig } from './ChatInputBox';

// 示例：为不同页面定制输入框按钮

// 流程页面的按钮配置
export const getProcessPageButtons = (): ButtonConfig[] => [
    {
        id: 'template',
        label: '模板',
        title: '选择流程模板',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
        ),
        onClick: () => console.log('选择流程模板')
    },
    {
        id: 'approval',
        label: '审批',
        title: '发起审批流程',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" />
            </svg>
        ),
        onClick: () => console.log('发起审批流程')
    }
];

// 产品页面的按钮配置
export const getProductPageButtons = (): ButtonConfig[] => [
    {
        id: 'feature',
        label: '功能',
        title: '查看产品功能',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
            </svg>
        ),
        onClick: () => console.log('查看产品功能')
    },
    {
        id: 'docs',
        label: '文档',
        title: '查看产品文档',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
        ),
        onClick: () => console.log('查看产品文档')
    }
];

// 模型页面的按钮配置
export const getModelPageButtons = (): ButtonConfig[] => [
    {
        id: 'train',
        label: '训练',
        title: '训练模型',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
            </svg>
        ),
        onClick: () => console.log('训练模型')
    },
    {
        id: 'evaluate',
        label: '评估',
        title: '评估模型性能',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" />
            </svg>
        ),
        onClick: () => console.log('评估模型性能')
    }
];

// 更多页面的按钮配置
export const getMorePageButtons = (): ButtonConfig[] => [
    {
        id: 'settings',
        label: '设置',
        title: '系统设置',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
            </svg>
        ),
        onClick: () => console.log('系统设置')
    },
    {
        id: 'help',
        label: '帮助',
        title: '获取帮助',
        icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z" />
            </svg>
        ),
        onClick: () => console.log('获取帮助')
    }
];

// 使用示例组件
interface ExampleUsageProps {
    pageType: 'process' | 'product' | 'model' | 'more';
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    onSend: (message: string) => void;
}

export const ExampleUsage: React.FC<ExampleUsageProps> = ({
    pageType,
    inputValue,
    setInputValue,
    onSend
}) => {
    const getButtonsForPage = (type: string): ButtonConfig[] => {
        switch (type) {
            case 'process':
                return getProcessPageButtons();
            case 'product':
                return getProductPageButtons();
            case 'model':
                return getModelPageButtons();
            case 'more':
                return getMorePageButtons();
            default:
                return [];
        }
    };

    return (
        <ChatInputBox
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSend={onSend}
            topButtons={getButtonsForPage(pageType)}
            placeholder={`在${pageType}页面输入您的问题...`}
        />
    );
};

export default {
    getProcessPageButtons,
    getProductPageButtons,
    getModelPageButtons,
    getMorePageButtons,
    ExampleUsage
};