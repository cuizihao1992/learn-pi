---
title: "为什么 1T 大模型也能跑到 1000 tokens/s"
module: "LLM Inference Acceleration"
source_html: "modules/llm-inference-acceleration/index.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/llm-inference-acceleration/index.html"
tags:
  - learn-pi
  - module/llm-inference-acceleration
---

> Inference Systems

# 为什么 1T 大模型也能跑到 1000 tokens/s

这个模块来自一段关于 Xiaomi MiMo-V2.5-Pro-UltraSpeed、DFlash、投机解码、TileRT 和 GPU 调度碎片的对话。核心问题不是“谁最快”这么简单，而是理解：大模型生成为什么慢，普通部署已经有哪些并行，UltraSpeed 又把并行推进到了哪一层。

## 这个模块解决什么问题

| 问题 | 训练出的能力 |
| --- | --- |
| 普通 LLM 明明用了 GPU，为什么生成还是一个 token 一个 token 慢慢出？ | 区分 token 内部并行和 token 之间的自回归串行瓶颈。 |
| 验收多个 token 为什么比逐 token 预测快？ | 理解 speculative decoding：小模型草稿，大模型并行验证，接受最长有效前缀。 |
| DFlash drafter 和普通小模型有什么区别？ | 理解 block diffusion / masked parallel prediction 一次生成一块草稿。 |
| TileRT、persistent kernel、GPU 调度碎片到底在解决什么？ | 理解模型算法省下的 forward 次数，必须靠 runtime 把 GPU 执行缝隙吃掉。 |

## 学习入口

### 模块宪章

规定推理加速内容怎么写：先讲瓶颈，再讲算法，再讲系统，再讲硬件执行。
[[04 - LLM 推理加速/01 - 推理加速内容怎么写|查看宪章]]

### 投机解码原理

讲清预测和验收的区别、小模型为什么要快、接受率如何决定加速比。
[[04 - LLM 推理加速/02 - 预测一个 token 和验收多个 token，不是一回事|进入原理]]

### MiMo UltraSpeed 案例

用 Xiaomi MiMo-V2.5-Pro-UltraSpeed 拆解 FP4、DFlash、MoE 和 TileRT 如何协同。
[[04 - LLM 推理加速/03 - MiMo-V2.5-Pro-UltraSpeed 为什么快|查看案例]]

### 运行时缓存

推理加速还要理解 KV Cache、Prompt Cache 和 CPU/GPU 缓存的底层差异。
[[03 - LLM 与 Agent/07 - 角色优先级、运行日志和缓存到底是什么关系|回到缓存]]

## 核心链路

```text
普通自回归生成
  -> 大模型 forward 1 次
  -> 确定 1 个 token
  -> 把 token 加入上下文
  -> 再 forward 1 次

投机解码
  -> drafter 快速猜一段未来 token
  -> verifier 大模型一次 forward 验证多个位置
  -> 接受最长正确前缀
  -> 从拒绝位置继续修正

UltraSpeed 类系统
  -> DFlash 减少主模型 forward 次数
  -> FP4/MoE 降低权重和带宽压力
  -> TileRT 减少 kernel 启动、同步、通信和调度碎片
```

## 一句话模型

普通 Pro 不是没有并行，而是并行主要在一个 token 内部；UltraSpeed 的关键，是让小模型先给出多个未来 token，再让大模型一次验收，从而把并行推进到 token 之间。
