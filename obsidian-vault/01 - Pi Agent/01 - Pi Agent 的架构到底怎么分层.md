---
title: "Pi Agent 的架构到底怎么分层"
module: "Pi Agent"
source_html: "modules/pi-agent/architecture.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/architecture.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Part 1

# Pi Agent 的架构到底怎么分层

先记住一句话：Pi Agent 不是一个“大函数”，而是四层合作的系统。产品层负责用户体验，核心层负责 agent loop，模型层负责 provider 差异，UI 层负责终端呈现。

## 四层心智模型

### pi-coding-agent

面向用户的 CLI 产品层。它知道命令行、设置、模型选择、认证、内置工具、扩展、会话、交互 UI。
`packages/coding-agent/src`

### pi-agent-core

通用 agent 运行时。它知道 Agent、AgentLoop、消息、事件、工具调用、AgentHarness、会话 repo 和压缩。
`packages/agent/src`

### pi-ai

统一模型接口。它把 OpenAI、Anthropic、Google 等 API 差异包装成统一的 stream 和 message 形状。
`packages/ai/src`

### pi-tui

终端 UI 库。它负责组件、布局、输入和差分渲染，让命令行像应用一样实时更新。
`packages/tui/src`

## 为什么不把所有逻辑写在 CLI 里

如果把模型调用、工具调用、会话保存、UI 渲染都写在 CLI 入口里，初期会快，但长期会变成一个难以测试和复用的巨型流程。Pi 把通用能力放进 `pi-agent-core`，把模型差异放进 `pi-ai`，这样 CLI 只是其中一种产品形态。

- 可复用： 同一个 Agent core 可以被 CLI、RPC、测试 harness 或其他应用复用。

- 可替换： 模型 provider 可以变，但 Agent loop 不需要重写。

- 可观察： 所有阶段通过事件暴露，UI、持久化、扩展都能订阅。

- 可测试： agent-loop、compaction、tools、session 都可以单独测试。

## 核心对象关系

```text
用户输入
  -> pi-coding-agent: main.ts / interactive-mode.ts
  -> AgentSession: 组合模型、工具、会话、扩展、系统提示词
  -> Agent: 保存状态、队列、订阅者、active run
  -> runLoop: 调模型、执行工具、继续下一轮
  -> pi-ai: 转换 provider 请求并接收流式响应
  -> AgentEvent: 返回给 UI、session、extension
```

## 新手应该先读哪些文件

- `packages/coding-agent/src/main.ts`：用户输入从哪里进来。

- `packages/coding-agent/src/core/agent-session.ts`：产品层如何组装运行时。

- `packages/agent/src/agent.ts`：Agent 怎么保存状态和队列。

- `packages/agent/src/agent-loop.ts`：主循环怎么调模型和工具。

- `packages/coding-agent/src/core/tools/index.ts`：工具如何注册。

下一步
[[01 - Pi Agent/02 - 完整例子：从一句话到模型、工具、前端|看一次完整对话如何跑完]]
