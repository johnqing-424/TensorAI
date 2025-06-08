# ChatInputBox 组件使用指南

## 概述

`ChatInputBox` 是一个高度可定制的聊天输入框组件，支持自定义按钮配置，适用于不同页面的特定需求。

## 特性

- 🎨 **高度可定制**: 支持顶部和底部按钮配置
- 📱 **响应式设计**: 适配移动端和桌面端
- 🌙 **深色主题**: 自动适配系统主题
- ♿ **无障碍支持**: 完整的键盘导航和屏幕阅读器支持
- 🔄 **向后兼容**: 保持与旧版本的兼容性

## 基本用法

```tsx
import ChatInputBox from '../Common/ChatInputBox';

function MyComponent() {
  const [inputValue, setInputValue] = useState('');
  
  const handleSend = (message: string) => {
    console.log('发送消息:', message);
  };
  
  return (
    <ChatInputBox
      inputValue={inputValue}
      setInputValue={setInputValue}
      onSend={handleSend}
      placeholder="请输入您的问题..."
    />
  );
}
```

## 自定义按钮配置

### 按钮配置接口

```tsx
interface ButtonConfig {
  id: string;              // 唯一标识符
  label: string;           // 按钮文本
  icon?: React.ReactNode;  // 按钮图标
  onClick: () => void;     // 点击事件处理
  active?: boolean;        // 是否激活状态
  disabled?: boolean;      // 是否禁用
  title?: string;          // 悬停提示文本
}
```

### 顶部按钮示例

```tsx
const topButtons: ButtonConfig[] = [
  {
    id: 'template',
    label: '模板',
    title: '选择模板',
    icon: <TemplateIcon />,
    onClick: () => console.log('选择模板')
  },
  {
    id: 'upload',
    label: '上传',
    title: '上传文件',
    icon: <UploadIcon />,
    onClick: () => console.log('上传文件')
  }
];

<ChatInputBox
  inputValue={inputValue}
  setInputValue={setInputValue}
  onSend={handleSend}
  topButtons={topButtons}
/>
```

### 底部按钮示例

```tsx
const bottomButtons: ButtonConfig[] = [
  {
    id: 'save',
    label: '保存',
    title: '保存草稿',
    icon: <SaveIcon />,
    onClick: () => console.log('保存草稿')
  }
];

<ChatInputBox
  inputValue={inputValue}
  setInputValue={setInputValue}
  onSend={handleSend}
  bottomButtons={bottomButtons}
/>
```

## 完整属性列表

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `inputValue` | `string` | - | 输入框的值（必需） |
| `setInputValue` | `React.Dispatch<React.SetStateAction<string>>` | - | 设置输入框值的函数（必需） |
| `placeholder` | `string` | `'发消息，输入 @ 选择技能或选择文件'` | 占位符文本 |
| `onSend` | `(message: string) => void` | `() => {}` | 发送消息的回调函数 |
| `className` | `string` | `''` | 自定义CSS类名 |
| `disabled` | `boolean` | `false` | 是否禁用输入框 |
| `maxHeight` | `number` | `150` | 输入框最大高度（像素） |
| `topButtons` | `ButtonConfig[]` | `[]` | 顶部按钮配置 |
| `bottomButtons` | `ButtonConfig[]` | `[]` | 底部按钮配置 |

## 向后兼容属性

为了保持向后兼容，组件还支持以下属性：

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `isDeepThinking` | `boolean` | `false` | 深度思考模式状态 |
| `toggleDeepThinking` | `() => void` | `() => {}` | 切换深度思考模式 |
| `showFileUpload` | `boolean` | `true` | 是否显示文件上传按钮 |
| `showDeepThinking` | `boolean` | `true` | 是否显示深度思考按钮 |
| `customButtons` | `React.ReactNode` | - | 自定义按钮内容 |
| `buttonsPosition` | `'top' \| 'bottom' \| 'both'` | `'bottom'` | 按钮位置 |

## 页面特定配置示例

查看 `ChatInputBoxExamples.tsx` 文件了解如何为不同页面配置特定的按钮：

- **流程页面**: 模板选择、审批流程
- **产品页面**: 功能查看、文档访问
- **模型页面**: 模型训练、性能评估
- **更多页面**: 系统设置、帮助文档

## 样式定制

组件使用 CSS 变量，可以通过覆盖以下变量来定制样式：

```css
.chat-input-box {
  --input-bg: rgba(255, 255, 255, 0.75);
  --input-border: rgba(234, 235, 238, 0.5);
  --input-border-radius: 12px;
  --button-bg: rgba(255, 255, 255, 0.8);
  --button-hover-bg: rgba(255, 255, 255, 0.95);
  --primary-color: #007bff;
}
```

## 键盘快捷键

- `Enter`: 发送消息
- `Shift + Enter`: 换行
- `Tab`: 在按钮间导航

## 无障碍支持

- 完整的键盘导航支持
- 屏幕阅读器友好的标签和描述
- 高对比度模式支持
- 焦点管理

## 注意事项

1. 确保为每个按钮提供唯一的 `id`
2. 为按钮提供有意义的 `title` 属性以改善用户体验
3. 图标应该具有适当的尺寸（推荐 16x16px）
4. 避免在按钮中放置过多文本，保持界面简洁

## 更新日志

### v2.0.0
- 重构为独立组件
- 添加自定义按钮配置支持
- 改进响应式设计
- 添加深色主题支持
- 增强无障碍功能

### v1.0.0
- 初始版本
- 基本输入功能
- 文件上传和深度思考按钮