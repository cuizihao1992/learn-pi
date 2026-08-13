---
title: "Pi Agent 术语表"
module: "Pi Agent"
source_html: "modules/pi-agent/glossary.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/glossary.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Reference

# Pi Agent 术语表

很多理解困难不是代码难，而是几个名字太像。先把术语分清，后面读源码会轻很多。

## AgentMessage

Pi 内部的应用层消息。它比发给大模型的 Message 更丰富，可以表示 user、assistant、toolResult、custom、summary、bash execution 等。
`packages/agent/src/types.ts`

## Message

模型层消息。真正调用 provider 前，AgentMessage 会被 convertToLlm 转换成 provider 能理解的 Message。
`packages/ai/src`

## Agent

状态化 wrapper。保存 messages、tools、model、thinkingLevel、队列、订阅者和 active run。
`packages/agent/src/agent.ts`

## AgentSession

coding-agent 的产品运行时中心。负责工具注册、会话保存、模型选择、扩展、压缩、重试和 UI 事件。
`packages/coding-agent/src/core/agent-session.ts`

## runLoop

核心循环。负责调用模型、发现 toolCall、执行工具、写回 toolResult、决定是否继续下一轮。
`packages/agent/src/agent-loop.ts`

## toolCall

模型请求执行工具的结构化输出。模型不能直接读写文件，只能提出 toolCall。
`{ name, id, input }`

## toolResult

Pi 执行工具后的结果消息。它会被放回上下文，再发给模型，让模型决定下一步。
`ToolResultMessage`

## ToolDefinition

工具的描述层，用于扩展、UI、配置、渲染和工具管理。
`core/tools/index.ts`

## AgentTool

工具的执行层，包含 schema 和 execute。runLoop 调用的是 AgentTool。
`packages/agent/src/types.ts`

## turn

一次模型响应加可能的工具执行过程。一个用户 prompt 可能触发多个 turn，因为工具结果会驱动下一轮模型调用。
`turn_start / turn_end`

## steering

Agent 正在运行时插入的引导消息。它会尽快进入下一轮上下文。
`steeringQueue`

## follow-up

Agent 本来要停止后继续处理的新消息。适合用户在运行时追加任务。
`followUpQueue`

## compaction

上下文压缩。把旧历史总结成 summary message，保留近期消息，避免超过模型上下文。
`core/compaction/compaction.ts`

## EventStream

流式事件抽象。模型输出、工具执行、agent 生命周期都通过事件被上层观察。
`message_update / tool_execution_end`

下一步
[[01 - Pi Agent/13 - 源码调用图：从入口追到工具执行|看这些术语在源码里怎么连起来]]
