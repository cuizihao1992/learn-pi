---
title: "从 embedding 到 RAG，再到多模态和前沿模型训练"
module: "LLM Agent Interview"
source_html: "modules/llm-agent-interview/embedding-rag-multimodal.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/llm-agent-interview/embedding-rag-multimodal.html"
tags:
  - learn-pi
  - module/llm-agent-interview
---

> Embedding / RAG / Multimodal

# 从 embedding 到 RAG，再到多模态和前沿模型训练

这页补的是大模型应用和模型训练的底层地图：embedding 把信息变成可比较的向量，RAG 用向量检索给大模型补外部知识，多模态模型把图像、音频、视频等模态接入语言智能，前沿模型训练则是数据、算力、算法、工程、对齐和安全共同完成的系统工程。

## 一、先抓住总图

```text
Embedding
  = 文本、图片、代码、音频等对象的语义坐标

Vector Database
  = 存储向量并支持相似度搜索

RAG
  = 用户问题 embedding -> 检索相关资料 -> LLM 基于资料回答

LLM
  = 根据上下文预测和生成 token 的语言推理核心

Multimodal Model
  = LLM + 图像/音频/视频等模态编码与对齐

Frontier Model
  = 数据工厂 + 超算训练 + 后训练对齐 + 安全评估 + 产品部署
```

## 二、Embedding 是什么

Embedding 是把对象映射成一串浮点数向量。向量之间的距离代表相关性：语义越接近，向量距离通常越近。比如“苹果手机”和“iPhone”在向量空间里会比“香蕉”更接近。

| 对象 | 可 embedding 的内容 | 常见用途 |
| --- | --- | --- |
| 词或概念 | “风险溢价”“RAG”“DrawCommand” | 术语索引、概念相似度、聚类。 |
| 问题或提示词 | “为什么利率上升会压低股票估值？” | 语义搜索、找相似问答、RAG query。 |
| 文档片段 | 一段课程、一节 API 文档、一段代码说明 | 知识库检索、文档问答。 |
| 图片或音频 | 图片视觉特征、语音片段、视频帧 | 图文检索、多模态问答、推荐。 |

## 三、Embedding 和大模型的关系

大语言模型内部也会把 token 转成向量表示，但应用层常说的 embedding 模型，通常是为了检索、分类、聚类、推荐和相似度计算。

| 类型 | 作用 | 你可以怎么理解 |
| --- | --- | --- |
| LLM 内部 token embedding | 把 token 变成模型可计算的向量，参与 Transformer 推理。 | 模型“读懂上下文”的输入表示。 |
| 外部 embedding API / 模型 | 把文本或图片变成向量，用于搜索和相似度。 | 应用系统里的“语义坐标生成器”。 |
| LLM 生成能力 | 根据上下文生成自然语言、代码、推理步骤。 | 负责组织答案，不负责高效地查全库。 |

一句话区分：embedding 模型回答“哪些内容语义接近”，LLM 回答“该如何生成一个答案”。

## 四、Embedding 和 RAG 的关系

```text
文档入库：
原始文档 -> 清洗 -> 切 chunk -> chunk embedding -> 向量库

用户提问：
问题 -> query embedding -> 相似度检索 -> 取回证据 -> 拼 prompt -> LLM 回答
```

RAG 的关键是把“外部知识”放在模型参数之外。模型不用把所有企业文档、课程内容和实时资料都记在参数里，而是在回答时通过 embedding 检索相关片段，再由 LLM 组织答案。这样可以更新知识、追溯来源，也能降低幻觉。

## 五、如何对提示词或概念做 embedding

概念可以直接 embedding，但更推荐 embedding 它的解释，因为上下文更完整，向量更稳定。

```text
不够稳定：
embedding("风险溢价")

更稳定：
embedding("风险溢价是投资者为了承担不确定性而要求的额外收益，常用于解释股票、信用债和流动性风险定价。")
```

提示词也可以直接 embedding，尤其适合作为 RAG query。

```text
query = "请解释 RAG 和 embedding 的关系"
queryVector = embedding(query)
results = vectorDatabase.search(queryVector, topK=5)
```

如果用 Python 调 API，基本形态如下：

```text
from openai import OpenAI

client = OpenAI()

result = client.embeddings.create(
    model="text-embedding-3-small",
    input="风险溢价是投资者为了承担不确定性而要求的额外收益。"
)

vector = result.data[0].embedding
print(len(vector))
print(vector[:5])
```

动手实验
[打开 Embedding Search Demo](examples/embedding-search/index.html)

深入理解
[[03 - LLM 与 Agent/03 - 为什么 RAG 的第一步是 embedding 召回|继续看 Embedding -> RAG 召回深挖]]

## 六、多模态模型如何训练

多模态模型要解决的是跨模态对齐：像素、语音波形、视频帧和文字 token 都不是同一种数据，但模型需要知道图片里的“狗”和文本里的“dog / 狗 / puppy”指向同一类概念。

