---
title: "Pi Agent 出问题时怎么定位"
module: "Pi Agent"
source_html: "modules/pi-agent/pi-debugging.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/pi-debugging.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Debugging

# Pi Agent 出问题时怎么定位

调试 agent 不要一上来怀疑模型。先判断问题发生在：提示词组装、模型响应、工具参数、工具执行、上下文压缩、前端渲染中的哪一层。

## 故障分层检查

| 现象 | 优先检查 | 源码入口 |
| --- | --- | --- |
| 模型没调用工具 | system prompt 是否包含工具说明；tools 是否传入模型；模型是否支持 tool calling | `system-prompt.ts`、`agent-loop.ts`、`pi-ai` provider |
| 工具参数不合法 | tool schema、validateToolArguments、模型输出 JSON | `executeToolCalls()`、`types.ts` |
| 文件没改对 | edit oldText 是否唯一；fuzzy match；line ending | `edit.ts`、`edit-diff.ts` |
| 长对话突然忘事 | 是否触发 compaction；summary 是否保留关键路径 | `compaction.ts` |
| UI 没显示工具状态 | AgentEvent 是否 emit；AgentSession 是否转发；组件是否订阅 | `agent-loop.ts`、`interactive-mode.ts` |

## 最小调试路线

```text
1. 记录用户原始 prompt
2. 打印进入模型前的 messages/tools
3. 查看模型返回的是文本还是 toolCall
4. 如果有 toolCall，检查 name/input/id
5. 查看 toolResult 是否被 push 回上下文
6. 检查下一轮模型是否收到 toolResult
7. 检查 agent_end 前的 newMessages
```

## 调试心法

Agent 问题通常不是单点 bug，而是链路断了。你要像追踪数据流一样追踪 message、toolCall、toolResult 和 event。
