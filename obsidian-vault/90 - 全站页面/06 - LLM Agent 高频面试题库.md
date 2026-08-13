---
title: "LLM / Agent 高频面试题库"
source_html: "pages/interview-bank.html"
site_url: "https://cuizihao1992.github.io/learn-pi/pages/interview-bank.html"
tags:
  - learn-pi
---

> Interview Bank

# LLM / Agent 高频面试题库

这不是背答案页面，而是训练你把一个点讲成系统。每道题都按“结论、链路、取舍、失败模式、评估”来准备。

## Agent 系统题

- 请设计一个长期陪伴型 AI 的记忆系统。

- Agent 为什么需要 toolCall / toolResult 闭环，而不是让模型直接执行？

- 如何设计一个安全的工具系统？如何限制文件、命令和网络？

- 如何让前端看到 Agent 的执行过程？事件流应该有哪些事件？

- 如何做 Agent 的失败恢复？工具失败、模型超时、参数错误分别怎么办？

- 如何评估一个 Agent 是否真的会用工具？

## RAG 工程题

- 从 PDF 到向量库，完整数据链路怎么做？

- chunk size 怎么选？为什么不能只按固定长度切？

- 为什么向量检索还要配 BM25？

- rerank 放在什么位置？解决什么问题？

- RAG 怎么做权限过滤和版本更新？

- RAG 怎么评估召回质量和答案忠实度？

## 长上下文题

- 长上下文模型会替代 RAG 吗？

- 什么是 lost in the middle？系统设计上怎么规避？

- Long RAG 和普通 RAG 的差别是什么？

- 什么时候直接塞长上下文更合适？什么时候必须用 RAG？

## Transformer 底层题

- 为什么 self-attention 是 O(n^2)？

- FlashAttention 解决了什么？它是否改变复杂度？

- KV Cache 为什么会成为推理瓶颈？

- GQA / MQA 为什么能提升推理吞吐？

- PagedAttention 的分页思想解决什么问题？

- RoPE Scaling 和 ALiBi 分别改善什么？

## 两分钟答题模板

```text
我的结论是...
系统链路是...
关键取舍有三个：成本、延迟、准确率/安全性。
主要失败模式是...
评估指标包括...
如果落到生产，我会先做 MVP，再加监控、评测和权限。
```
