---
title: "预测一个 token 和验收多个 token，不是一回事"
module: "LLM Inference Acceleration"
source_html: "modules/llm-inference-acceleration/speculative-decoding.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/llm-inference-acceleration/speculative-decoding.html"
tags:
  - learn-pi
  - module/llm-inference-acceleration
---

> Speculative Decoding

# 预测一个 token 和验收多个 token，不是一回事

普通自回归模型每次 forward 只能确定下一个 token。投机解码的想法是：让便宜的 drafter 先猜一段，再让昂贵的大模型 verifier 一次验证多个位置。如果草稿足够准，主模型 forward 次数就会大幅减少。

## 一、普通生成为什么慢

```text
上下文: A B C
大模型 forward -> D
上下文: A B C D
大模型 forward -> E
上下文: A B C D E
大模型 forward -> F
```

每一步内部都有矩阵乘法、attention head、MoE expert、tensor parallel 等并行。但外层 token 循环仍然串行：不知道 D，就无法正确条件化 E。

## 二、验收和预测的区别

| 动作 | 输入 | 输出 | 关键成本 |
| --- | --- | --- | --- |
| 预测 | 真实前缀 A B C | 从全词表选择 D | 1 次主模型 forward 推进 1 个 token。 |
| 验收 | 真实前缀 A B C + 草稿 D E F G | 检查每个草稿 token 是否符合主模型分布 | 1 次主模型 forward 可能推进多个 token。 |

验收不是免费，也不是简单判断对错。大模型仍要算这些位置的 logits。收益来自：验证 8 个 token 的成本小于做 8 次单 token 预测。

## 三、投机解码链路

```text
1. drafter 快速生成草稿: D E F G H I J K
2. verifier 大模型一次 forward 验证这些位置
3. 从左到右接受最长有效前缀
4. 如果前 6 个通过，就一次推进 6 个 token
5. 第 7 个不通过，就从那里回到主模型修正
```

## 四、小模型为什么必须又快又准

| 情况 | 结果 |
| --- | --- |
| drafter 很快但太弱 | 大模型拒绝多，平均接受长度短，加速有限。 |
| drafter 很准但太大 | 草稿成本吃掉省下的主模型时间。 |
| drafter 又快又接近主模型 | 接受率高，主模型 forward 次数显著减少。 |

## 五、DFlash 的特殊点

传统 drafter 也可能一个 token 一个 token 草拟，仍有自己的串行瓶颈。DFlash 用轻量 block diffusion / masked parallel prediction 模型，一次 forward 生成一个 block 的候选 token，并用目标模型的 hidden states 作为条件。vLLM Speculators 文档也把 DFlash 描述为：小 diffusion-LLM draft model 一次预测整块 token，再由目标模型验证。

```text
普通 drafter:
  guess D -> guess E -> guess F -> guess G

DFlash drafter:
  [MASK] [MASK] [MASK] [MASK]
  -> D E F G，一次生成一块
```

## 来源与延伸

- [DFlash: Block Diffusion for Flash Speculative Decoding](https://arxiv.org/abs/2602.06036)

- [vLLM Speculators: DFlash](https://docs.vllm.ai/projects/speculators/en/latest/user_guide/algorithms/dflash/)
