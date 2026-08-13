---
title: "前端如何实时展示 Agent 运行过程"
module: "Pi Agent"
source_html: "modules/pi-agent/frontend.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/frontend.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Part 7

# 前端如何实时展示 Agent 运行过程

Pi 的终端前端不是等待最后结果，而是订阅事件流。模型输出、工具执行、diff、命令结果都会实时更新。

## 核心事件

```text
agent_start
turn_start
message_start
message_update
tool_execution_start
tool_execution_update
tool_execution_end
message_end
turn_end
agent_end
```

## 事件从哪里来

`agent-loop.ts` 在关键节点 emit AgentEvent。`Agent` 负责维护订阅者。`AgentSession` 订阅这些事件，做 session persistence、compaction、retry、extension broadcast。interactive-mode 再订阅 AgentSessionEvent 更新 UI。

## 为什么用事件

- UI 可以流式显示，不需要等整个任务完成。

- 会话保存可以和 UI 并行，不污染主循环。

- 扩展可以监听工具执行或 turn 生命周期。

- 测试可以断言事件序列是否正确。

## 关键源码

- `packages/agent/src/types.ts`：AgentEvent 类型。

- `packages/agent/src/agent-loop.ts`：事件 emit 位置。

- `packages/coding-agent/src/core/agent-session.ts`：事件转成 session event。

- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`：事件到 UI。

- `packages/coding-agent/src/modes/interactive/components/tool-execution.ts`：工具执行展示。

下一步
[[01 - Pi Agent/09 - 为什么这样设计？还有其他方案吗？|理解为什么这样设计，以及其他方案]]
