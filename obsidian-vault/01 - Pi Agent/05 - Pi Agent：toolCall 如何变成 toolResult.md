---
title: "Pi Agent：toolCall 如何变成 toolResult"
module: "Pi Agent"
source_html: "modules/pi-agent/tool-call-deep-dive.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/tool-call-deep-dive.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Deep Dive

# Pi Agent：toolCall 如何变成 toolResult

这是 Pi Agent 最核心的闭环：模型不能直接读文件、改文件、跑命令。模型只能在 assistant message 里产出 `toolCall`；Pi 的运行时找到对应工具，校验参数，执行工具，把结果封装成 `toolResult`，再放回上下文，让模型继续下一轮推理。

## 一句话模型

```text
assistant message 里出现 toolCall
  -> runLoop 发现 toolCall
  -> executeToolCalls 选择顺序或并行执行
  -> prepareToolCall 找工具、准备参数、校验 schema、跑 before hook
  -> executePreparedToolCall 调用 tool.execute()
  -> finalizeExecutedToolCall 跑 after hook、处理 terminate / error
  -> createToolResultMessage 变成 role: "toolResult"
  -> push 回 currentContext.messages
  -> 下一轮模型调用看到工具结果
```

## 源码入口

| 文件 | 关键函数 / 类型 | 作用 |
| --- | --- | --- |
| packages/agent/src/agent-loop.ts | runLoop | 核心循环：调模型、发现工具调用、执行工具、回填结果、决定是否继续。 |
| packages/agent/src/agent-loop.ts | executeToolCalls | 从 assistant message 中取出所有 toolCall，决定顺序执行还是并行执行。 |
| packages/agent/src/agent-loop.ts | prepareToolCall | 查找工具、参数预处理、schema 校验、beforeToolCall hook。 |
| packages/agent/src/agent-loop.ts | executePreparedToolCall | 真正调用工具的 execute() ，并把 partial update 转成事件。 |
| packages/agent/src/agent-loop.ts | createToolResultMessage | 把工具执行结果包装成模型可继续读取的 toolResult message。 |
| packages/agent/src/types.ts | AgentTool / AgentToolResult | 定义工具执行函数和工具结果结构。 |

## 具体例子：读取 README.md

用户输入：

```text
读取 README.md，然后总结这个项目怎么启动。
```

模型第一轮不会直接读文件，而是返回结构化工具调用：

```text
{
  "role": "assistant",
  "content": [
    {
      "type": "toolCall",
      "id": "call_read_1",
      "name": "read",
      "arguments": {
        "path": "README.md"
      }
    }
  ]
}
```

Pi 执行后生成工具结果：

```text
{
  "role": "toolResult",
  "toolCallId": "call_read_1",
  "toolName": "read",
  "content": [
    {
      "type": "text",
      "text": "README.md 的文件内容..."
    }
  ],
  "details": {},
  "isError": false
}
```

下一轮模型调用时，上下文里已经有 `toolResult`。模型这时才基于真实 README 内容生成总结，或者继续请求 `bash` / `edit` / `grep` 等工具。

## runLoop 的关键逻辑

`runLoop` 的核心不是“调用一次模型就结束”，而是一个多轮循环。它每轮都做三件事：拿 assistant message、检查 toolCall、把 toolResult 放回上下文。

```text
const message = await streamAssistantResponse(currentContext, config, signal, emit);

const toolCalls = message.content.filter((c) => c.type === "toolCall");

if (toolCalls.length > 0) {
  const executedToolBatch = await executeToolCalls(
    currentContext,
    message,
    config,
    signal,
    emit
  );

  for (const result of executedToolBatch.messages) {
    currentContext.messages.push(result);
    newMessages.push(result);
  }
}
```

这就是 Agent Loop 和普通聊天机器人的区别：普通聊天只等文本；Agent 会把模型输出当成下一步操作计划。

## 为什么有顺序执行和并行执行

`executeToolCalls()` 会检查工具是否要求顺序执行。如果有工具声明 `executionMode === "sequential"`，或者全局配置要求顺序执行，就走顺序路径；否则可以并行。

| 执行方式 | 适合场景 | 风险 |
| --- | --- | --- |
| 顺序执行 | 写文件、编辑文件、可能互相依赖的工具调用。 | 慢，但状态更可控。 |
| 并行执行 | 多个只读搜索、读取不同文件、互不依赖的查询。 | 快，但要避免共享状态冲突。 |

## prepareToolCall 做了什么

```text
prepareToolCall
  -> currentContext.tools.find(name)
  -> prepareToolCallArguments
  -> validateToolArguments
  -> config.beforeToolCall
  -> 返回 prepared 或 immediate error
```

安全实验
[看工具执行前如何判定 allow / confirm / reject](examples/agent-safety/index.html)

