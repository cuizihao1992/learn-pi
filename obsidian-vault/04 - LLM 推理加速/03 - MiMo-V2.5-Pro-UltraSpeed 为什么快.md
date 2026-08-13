---
title: "MiMo-V2.5-Pro-UltraSpeed 为什么快"
module: "LLM Inference Acceleration"
source_html: "modules/llm-inference-acceleration/mimo-ultraspeed.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/llm-inference-acceleration/mimo-ultraspeed.html"
tags:
  - learn-pi
  - module/llm-inference-acceleration
---

> Case Study

# MiMo-V2.5-Pro-UltraSpeed 为什么快

Xiaomi MiMo 官方文档称，MiMo × TileRT 的 UltraSpeed 模式让 MiMo-V2.5-Pro 这种 1T 级模型输出速度超过 1000 tokens/s。这个案例适合用来理解“模型算法 + 量化 + runtime + GPU kernel”如何共同决定端到端速度。

## 一、先不要误解：普通 Pro 也并行

普通大模型部署不是没有并行。矩阵乘法、attention head、MoE experts、tensor parallel、expert parallel 都在并行。真正的瓶颈是：自回归生成的外层 token 循环必须一个接一个推进。

```text
普通 Pro:
  大模型 forward 1 次 -> 1 token
  10 个 token -> 大约 10 次主模型 forward

UltraSpeed:
  DFlash 猜一块
  主模型验一块
  如果平均接受 6 个 token
  10 个 token 可能只需要约 2 次主模型验证
```

## 二、四层加速

| 层次 | 做了什么 | 省了什么 |
| --- | --- | --- |
| DFlash | 轻量 block drafter 一次预测多个未来 token。 | 减少主模型 forward 次数。 |
| Speculative verification | 主模型一次 forward 验证多个草稿位置，接受最长有效前缀。 | 把并行推进到 token 之间。 |
| FP4 + MoE | 官方称对 MoE Experts 做 FP4 QAT，降低模型大小和访存压力。 | 减少显存带宽压力，保留主要能力。 |
| TileRT | 用 persistent kernels、compute-transfer overlap、heterogeneous pipelines 等系统优化。 | 减少 kernel 启动、同步、通信和调度碎片。 |

## 三、GPU 调度碎片是什么

推理不是一个巨大的单一算子，而是一串 kernel 和通信步骤。速度很高时，每个 token 的预算进入毫秒甚至亚毫秒级，kernel 启动、等待、同步、显存搬运和 MoE 通信都会变成明显开销。

```text
RMSNorm kernel
QKV projection kernel
RoPE / Attention kernel
MoE routing
Expert GEMM
AllReduce / AllToAll
FFN kernel
...

如果每一步中间都有等待和切换，
GPU 就会“算一小段、停一下、再算一小段”。
```

TileRT 这类 runtime 要做的，就是把这些小停顿压缩掉，让计算、搬运、通信尽量重叠。

## 四、为什么任务会影响加速比

| 任务类型 | DFlash 接受率倾向 | 原因 |
| --- | --- | --- |
| 代码、格式化输出、确定性补全 | 较高 | 未来 token 更可预测，drafter 容易猜中。 |
| 开放聊天、创作、发散推理 | 较低 | 合理下一步很多，主模型更容易拒绝草稿。 |
| 长上下文场景 | 依赖实现 | DFlash drafter、SWA、KV cache 和 runtime 适配都会影响成本。 |

## 五、这是不是“最快模型”

更稳妥的说法是：MiMo UltraSpeed 是 2026 年被公开宣传的 1T 级模型高速推理代表案例之一。是否“最快”取决于统计口径：模型规模、硬件、batch、上下文长度、是否缓存命中、任务类型、是否峰值、是否端到端、是否质量无损。官方重点主张是 1T 级模型在通用 GPU 节点上超过 1000 tokens/s，而不是所有场景下绝对最快。

## 来源与延伸

- [Xiaomi MiMo × TileRT: 1T Model Breaks 1000 tokens/s](https://mimo.mi.com/docs/en-US/news/latest/1000tps)

- [Xiaomi MiMo Home](https://mimo.mi.com/)

- [DFlash paper](https://arxiv.org/abs/2602.06036)

- [vLLM DFlash docs](https://docs.vllm.ai/projects/speculators/en/latest/user_guide/algorithms/dflash/)
