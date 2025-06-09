# 数学公式测试

## 行内公式测试
这是一个行内公式：$E = mc^2$，应该正确渲染。

另一个行内公式：$\text{Attention}(Q, K, V) = \text{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$

## 块级公式测试
这是一个块级公式：
$$\text{MultiHead}(Q, K, V) = \text{Concat}(head_1, ..., head_h)W^O$$

其中：
$$head_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

## 引用标记测试
这里有一个引用标记 ((1))，应该显示为文档图标。

旧格式引用 ##2$$ 应该被转换为新格式。

## 混合内容测试
在包含公式 $f(x) = x^2$ 和引用 ((3)) 的段落中，两者应该都能正确显示。