| 步骤 | 目的 | 失败时 |
| --- | --- | --- |
| 查找工具 | 确认模型请求的工具确实存在。 | 返回 `Tool read_x not found` 之类错误结果。 |
| 参数预处理 | 兼容模型输出的旧字段或 provider 差异。 | 预处理异常会变成 error toolResult。 |
| schema 校验 | 防止模型给错参数形状。 | 返回校验错误，工具不执行。 |
| before hook | 权限确认、拦截危险操作、注入上下文。 | 可以 block，返回“Tool execution was blocked”。 |
| abort 检查 | 用户中断时停止继续执行。 | 返回 `Operation aborted`。 |

## 工具真正在哪里执行

准备完成后，Pi 调用工具定义里的 `execute()`：

```text
const result = await prepared.tool.execute(
  prepared.toolCall.id,
  prepared.args,
  signal,
  (partialResult) => emit({
    type: "tool_execution_update",
    toolCallId: prepared.toolCall.id,
    toolName: prepared.toolCall.name,
    args: prepared.toolCall.arguments,
    partialResult
  })
);
```

这解释了为什么前端可以显示“工具正在执行”：工具可以通过 `onUpdate` 持续发 partial result，运行时把它转成 `tool_execution_update` 事件。

## AgentToolResult 的结构

工具执行函数不是返回任意字符串，而是返回统一结构：

```text
interface AgentToolResult<T> {
  content: (TextContent | ImageContent)[];
  details: T;
  terminate?: boolean;
}
```

| 字段 | 给谁用 | 说明 |
| --- | --- | --- |
| content | 模型 | 会进入 toolResult message，让模型读取。 |
| details | 日志 / UI / 调试 | 结构化细节，不一定直接给模型当文本读。 |
| terminate | runLoop | 提示当前工具批次后可以停止继续循环。 |

## createToolResultMessage 为什么关键

模型请求工具时用的是 `toolCall.id`。工具结果必须带回同一个 ID，否则模型和运行时都无法可靠对应“哪个结果属于哪个调用”。

```text
function createToolResultMessage(finalized) {
  return {
    role: "toolResult",
    toolCallId: finalized.toolCall.id,
    toolName: finalized.toolCall.name,
    content: finalized.result.content,
    details: finalized.result.details,
    isError: finalized.isError,
    timestamp: Date.now()
  };
}
```

## 事件流和 UI 的关系

toolCall 闭环不仅是给模型看的，也会发给 UI：

```text
tool_execution_start
  -> tool_execution_update
  -> tool_execution_end
  -> message_start(toolResult)
  -> message_end(toolResult)
  -> turn_end
```

这就是为什么终端前端能实时显示工具名称、参数、执行中状态和最终结果。模型生成、工具执行、UI 渲染不是一锅粥，而是通过事件流分层连接。

## 和 Mini Agent 的对应关系

| Mini Agent | Pi Agent | 差异 |
| --- | --- | --- |
| while (true) | runLoop() | Pi 多了 steering、follow-up、prepareNextTurn、事件和终止策略。 |
| assistant.tool_calls | message.content.filter(type === "toolCall") | Pi 使用统一 message content block。 |
| runTool(toolCall) | executeToolCalls() | Pi 支持并行/顺序、hook、校验、abort、partial update。 |
| role: "tool" | role: "toolResult" | Pi 内部消息格式不同，但语义相同：把工具结果交回模型。 |
| 简单字符串结果 | AgentToolResult | Pi 区分模型可读 content 和 UI/日志 details。 |

## 常见误解

- 误解一：模型直接操作电脑。 不对。模型只输出 toolCall，真正操作由工具系统执行。

- 误解二：toolCall 一定立刻执行成功。 不对。工具可能不存在、参数校验失败、before hook 阻止、用户中断、工具内部抛错。

- 误解三：toolResult 只是 UI 文本。 不对。toolResult 会进入上下文，是下一轮模型推理的输入。

- 误解四：并行工具调用总是更好。 不对。写文件、编辑文件、依赖前一步结果的工具必须控制顺序。

## 自测问题

- 为什么 Pi 要用 `toolCallId` 把 toolCall 和 toolResult 绑定起来？

- 如果模型请求一个不存在的工具，Pi 会在哪一步返回错误？

- `beforeToolCall` 适合做什么？为什么不应该让模型自己决定权限？

- 为什么 `AgentToolResult.content` 和 `details` 要分开？

- 为什么 toolResult 必须放回 `currentContext.messages`？

继续对照
[[02 - Mini Agent/00 - Mini Agent|用 Mini Agent 看最小实现]]

评估工具调用
[用 Agent Evaluation Demo 看失败定位](examples/agent-evaluation/index.html)
