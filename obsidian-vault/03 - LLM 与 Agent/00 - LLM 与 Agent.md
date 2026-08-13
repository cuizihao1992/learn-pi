---
title: "LLM / Agent 系统课程入口"
module: "LLM Agent Interview"
source_html: "modules/llm-agent-interview/index.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/llm-agent-interview/index.html"
tags:
  - learn-pi
  - module/llm-agent-interview
---

> LLM Agent Interview

# LLM / Agent 系统课程入口

这个模块不只是面试题清单，而是一条从“模型如何理解输入”走到“Agent 如何调用工具、记住用户、检索知识、组织回答”的系统课程。学习目标是：能用一个具体问题讲清 embedding、RAG、记忆、长上下文和工具调用之间的关系，并能说出真实工程里的取舍与失败模式。

## 这个模块解决什么问题

| 问题 | 本模块给你的能力 |
| --- | --- |
| 模型为什么能“理解”一句话？ | 用 embedding、token、语义空间解释文本如何变成可计算的向量。 |
| Agent 为什么需要 RAG？ | 解释模型参数记忆、上下文窗口和外部知识库的边界。 |
| 长期记忆和 RAG 是一回事吗？ | 区分用户画像、情景记忆、知识检索、工具状态和会话上下文。 |
| 长上下文会不会取代检索？ | 从成本、注意力退化、证据更新和权限控制解释二者互补。 |
| 面试时怎么讲得像做过系统？ | 按输入、存储、检索、排序、拼 prompt、生成、评估的链路回答。 |

## 先记住总框架

```text
用户问题
  -> 会话短期上下文
  -> 用户画像和长期记忆
  -> RAG 检索外部知识
  -> 长上下文模型做综合推理
  -> Agent 选择工具或生成回答
  -> 后台异步更新记忆、索引和评估日志
```

## 学习前需要先懂什么

- 向量： 一组数字，可以表示词、句子、图片、用户偏好或文档片段。

- 相似度： 两个向量方向越接近，通常代表语义越相关。

- 上下文窗口： 模型一次能看到的 token 范围，不等于永久记忆。

- 工具调用： 模型决定要不要把任务交给外部函数、数据库、搜索、代码或业务系统。

- 评估： 不要只看回答是否流畅，还要看证据是否正确、延迟是否可接受、失败能否复现。

## 推荐学习顺序

- 先看 [[03 - LLM 与 Agent/03 - 为什么 RAG 的第一步是 embedding 召回|Embedding -> RAG 深挖]]，用一个具体例子理解“语义召回”这件事。

- 再看 [[03 - LLM 与 Agent/04 - RAG 向量数据全流程工程化方案|RAG 数据工程]]，把文档、切片、向量库、混合检索、rerank 和评估串起来。

- 再看 [[03 - LLM 与 Agent/01 - 长期陪伴型 AI 角色的记忆机制怎么设计|AI 记忆机制]]，区分短期上下文、长期记忆、用户画像和异步更新。

- 再看 [[03 - LLM 与 Agent/05 - 长上下文模型会取代 RAG 吗|长上下文 vs RAG]]，理解为什么真实系统常常两者都要。

- 最后看 [[03 - LLM 与 Agent/06 - Transformer 处理超长上下文的瓶颈与优化方案|Transformer 长文本优化]]，把成本和显存问题讲到底层。

## 课程单元

### 长期记忆机制

回答长期陪伴型 AI 如何记住用户：短期对话、实体画像、长期情景记忆、异步抽取、冲突处理、遗忘机制。
[[03 - LLM 与 Agent/01 - 长期陪伴型 AI 角色的记忆机制怎么设计|进入记忆机制]]

### Embedding 与多模态

回答 embedding 是什么、它和 LLM/RAG 的关系、多模态模型如何训练，以及 ChatGPT/Gemini/Claude 级模型背后的工程组织。
[[03 - LLM 与 Agent/02 - 从 embedding 到 RAG，再到多模态和前沿模型训练|进入底层地图]]

### Embedding -> RAG 深挖

只打穿一个点：query 和 chunk 如何进入同一语义空间，如何召回证据，以及为什么生产 RAG 容易失败。
[[03 - LLM 与 Agent/03 - 为什么 RAG 的第一步是 embedding 召回|进入深挖]]

### RAG 数据工程