| 路线 | 核心做法 | 代表思路 |
| --- | --- | --- |
| 对比学习 | 训练图像编码器和文本编码器，让正确图文对距离近，错误图文对距离远。 | CLIP 用大规模图文对学习可迁移视觉表示。 |
| 视觉编码器 + LLM | 图片先经 vision encoder，再用 adapter/projector 转成 LLM 可接收的表示。 | LLaVA 连接视觉编码器和 LLM，并做视觉指令微调。 |
| 交错多模态序列 | 训练模型处理图片、视频和文本交错出现的上下文。 | Flamingo 面向少样本视觉语言任务。 |
| 原生多模态 | 训练目标和数据管线从一开始就覆盖文本、图像、音频、视频等。 | Gemini 报告强调图像、音频、视频和文本理解。 |

## 七、多模态模型和纯 LLM 的区别

| 维度 | 纯文本 LLM | 多模态模型 |
| --- | --- | --- |
| 输入 | 文本 token、代码 token。 | 文本、图片、音频、视频、屏幕截图、图表。 |
| 训练难点 | 语言建模、知识、推理、指令跟随。 | 跨模态对齐、视觉细节、音视频时序、图表/OCR。 |
| 结构 | Tokenizer + Transformer。 | 模态编码器 + 投影层 + LLM，或原生多模态 Transformer。 |
| 典型任务 | 问答、写作、代码、推理。 | 看图问答、视频理解、语音对话、图表分析、屏幕操作。 |

## 八、顶级模型训练流程

```text
立项定义能力目标
  -> 数据收集、清洗、去重、质量过滤、权限和合规治理
  -> tokenizer / 多模态编码器 / 模型结构设计
  -> 小模型实验和 scaling law 预测
  -> 大规模预训练：分布式训练、容错、checkpoint、监控
  -> 后训练：SFT、RLHF、RLAIF、工具调用、多模态指令微调
  -> 安全评估：红队、危险能力、隐私、偏见、越狱、模型卡
  -> 推理优化：量化、蒸馏、KV cache、路由、延迟和成本
  -> 产品接入：Chat、API、企业权限、监控、反馈闭环
  -> 持续迭代：失败案例、数据回流、再训练和版本发布
```

## 九、需要哪些团队

公开资料通常不会给出“每个部门精确多少人”。但可以确认的是，Gemini、GPT-4、Claude 这类模型不是单个研究组能完成的，而是公司级工程。Gemini 1.0 技术报告作者列表超过千人，GPT-4 技术报告作者列表也覆盖大量研究、工程、产品、安全和基础设施角色。

| 团队 | 典型规模 | 主要工作 |
| --- | --- | --- |
| 核心研究 | 20-80 | 模型结构、训练目标、优化算法、实验路线。 |
| 训练工程 | 30-150 | 分布式训练、并行策略、容错、吞吐、checkpoint。 |
| 数据团队 | 50-300 | 数据采集、清洗、去重、质量过滤、多语言和合规处理。 |
| 多模态团队 | 30-150 | 图像、音频、视频编码器和跨模态对齐。 |
| 后训练团队 | 30-150 | SFT、RLHF、RLAIF、偏好数据、指令跟随、风格。 |
| 评测和安全 | 50-300 | benchmark、红队、危险能力、模型卡、发布门槛。 |
| 推理系统 | 50-300 | Serving、KV cache、量化、蒸馏、路由、成本和延迟。 |
| 产品和平台 | 50-300 | Chat 产品、API、企业功能、计费、权限、反馈。 |
| 基础设施 | 100-1000+ | GPU/TPU 集群、网络、存储、调度、监控、电力和供应链。 |
| 外部专家和标注 | 数百到数千 | 偏好标注、专业评测、红队、领域数据构造。 |

面试或学习时要注意区分：真正直接盯一次主训练 run 的核心团队可能是几十到一两百人；但把模型训练、评估、部署成 ChatGPT、Gemini、Claude 这样的产品，参与人数会扩展到数百甚至上千。

## 十、参考资料

- [OpenAI Embeddings 文档](https://developers.openai.com/api/docs/guides/embeddings)

- [OpenAI text and code embeddings](https://openai.com/index/introducing-text-and-code-embeddings/)

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)

- [CLIP: Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020)

- [Flamingo: a Visual Language Model for Few-Shot Learning](https://arxiv.org/abs/2204.14198)

- [LLaVA / Visual Instruction Tuning](https://arxiv.org/abs/2304.08485)

- [GPT-4 Technical Report](https://arxiv.org/abs/2303.08774)

- [GPT-4o System Card](https://openai.com/index/gpt-4o-system-card/)

- [Gemini Technical Report](https://arxiv.org/abs/2312.11805)

- [Anthropic Constitutional AI](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback)

- [Claude Constitution](https://www.anthropic.com/constitution)
