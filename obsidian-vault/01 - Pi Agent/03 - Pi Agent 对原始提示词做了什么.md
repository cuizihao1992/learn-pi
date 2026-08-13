---
title: "Pi Agent 对原始提示词做了什么"
module: "Pi Agent"
source_html: "modules/pi-agent/prompt-processing.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/prompt-processing.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Part 3

# Pi Agent 对原始提示词做了什么

新手最容易误解的一点：用户输入不等于最终发送给大模型的 prompt。Pi 会把用户输入放进一个更大的运行上下文。

## 原始输入的五步变化

- 输入来源标准化： interactive、print、rpc 都转成 `AgentSession.prompt()` 的调用。

- 模板展开： prompt template 会把参数替换进模板正文。相关文件：`core/prompt-templates.ts`。

- 多模态包装： 图片会变成 `ImageContent`，和文本一起组成 user message。

- 队列处理： agent 正忙时，新输入被当作 steering 或 follow-up，而不是直接打断所有状态。

- 上下文转换： AgentMessage 在模型边界通过 `convertToLlm` 转成 provider 可接受的 Message。

## 最终发给模型的逻辑结构

```text
System prompt:
  - agent 身份
  - 工具使用规则
  - 项目上下文
  - skills 列表
  - extension 追加说明

Conversation:
  - 历史 user / assistant / toolResult
  - compaction summary
  - 当前 user message

Tools:
  - read / bash / edit / write / grep / find / ls 的 schema

Stream options:
  - model
  - reasoning / thinking level
  - provider auth
  - headers / transport
```

## 为什么要有 system prompt

用户提示词只描述当前任务，不会告诉模型“你有哪些工具、怎么用工具、什么时候停止、如何处理文件路径、如何报告结果”。这些稳定规则必须由 system prompt 提供。

## 为什么要把 AgentMessage 转成 LLM Message

应用层消息比模型消息更丰富。例如 Pi 可以有 custom message、bash execution message、branch summary message，但 provider 不一定认识这些类型。因此只有在模型边界才转换。

## 关键源码

- `packages/coding-agent/src/core/agent-session.ts`：`prompt()` 和系统提示词组装。

- `packages/coding-agent/src/core/system-prompt.ts`：构建产品层系统提示词。

- `packages/coding-agent/src/core/prompt-templates.ts`：模板展开。

- `packages/agent/src/agent.ts`：默认 `convertToLlm`。

- `packages/agent/src/harness/messages.ts`：更通用的消息转换。

下一步
[[01 - Pi Agent/04 - 工具调用系统：模型怎么“操作电脑”|看模型如何通过 toolCall 使用工具]]