回答从原始文档到向量库到混合检索再到 rerank 的完整链路，重点讲数据质量、切片、元数据、索引和评估闭环。
[[03 - LLM 与 Agent/04 - RAG 向量数据全流程工程化方案|进入 RAG 工程]]

### 长上下文 vs RAG

回答长上下文是否会取代 RAG：不会取代，而是互补。RAG 管广度，长上下文管深度，主流是 Long RAG。
[[03 - LLM 与 Agent/05 - 长上下文模型会取代 RAG 吗|进入长上下文]]

### Transformer 长文本优化

回答 O(n²) 计算、KV Cache 显存墙、位置编码外推，及 FlashAttention、GQA、PagedAttention、RoPE Scaling、ALiBi。
[[03 - LLM 与 Agent/06 - Transformer 处理超长上下文的瓶颈与优化方案|进入长文本优化]]

### 角色优先级与缓存

回答 system/developer/user/tool 的优先级从哪里来，Agent 运行日志如何增长，以及 CPU、浏览器、Prompt Cache、KV Cache 的底层关系。
[[03 - LLM 与 Agent/07 - 角色优先级、运行日志和缓存到底是什么关系|进入运行时缓存]]

## 本模块先打穿的点

第一篇深挖专题
[[03 - LLM 与 Agent/03 - 为什么 RAG 的第一步是 embedding 召回|Embedding 到 RAG 召回：一句话如何找到正确证据]]

这篇深挖页用“加息如何影响股票估值”的例子，把 query、chunk、向量空间、topK、rerank 和 prompt 拼接讲成一条链路。学完后再看 RAG 工程页，会更容易理解为什么生产系统经常不是模型不聪明，而是数据、切片、召回和评估出了问题。

## 配套实验

| 实验 | 观察什么 | 对应概念 |
| --- | --- | --- |
| Embedding Search Demo | 修改查询句，看最相近的文档片段如何变化。 | 向量相似度、召回、topK。 |
| Mini RAG Demo | 观察文档切片、证据召回、prompt 拼接和引用回答。 | RAG 最小闭环。 |
| RAG Evaluation Demo | 用标准问题和期望证据定位召回错误、答案编造和要点遗漏。 | Recall@K、MRR、忠实度。 |
| Mini Agent 实战路线 | 把检索、工具调用和前端事件流接成最小产品。 | Agent loop、tool result、工程闭环。 |
| Pi Agent 生命周期 | 对照真实工程里的 prompt、toolCall、toolResult 和 final answer。 | 生产 Agent 的运行时边界。 |

## 面试官真正想听什么

- 不是只背名词： 要能说出为什么需要分层、为什么 RAG 不能只靠向量检索、为什么长上下文仍有成本和注意力问题。

- 要有系统链路： 输入、存储、检索、排序、拼 prompt、调用模型、异步更新、监控评估。

- 要有工程取舍： 精度 vs 延迟、成本 vs 上下文长度、召回率 vs 幻觉、同步响应 vs 异步记忆。

- 要能讲失败模式： 记忆冲突、脏数据、切片断语义、embedding 域不匹配、lost in the middle、KV Cache 爆显存。

## 自测问题

- 如果用户问“我上次说的项目叫什么”，应该走 RAG、长期记忆，还是会话上下文？为什么？

- 为什么只用向量检索可能召回语义相关但事实不对的片段？

- 为什么把所有文档塞进长上下文仍然可能答错？

- 如何判断一个 RAG 系统失败是切片问题、召回问题、排序问题，还是生成问题？

- 如果要把这个能力接进 Mini Agent，最小的数据结构和接口应该是什么？

## 和其他模块的关系

- [[02 - Mini Agent/00 - Mini Agent|Mini Agent]] 负责把这里的概念做成能跑的最小系统。

- [[01 - Pi Agent/00 - Pi Agent|Pi Agent]] 负责对照真实产品级 Agent 的生命周期和源码结构。

- [[90 - 全站页面/08 - 每个模块只先打穿一个关键点|模块深挖路线]] 负责把这个模板复制到地图、量化、经济金融、核电池等模块。

## 主要参考

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)

- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)

- [FlashAttention](https://arxiv.org/abs/2205.14135)

- [PagedAttention / vLLM](https://arxiv.org/abs/2309.06180)

- [Grouped-Query Attention](https://arxiv.org/abs/2305.13245)

- [RoPE / RoFormer](https://arxiv.org/abs/2104.09864)

- [ALiBi](https://arxiv.org/abs/2108.12409)
