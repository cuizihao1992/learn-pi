---
title: "Transformer 处理超长上下文的瓶颈与优化方案"
module: "LLM Agent Interview"
source_html: "modules/llm-agent-interview/transformer-long-context.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/llm-agent-interview/transformer-long-context.html"
tags:
  - learn-pi
  - module/llm-agent-interview
---

> Transformer

# Transformer 处理超长上下文的瓶颈与优化方案

这类题的核心不是背 FlashAttention、GQA、PagedAttention 的名字，而是先讲清楚瓶颈在哪里：自注意力平方复杂度、KV Cache 显存与带宽压力、位置编码外推问题。然后再说明每种优化分别打在哪个瓶颈上。

## 一、三大核心瓶颈

| 瓶颈 | 本质 | 表现 |
| --- | --- | --- |
| 计算复杂度 | 自注意力要计算每个 token 与其他 token 的关系，复杂度约 O(n^2)。 | 上下文长度翻倍，注意力矩阵计算和中间数据迅速膨胀。 |
| KV Cache 显存墙 | 推理生成时要保存历史 token 的 Key / Value，越长越占显存。 | 并发下降、显存碎片、带宽搬运成为瓶颈。 |
| 位置编码外推 | 模型训练时见过的位置长度有限，直接拉长可能破坏位置信号。 | 长文本后半段或中间段理解变差，输出不稳定。 |

## 二、为什么 O(n^2) 麻烦

在标准 self-attention 中，输入长度是 n，每个 token 都要和 n 个 token 计算注意力分数，所以注意力矩阵规模是 n x n。短文本时这很强，因为模型可以全局建模；长文本时它会变成计算和显存压力。注意：FlashAttention 优化的是显存读写和中间存储，并不把标准注意力的数学复杂度变成线性。

```text
Q = XWq, K = XWk, V = XWv
Attention(Q,K,V) = softmax(QK^T / sqrt(d))V

QK^T 的形状约为 n x n
n 越大，中间注意力矩阵越大
```

## 三、FlashAttention：解决 IO 搬运瓶颈

GPU 计算很快，但从高带宽显存反复读写大矩阵很贵。FlashAttention 的思路是分块计算注意力，把 softmax 和矩阵乘法融合起来，避免把完整注意力矩阵写回显存。它是精确注意力，不是近似注意力；收益来自 IO-aware 计算和 tiling。

- 解决什么： 减少 HBM 读写和中间显存占用。

- 不解决什么： 不从根本上消除全局注意力的 O(n^2) 关系计算。

- 面试说法： 它让同样的注意力计算更省显存、更快，尤其适合训练和长 prompt prefilling。

## 四、GQA / MQA：减少 KV Cache

多头注意力中，每个 query head 通常对应自己的 key/value head。长文本推理时，KV Cache 会随层数、head 数、序列长度、batch 增长。MQA 让多个 query head 共享一组 K/V；GQA 是折中方案，让一组 query head 共享 K/V。这样能显著减少 KV Cache 大小，提升推理吞吐和并发。

| 方式 | KV 头数量 | 特点 |
| --- | --- | --- |
| MHA | 每个 query head 都有 K/V | 效果强，但 KV Cache 大。 |
| MQA | 所有 query head 共享一组 K/V | KV 最省，但可能影响效果。 |
| GQA | 一组 query head 共享 K/V | 在质量和推理效率之间折中。 |

## 五、PagedAttention：管理 KV Cache 碎片

在线推理服务不是只处理一个请求。不同用户 prompt 长度不同，生成长度不同，KV Cache 生命周期不同，显存会碎片化。PagedAttention 借鉴操作系统分页，把 KV Cache 拆成固定大小的块，不要求连续显存，从而提高显存利用率和吞吐。

- 解决什么： 长上下文、多并发服务中的 KV Cache 分配和碎片问题。

- 为什么像分页： 逻辑上连续的序列，可以映射到物理上不连续的显存块。

- 工程意义： 同样显存下能服务更多请求，减少因为预留过多连续显存导致的浪费。

## 六、位置编码优化

模型需要知道 token 的顺序。RoPE 把位置信息编码到 query/key 的旋转中，长上下文扩展时常见做法是 RoPE scaling，让模型能适配更长位置。ALiBi 则给注意力分数加入随距离变化的偏置，鼓励模型关注近处，同时具备一定外推能力。

| 方法 | 思路 | 面试重点 |
| --- | --- | --- |
| RoPE Scaling | 调整旋转位置频率或尺度，扩展可用上下文。 | 常用于已有 RoPE 模型的长上下文扩展。 |
| ALiBi | 对远距离 token 加线性偏置。 | 结构简单，有较好的长度外推倾向。 |
| 位置插值 | 把更长位置压缩映射到训练过的位置范围。 | 可能需要继续训练来稳定效果。 |

## 七、其他工程策略

- Sliding Window Attention： 只看局部窗口，适合局部依赖强的任务。

- Sparse Attention： 只计算部分注意力边，降低复杂度，但会改变模型能力边界。

- Chunked Prefill： 长 prompt 分块预填充，降低服务峰值显存压力。

- Context Compression： 先摘要、抽取、重排，再输入模型，属于系统层优化。

## 八、面试总结句

```text
Transformer 长上下文的瓶颈主要有三类：
第一是 self-attention 的 O(n^2) 计算和中间数据；
第二是推理阶段 KV Cache 带来的显存容量、显存带宽和碎片问题；
第三是位置编码对训练长度之外的外推能力。
FlashAttention 主要优化注意力计算的 IO 和显存占用；
GQA/MQA 减少 KV Cache；
PagedAttention 改善在线服务中的 KV Cache 分配；
RoPE Scaling、ALiBi 等方法改善位置外推。
真实系统通常需要算子、模型结构、推理引擎和 RAG/压缩策略一起优化。
```
