---
title: "最小 Agent Loop：模型决策、工具执行、结果回填"
module: "Mini Agent"
source_html: "modules/mini-agent/agent-loop-deep-dive.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mini-agent/agent-loop-deep-dive.html"
tags:
  - learn-pi
  - module/mini-agent
---

> Deep Dive

# 最小 Agent Loop：模型决策、工具执行、结果回填

Agent 的核心不是“一个更长的 prompt”，而是一个循环系统：模型负责决定下一步，程序负责执行工具，工具结果再回到上下文。Mini Agent 用几十行代码保留这个最小闭环，便于你回头理解 Pi Agent 的 `runLoop` 和 `executeToolCalls`。

## 一句话模型

```text
Agent Loop
  = callModel(messages, tools)
  + 如果没有 tool_call，就返回最终答案
  + 如果有 tool_call，就 runTool(toolCall)
  + 把 tool result 加回 messages
  + 回到下一轮 callModel
```

## 最小代码骨架

```text
async function runAgent(task) {
  const messages = [
    { role: "system", content: "你是一个会使用工具的 coding agent。" },
    { role: "user", content: task }
  ];

  for (let step = 0; step < 12; step += 1) {
    const assistant = await callModel(messages);
    messages.push(assistant);

    const toolCalls = assistant.tool_calls || [];
    if (toolCalls.length === 0) {
      return assistant.content || "";
    }

    for (const toolCall of toolCalls) {
      const result = await runTool(toolCall);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: String(result)
      });
    }
  }

  return "Stopped after 12 steps.";
}
```

## 为什么不是一次模型调用

如果用户说“读取 README 并总结”，模型第一次并不知道 README 的内容。它必须先请求工具：

```text
第一轮模型输入:
  system: 你可以使用 readFile 工具
  user: 读取 README.md 并总结

第一轮模型输出:
  tool_call: readFile({ "path": "README.md" })

程序执行工具:
  readFile("README.md") -> 文件内容

第二轮模型输入:
  user: 读取 README.md 并总结
  assistant: tool_call readFile(...)
  tool: README.md 文件内容

第二轮模型输出:
  README 总结文本
```

所以 Agent Loop 的关键是：模型每轮只决定“下一步”，不是一开始就知道完整答案。

## messages 是 Agent 的工作记忆

| 消息 | 谁产生 | 作用 |
| --- | --- | --- |
| system | 程序 | 告诉模型角色、工具规则、安全边界。 |
| user | 用户 | 任务目标。 |
| assistant.tool_calls | 模型 | 模型提出要调用哪个工具、参数是什么。 |
| tool | 程序 | 工具执行结果，回填给模型。 |
| assistant.content | 模型 | 最终回答或中间解释。 |

## tools 是模型可用动作表

工具不是一段自然语言建议，而是一组 JSON schema。模型必须按这个 schema 产出参数。

```text
const tools = [{
  type: "function",
  function: {
    name: "readFile",
    description: "Read a UTF-8 text file from the current project.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"],
      additionalProperties: false
    }
  }
}];
```

这一步和 Pi Agent 的 `AgentTool` 对应。Mini Agent 直接把 OpenAI-compatible 工具 schema 发给模型；Pi Agent 会多一层工具定义、UI 展示、hook、校验和执行模式控制。

## runTool 是权限边界

模型没有直接读文件权限。真正读文件的是程序。

安全实验
[观察路径、命令和写文件如何被守卫](examples/agent-safety/index.html)

```text
async function runTool(toolCall) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || "{}");

  if (name === "readFile") {
    const fullPath = resolveInsideProject(args.path);
    return await fs.readFile(fullPath, "utf8");
  }

  throw new Error(`Unknown tool: ${name}`);
}
```

这里最重要的不是 `fs.readFile`，而是 `resolveInsideProject()`。它说明 Agent 的工具执行必须有边界：不能让模型随便读系统任意路径。

## 终止条件

| 终止条件 | 代码位置 | 意义 |
| --- | --- | --- |
| 模型没有返回工具调用 | toolCalls.length === 0 | 模型认为已经可以回答。 |
| 达到最大步数 | step < 12 | 防止模型一直调用工具导致死循环。 |
| 工具抛错后模型不再继续 | 错误作为 tool result 回填 | 让模型决定解释错误、换工具还是结束。 |

## 完整链路图

```text
用户任务
  -> messages.push(user)
  -> callModel(messages, tools)
  -> assistant.tool_calls?
      -> 否：return assistant.content
      -> 是：for each toolCall
          -> parse arguments
          -> runTool
          -> messages.push(role: "tool")
          -> 下一轮 callModel
```

## 和 Pi Agent 的对应关系

| Mini Agent | Pi Agent | Pi 多了什么 |
| --- | --- | --- |
| for step... | runLoop() | steering、follow-up、prepareNextTurn、事件流。 |
| callModel() | streamAssistantResponse() | 流式输出、多 provider、reasoning、abort。 |
| assistant.tool_calls | content.filter(type === "toolCall") | 统一消息块，兼容更多 provider。 |
| runTool() | executeToolCalls() | 顺序/并行执行、before/after hook、partial update。 |
| role: "tool" | role: "toolResult" | 内部消息格式更明确，带 details、isError、timestamp。 |

## 常见误解

- 误解一：Agent 等于多写几句 prompt。 不对。Agent 的关键是循环、工具和状态。

- 误解二：模型会自己执行工具。 不对。模型只提出请求，程序才执行。

- 误解三：工具结果只是打印给用户看。 不对。工具结果必须回填到 messages，让模型继续推理。

- 误解四：while(true) 就够了。 不对。真实系统还需要最大步数、abort、权限、错误处理和上下文压缩。

## 自测问题

- 为什么第一次模型调用通常不能直接完成“读取文件并总结”？

- 为什么工具执行必须在程序侧，而不能交给模型自己做？

- `tool_call_id` 的作用是什么？

- 为什么需要最大步数限制？

- Mini Agent 的 `role: "tool"` 和 Pi 的 `role: "toolResult"` 语义上有什么对应关系？

对照真实工程
[[01 - Pi Agent/05 - Pi Agent：toolCall 如何变成 toolResult|看 Pi Agent toolCall 源码闭环]]
