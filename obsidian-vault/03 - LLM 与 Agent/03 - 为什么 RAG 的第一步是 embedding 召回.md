---
title: "为什么 RAG 的第一步是 embedding 召回"
module: "LLM Agent Interview"
source_html: "modules/llm-agent-interview/embedding-rag-deep-dive.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/llm-agent-interview/embedding-rag-deep-dive.html"
tags:
  - learn-pi
  - module/llm-agent-interview
---

> Deep Dive

# 为什么 RAG 的第一步是 embedding 召回

这一页只打穿一个点：RAG 不是“把资料塞给模型”，而是先把问题和文档片段放进同一个语义空间，用相似度找出最可能回答问题的证据，再交给 LLM 生成答案。

## 一句话模型

```text
Embedding 把 query 和 chunk 变成语义坐标；
相似度搜索找出离 query 最近的证据；
RAG 把这些证据放进 prompt，让 LLM 基于证据回答。
```

## 需要补的前置知识

| 知识点 | 够用理解 | 为什么需要 |
| --- | --- | --- |
| 向量 | 一串数字，表示对象在多个语义维度上的位置。 | embedding 的输出就是向量。 |
| 余弦相似度 | 比较两个向量方向是否接近。 | 常用于判断 query 和 chunk 是否语义相关。 |
| chunk | 文档切出来的知识片段。 | 检索单位太大不精确，太小会丢上下文。 |
| topK | 取相似度最高的 K 个候选。 | 控制召回广度、成本和噪音。 |
| rerank | 对初步召回结果做更精细排序。 | embedding 近不代表一定能回答问题。 |

## 底层链路

```text
离线入库：
文档 -> 清洗 -> 按语义切 chunk -> 每个 chunk 做 embedding -> 存向量库

在线提问：
用户问题 -> query embedding -> 向量相似度搜索 -> topK chunk
  -> 可选 rerank / 压缩
  -> 证据 + 问题拼成 prompt
  -> LLM 生成答案并引用来源
```

## 具体例子：为什么加息会影响股票估值

| 候选片段 | 内容 | 为什么相关或不相关 |
| --- | --- | --- |
| A | 利率上升会提高折现率，未来现金流折回今天的现值下降。 | 和 query 的“加息、估值、股票”语义高度相关。 |
| B | RAG 通过向量检索找到相关资料，再交给模型回答。 | 和 RAG 机制相关，但不能回答股票估值问题。 |
| C | Cesium 的 DrawCommand 会进入渲染命令列表。 | 属于渲染管线，和金融问题无关。 |

如果 query 是“为什么加息会影响股票估值？”，正确召回应该优先取 A。LLM 再基于 A 解释：加息提高无风险利率和折现率，未来现金流现值下降，高久期资产更敏感。

## 最小实验

打开教学 demo，分别输入金融、RAG、渲染、多模态相关问题，观察 query 向量和召回排序如何变化。

动手实验
[打开 Embedding Search Demo](examples/embedding-search/index.html)

## 常见误解

| 误解 | 更准确的说法 |
| --- | --- |
| RAG 就是向量库。 | 向量库只是检索组件；RAG 还包括数据清洗、切片、metadata、混合检索、rerank、prompt、引用和评估。 |
| 相似度最高的一定是最好证据。 | 不一定。embedding 相似可能只是主题接近，未必能回答问题，所以生产系统常加 rerank。 |
| chunk 越大越好。 | 太大噪音多、检索不精准；太小语义断裂。要按数据形态和评估结果调。 |
| 有长上下文就不需要 RAG。 | 长上下文解决“能放进去”，RAG 解决“从大知识库里找什么放进去”。两者互补。 |

## 失败模式

- 切片失败： 标题和正文被切开，query 找到正文却丢了限定条件。

- 领域不匹配： 通用 embedding 不懂内部术语、接口名或金融缩写。

- 只用向量： 错误码、股票代码、函数名等精确词可能召回差。

- topK 太小： 正确证据没进上下文。

- topK 太大： 噪音进入 prompt，模型被干扰。

## 自测问题

- 为什么 query 和 chunk 要用同一个 embedding 模型？

- 为什么“语义相似”不等于“能回答问题”？

- 为什么 RAG 常常要混合 BM25 关键词检索？

- 如果用户问“ERR_4219 怎么处理”，纯向量检索可能有什么问题？

- 如何判断 chunk 是太大还是太小？

## 面试回答骨架

```text
RAG 的第一步是把 query 和文档 chunk 映射到同一语义向量空间。
离线阶段我会清洗文档、按语义切片、记录 metadata 并生成 chunk embedding。
在线阶段把用户问题做 query embedding，先做 metadata 过滤，再做向量召回和 BM25 混合召回。
召回后用 rerank 精排，把最相关证据拼进 prompt，并要求模型基于证据回答和引用来源。
真正生产时还要评估 Recall@K、答案忠实度、延迟、成本和权限安全。
```
