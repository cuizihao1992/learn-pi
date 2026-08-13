---
title: "如何让自己训练的模型被 Agent 使用"
module: "Mini Agent"
source_html: "modules/mini-agent/model-api.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mini-agent/model-api.html"
tags:
  - learn-pi
  - module/mini-agent
---

> Integration

# 如何让自己训练的模型被 Agent 使用

结论先说：通常不需要把模型“训练成 OpenAI 接口”。你需要的是一个中间服务，把 Agent 发来的 OpenAI/Anthropic 风格 JSON 请求，转换成你模型真正需要的 prompt；再把模型输出转换回 Agent 能识别的 JSON 响应。

## 大模型的输入本质上是什么

模型本体通常只会接收 token 序列。JSON 不是模型天然输入，而是 API 服务为了让应用好用而定义的协议。

```text
Agent 看到的协议层:
{
  "messages": [
    { "role": "system", "content": "你是 coding agent..." },
    { "role": "user", "content": "读取 README 并总结" }
  ],
  "tools": [...]
}

模型真正看到的通常是模板化文本/token:
<system>你是 coding agent...</system>
<user>读取 README 并总结</user>
<tools>...工具说明...</tools>
```

所以 JSON 是“应用和模型服务之间的接口格式”。模型服务收到 JSON 后，会把它渲染成模型训练时熟悉的 chat template，再送进推理引擎。

## 是训练解决，还是中间层解决

### 中间层必须要有

无论模型有没有训练过 tool calling，你都需要 API 层负责鉴权、请求格式、stream、错误码、工具 schema 转换和响应包装。

### 训练决定能力上限

如果模型没学过按结构输出 tool call，中间层只能靠提示词和解析勉强做；效果不稳定。更好的方式是对模型做 function calling / tool use 指令微调。

实战建议：先做 OpenAI-compatible 中间层，让 Agent 能跑通；如果模型经常输出不合法 tool call，再做数据微调或约束解码。

## OpenAI 兼容接口最小需要实现什么

如果你想让很多 Agent 直接用你的模型，最实用的是实现 OpenAI Chat Completions 兼容接口。

```text
POST /v1/chat/completions
Authorization: Bearer YOUR_KEY

请求:
{
  "model": "my-agent-model",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "帮我读 README" }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "read",
        "description": "Read a file",
        "parameters": { "type": "object", "properties": { "path": { "type": "string" } } }
      }
    }
  ],
  "tool_choice": "auto",
  "stream": false
}
```

当模型想调用工具时，响应要返回 `tool_calls`，而不是直接执行工具。

```text
{
  "id": "chatcmpl_123",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_1",
            "type": "function",
            "function": {
              "name": "read",
              "arguments": "{\"path\":\"README.md\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ]
}
```

Agent 执行工具后，会再发一轮请求，带上 role 为 `tool` 的消息。

```text
{
  "role": "tool",
  "tool_call_id": "call_1",
  "content": "README 的文件内容..."
}
```

## 兼容 OpenAI 接口到底要做哪些工作

| 工作 | 你要实现什么 | 为什么必要 |
| --- | --- | --- |
| 路由兼容 | 提供 `POST /v1/chat/completions`，可选 `GET /v1/models`。 | 大多数 Agent SDK 会按 OpenAI 路径请求。 |
| 鉴权兼容 | 接受 `Authorization: Bearer xxx`，内部可映射成自己的 key。 | 让现有客户端不用改认证逻辑。 |
| 请求解析 | 读取 `model`、`messages`、`tools`、`tool_choice`、`stream`、`temperature`、`max_tokens`。 | 这些字段决定模型、上下文、工具和生成参数。 |
| 消息模板 | 把 OpenAI messages 渲染成模型需要的 chat template。 | 自研模型通常不直接吃 OpenAI JSON。 |
| 工具模板 | 把 tools JSON schema 渲染进 prompt，或传给推理引擎的 tool calling 模块。 | 模型需要知道有哪些工具、参数是什么。 |
| 输出解析 | 把模型输出的文本、XML、JSON 或特殊 token 解析成 `message.content` 或 `message.tool_calls`。 | Agent 只认识协议结果，不认识你模型的私有格式。 |
| 错误格式 | 按 OpenAI 风格返回 `{ "error": { "message", "type", "code" } }`。 | 客户端才能用统一方式显示和重试。 |
| 流式输出 | 当 `stream: true` 时返回 SSE：`data: {...}\n\n`，最后 `data: [DONE]`。 | 前端和 Agent UI 需要边生成边展示。 |

## 最小字段兼容清单

第一版不用追求完整实现，先保证下面这些字段稳定。

```text
请求至少支持:
{
  "model": "my-model",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "...", "tool_calls": [...] },
    { "role": "tool", "tool_call_id": "call_1", "content": "..." }
  ],
  "tools": [...],
  "tool_choice": "auto",
  "stream": false
}

非流式文本响应至少返回:
{
  "id": "chatcmpl_xxx",
  "object": "chat.completion",
  "model": "my-model",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "..." },
    "finish_reason": "stop"
  }]
}

非流式工具调用响应至少返回:
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_1",
        "type": "function",
        "function": {
          "name": "readFile",
          "arguments": "{\"path\":\"README.md\"}"
        }
      }]
    },
    "finish_reason": "tool_calls"
  }]
}
```

## Anthropic Messages 接口差别在哪里

Anthropic 也是 JSON API，但消息结构和工具块表达不同。它用 content block 表示文本、tool_use、tool_result。

```text
Anthropic tool_use 形状:
{
  "role": "assistant",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_1",
      "name": "read",
      "input": { "path": "README.md" }
    }
  ],
  "stop_reason": "tool_use"
}

Anthropic tool_result 通常作为 user content block 发回:
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_1",
      "content": "README 的文件内容..."
    }
  ]
}
```

## OpenAI vs Anthropic 的核心差距

| 点 | OpenAI Chat Completions | Anthropic Messages |
| --- | --- | --- |
| 工具定义 | `tools: [{ type: "function", function: ... }]` | `tools: [{ name, description, input_schema }]` |
| 工具调用 | `message.tool_calls[].function.arguments` 通常是 JSON 字符串 | `content[]` 里 `type: "tool_use"`，input 是对象 |
| 工具结果 | `role: "tool"` + `tool_call_id` | `role: "user"` 的 `tool_result` content block |
| 停止原因 | `finish_reason: "tool_calls"` | `stop_reason: "tool_use"` |
| 系统提示词 | 通常在 messages 里作为 `role: "system"` | 通常是顶层 `system` 字段 |

## 详细例子：给自研模型做 OpenAI-compatible 中间层

假设你有一个本地模型服务，只支持下面这种简单接口：

```text
POST /generate
{
  "prompt": "...纯文本 prompt...",
  "max_tokens": 2048
}

返回:
{
  "text": "<tool_call>{\"name\":\"read\",\"arguments\":{\"path\":\"README.md\"}}</tool_call>"
}
```

你可以写一个 adapter 服务，对外伪装成 OpenAI。

```text
// 伪代码
app.post("/v1/chat/completions", async (req, res) => {
  const { model, messages, tools } = req.body;

  // 1. 把 OpenAI messages/tools 转成你的模型 prompt
  const prompt = renderChatTemplate(messages, tools);

  // 2. 调你的真实模型
  const raw = await fetch("http://localhost:9000/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, max_tokens: 2048 })
  }).then(r => r.json());

  // 3. 解析模型输出。如果包含工具调用，转成 OpenAI tool_calls
  const toolCall = parseToolCall(raw.text);
  if (toolCall) {
    return res.json({
      id: "chatcmpl_local",
      object: "chat.completion",
      model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "call_local_1",
            type: "function",
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.arguments)
            }
          }]
        },
        finish_reason: "tool_calls"
      }]
    });
  }

  // 4. 普通文本回答
  res.json({
    id: "chatcmpl_local",
    object: "chat.completion",
    model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: raw.text },
      finish_reason: "stop"
    }]
  });
});
```

## 更完整的 adapter 示例

下面这个例子把核心函数拆开：请求校验、messages 渲染、工具渲染、工具调用解析、OpenAI 响应包装。真实项目可以直接按这个结构扩展。

```text
function renderTools(tools = []) {
  if (tools.length === 0) return "";

  const lines = tools.map((tool) => {
    const fn = tool.function;
    return [
      `工具名: ${fn.name}`,
      `说明: ${fn.description || ""}`,
      `参数 JSON Schema: ${JSON.stringify(fn.parameters || {})}`
    ].join("\n");
  });

  return [
    "你可以调用以下工具。",
    "如果需要调用工具，只输出一段严格 JSON：",
    "{\"tool_call\":{\"name\":\"工具名\",\"arguments\":{...}}}",
    "",
    lines.join("\n\n")
  ].join("\n");
}

function renderMessages(messages, tools) {
  const parts = [];

  for (const message of messages) {
    if (message.role === "system") {
      parts.push(`<system>\n${message.content}\n</system>`);
    }

    if (message.role === "user") {
      parts.push(`<user>\n${message.content}\n</user>`);
    }

    if (message.role === "assistant") {
      const toolCalls = message.tool_calls
        ? `\n工具调用: ${JSON.stringify(message.tool_calls)}`
        : "";
      parts.push(`<assistant>\n${message.content || ""}${toolCalls}\n</assistant>`);
    }

    if (message.role === "tool") {
      parts.push([
        "<tool_result>",
        `tool_call_id: ${message.tool_call_id}`,
        String(message.content),
        "</tool_result>"
      ].join("\n"));
    }
  }

  const toolText = renderTools(tools);
  if (toolText) parts.push(`<tools>\n${toolText}\n</tools>`);

  parts.push("<assistant>\n");
  return parts.join("\n\n");
}

function parseModelOutput(text) {
  const match = text.match(/\{[\s\S]*\"tool_call\"[\s\S]*\}/);
  if (!match) {
    return { type: "text", content: text };
  }

  try {
    const json = JSON.parse(match[0]);
    if (json.tool_call?.name) {
      return {
        type: "tool_call",
        name: json.tool_call.name,
        arguments: json.tool_call.arguments || {}
      };
    }
  } catch {
    return { type: "text", content: text };
  }

  return { type: "text", content: text };
}

function openAITextResponse({ id, model, content }) {
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: "stop"
    }]
  };
}

function openAIToolResponse({ id, model, name, args }) {
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12),
          type: "function",
          function: {
            name,
            arguments: JSON.stringify(args)
          }
        }]
      },
      finish_reason: "tool_calls"
    }]
  };
}
```

## 一个完整请求会怎么流转

```text
1. Mini Agent 请求你的兼容服务
POST /v1/chat/completions
{
  "model": "my-agent-model",
  "messages": [
    { "role": "user", "content": "读取 README.md 并总结" }
  ],
  "tools": [{ "type": "function", "function": { "name": "readFile", ... } }]
}

2. adapter 转成模型 prompt
<user>
读取 README.md 并总结
</user>

<tools>
工具名: readFile
说明: Read a local file
参数 JSON Schema: {"type":"object","properties":{"path":{"type":"string"}}}
</tools>

3. 自研模型输出私有格式
{"tool_call":{"name":"readFile","arguments":{"path":"README.md"}}}

4. adapter 包装成 OpenAI tool_calls
{
  "choices": [{
    "message": {
      "role": "assistant",
      "tool_calls": [{
        "id": "call_abc",
        "type": "function",
        "function": {
          "name": "readFile",
          "arguments": "{\"path\":\"README.md\"}"
        }
      }]
    },
    "finish_reason": "tool_calls"
  }]
}

5. Mini Agent 执行 readFile，再把结果发回来
{
  "messages": [
    { "role": "user", "content": "读取 README.md 并总结" },
    { "role": "assistant", "tool_calls": [...] },
    { "role": "tool", "tool_call_id": "call_abc", "content": "README 内容..." }
  ]
}

6. adapter 再次渲染 prompt，模型生成最终总结
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "这个 README 主要说明..."
    },
    "finish_reason": "stop"
  }]
}
```

## 流式输出怎么兼容

OpenAI-compatible 的流式响应通常是 Server-Sent Events。第一版可以先不支持工具调用流式，只支持文本 delta。

```text
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"choices":[{"delta":{"role":"assistant"},"index":0}]}

data: {"choices":[{"delta":{"content":"这个"},"index":0}]}

data: {"choices":[{"delta":{"content":" README"},"index":0}]}

data: {"choices":[{"delta":{},"finish_reason":"stop","index":0}]}

data: [DONE]
```

如果要支持流式工具调用，就要按增量发送 `tool_calls` 的 name 和 arguments。很多客户端对这块兼容性要求更高，所以建议第二阶段再做。

## 用 curl 验证兼容层

```text
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "model": "my-agent-model",
    "messages": [
      { "role": "user", "content": "用一句话解释 RAG" }
    ],
    "stream": false
  }'
```

再验证工具调用：

```text
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "model": "my-agent-model",
    "messages": [
      { "role": "user", "content": "读取 README.md" }
    ],
    "tools": [{
      "type": "function",
      "function": {
        "name": "readFile",
        "description": "Read a local file",
        "parameters": {
          "type": "object",
          "properties": {
            "path": { "type": "string" }
          },
          "required": ["path"]
        }
      }
    }],
    "tool_choice": "auto"
  }'
```

## 兼容层最容易踩的坑

- arguments 类型错： OpenAI Chat Completions 里 `function.arguments` 通常是 JSON 字符串，不是对象。

- tool_call_id 丢失： 工具结果必须能对应前一次工具调用，否则 Agent 不知道结果属于谁。

- role 混乱： 工具结果在 OpenAI 风格里是 `role: "tool"`，不要塞回普通 user 文本里。

- 模型名透传失败： 客户端传 `model` 后，adapter 要么映射到内部模型，要么返回清楚的错误。

- 错误码不标准： 认证失败用 401，参数错误用 400，模型服务超时用 502/504，比直接 500 更好排查。

- 流式格式不完整： SSE 每条都要以 `data:` 开头并用空行分隔，最后发送 `[DONE]`。

## 最难的点：让模型稳定输出工具调用

中间层能转换格式，但不能凭空让模型具备稳定 tool use 能力。你有三种路线：

- 提示词约束： 在 system prompt 里要求模型用固定 XML/JSON 输出工具调用。成本低，但稳定性一般。

- 结构化解码： 用 grammar / JSON schema / constrained decoding 强制输出合法 JSON。稳定性更好。

- 指令微调： 用 tool calling 数据训练模型，让它学会何时调用工具、如何填参数、何时最终回答。

## Pi 源码是否已经做了多模型接口兼容

是的。Pi 已经把不同模型 API 的差异集中放进 `packages/ai`，而不是把 OpenAI、Anthropic、Google 等 provider 的判断散落在 Agent 主循环里。Agent 主流程只面对统一后的 `Message`、`Tool`、`ToolCall`、`ToolResult`、`AssistantMessageEventStream`，真正的协议差异由 provider adapter 处理。

```text
Pi 的兼容层思想:
Coding Agent
  -> 统一 Context: systemPrompt + messages + tools
  -> streamSimple(model, context, options)
  -> 根据 model.api 找到 provider adapter
  -> OpenAI / Anthropic / Google / Mistral / Bedrock ...
  -> provider 原始流式响应
  -> 转回 Pi 统一 AssistantMessageEventStream
  -> Agent 继续执行 toolCall，写回 toolResult
```

这和你自己做 Mini Agent 时应该采用的结构一致：业务层不要直接依赖某个厂商的 JSON 格式，先定义内部统一协议，再写 adapter。

## Pi 源码位置：从哪里开始看

| 源码文件 | 看什么 | 为什么重要 |
| --- | --- | --- |
| packages/ai/src/types.ts | 统一的 API、Provider、Message、ToolCall、ToolResult 类型。 | 这是所有 provider adapter 的共同语言。 |
| packages/ai/src/api-registry.ts | registerApiProvider 和 provider 注册表。 | 不同模型接口通过注册表接入统一调用入口。 |
| packages/ai/src/stream.ts | streamSimple() 如何根据 model.api 分发。 | 这是 Agent 调模型时最核心的抽象入口。 |
| packages/ai/src/providers/register-builtins.ts | 内置 provider 如何注册。 | 能看到 Pi 支持哪些协议：OpenAI、Anthropic、Google、Mistral、Bedrock 等。 |
| packages/ai/src/providers/openai-completions.ts | OpenAI Chat Completions 兼容实现。 | 最适合对照你自己的 OpenAI-compatible adapter。 |
| packages/ai/src/providers/anthropic.ts | Anthropic Messages 兼容实现。 | 看清 tool_use 、 tool_result 和 OpenAI tool_calls 的差别。 |
| packages/coding-agent/src/core/sdk.ts | Coding Agent 真正调用模型的位置。 | 能证明 Agent 主流程只调用统一的 streamSimple 。 |
| packages/coding-agent/src/core/model-registry.ts | 模型配置、自定义 provider、API key/header 获取。 | 如果要接自研模型，通常从这里配置 provider 和 baseUrl。 |

## 第一层：统一类型先定下来

Pi 在 packages/ai/src/types.ts 里先定义支持哪些 API 形状。注意这里不是只写厂商名，而是写“协议形状”。例如 OpenAI Chat Completions、Anthropic Messages、Google Generative AI 都是不同的 API 形状。

```text
export type KnownApi =
  | "openai-completions"
  | "mistral-conversations"
  | "openai-responses"
  | "azure-openai-responses"
  | "openai-codex-responses"
  | "anthropic-messages"
  | "bedrock-converse-stream"
  | "google-generative-ai"
  | "google-vertex";
```

这个设计很关键： provider 是服务商， api 是接口协议。OpenRouter、DeepSeek、Groq、NVIDIA NIM 这类服务可能都可以伪装成 OpenAI-compatible，所以它们的 provider 不同，但 API 形状可以复用 openai-completions 。

Pi 内部真正流转的工具调用不是 OpenAI 的原始 tool_calls ，也不是 Anthropic 的原始 tool_use ，而是统一的 ToolCall ：

```text
export interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
}
```

这个统一类型就是“中间语言”。只要所有 provider 最后都转换成它，Agent loop 就不需要关心模型来自哪里。

## 第二层：provider 注册表

packages/ai/src/api-registry.ts 是模型接口兼容的调度中心。它定义每个 provider adapter 必须实现两个函数： stream 和 streamSimple 。

```text
export interface ApiProvider {
  api: TApi;
  stream: StreamFunction<TApi, TOptions>;
  streamSimple: StreamFunction<TApi, SimpleStreamOptions>;
}
```

注册时，Pi 把 adapter 存进一个 Map：

```text
const apiProviderRegistry = new Map<string, RegisteredApiProvider>();

export function registerApiProvider(provider, sourceId) {
  apiProviderRegistry.set(provider.api, {
    provider: {
      api: provider.api,
      stream: wrapStream(provider.api, provider.stream),
      streamSimple: wrapStreamSimple(provider.api, provider.streamSimple),
    },
    sourceId,
  });
}
```

wrapStream 还会检查 model.api 是否匹配，避免把 Anthropic 模型错误地丢给 OpenAI adapter。这是工程上很实用的防线。

## 第三层：Agent 调用统一入口 streamSimple

packages/ai/src/stream.ts 里，Pi 暴露统一入口 streamSimple() 。调用方只需要传入模型、上下文和选项。

```text
export function streamSimple(model, context, options) {
  const provider = resolveApiProvider(model.api);
  return provider.streamSimple(model, context, withEnvApiKey(model, options));
}
```

这里有两个动作：

- 根据 model.api 找到对应 adapter。

- 自动补 API key，然后调用 adapter 的 streamSimple 。

所以 Agent 主流程不用知道 OpenAI 是 chat.completions.create ，Anthropic 是 messages.create 。这些细节都藏在 adapter 里。

## 第四层：内置 provider 如何接入

packages/ai/src/providers/register-builtins.ts 负责注册内置 provider。你可以把它理解成“模型协议插件清单”。

```text
registerApiProvider({
  api: "anthropic-messages",
  stream: streamAnthropic,
  streamSimple: streamSimpleAnthropic,
});

registerApiProvider({
  api: "openai-completions",
  stream: streamOpenAICompletions,
  streamSimple: streamSimpleOpenAICompletions,
});
```

这说明 Pi 的扩展点很清楚：如果你要支持一个全新的私有协议，就写一个新的 provider 文件，然后注册成新的 api 。如果你的服务能兼容 OpenAI Chat Completions，就不用写新 adapter，直接复用 openai-completions 。

## 第五层：OpenAI-compatible adapter 做了什么

packages/ai/src/providers/openai-completions.ts 是最值得你仿写的文件。它做了四件事。

### 1. 创建 OpenAI client，但 baseURL 来自模型配置

```text
return new OpenAI({
  apiKey,
  baseURL: model.baseUrl,
  defaultHeaders,
});
```

这就是为什么很多 OpenAI-compatible 服务能接进来：只要协议像 OpenAI， baseURL 可以换成你自己的推理服务地址。

### 2. 把 Pi 的 Context 转成 OpenAI 参数

```text
const messages = convertMessages(model, context, compat);

const params = {
  model: model.id,
  messages,
  stream: true,
};
```

如果有工具，Pi 会把内部工具定义转换成 OpenAI 的 function tool：

```text
params.tools = convertTools(context.tools, compat);
```

### 3. 把内部 Tool 转成 OpenAI tools

```text
function convertTools(tools, compat) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: false,
    },
  }));
}
```

这一步对应你自己做 adapter 时的“工具模板转换”：Agent 内部只认工具名、描述和 JSON Schema，OpenAI 接口则要求包成 { type: "function", function: ... } 。

### 4. 把 OpenAI 流式 tool_calls 转成 Pi 的 toolCall

OpenAI 的工具调用参数是流式拼出来的 JSON 字符串。Pi 先创建一个内部 block 暂存参数：

```text
block = {
  type: "toolCall",
  id: toolCall.id || "",
  name: toolCall.function?.name || "",
  arguments: {},
  partialArgs: "",
};
```

等参数片段都到齐后，再解析成对象并发出统一事件：

```text
block.arguments = parseStreamingJson(block.partialArgs);
stream.push({
  type: "toolcall_end",
  toolCall: block,
});
```

这就是为什么 OpenAI 的 function.arguments 虽然是字符串，但 Pi 内部拿到的是 Record 对象。

## 第六层：Anthropic adapter 如何做同一件事

Anthropic 的协议不同。它不用 OpenAI 的 tool_calls 字段，而是在 content blocks 里表达 tool_use 和 tool_result 。

Anthropic 返回工具调用时，Pi 把它转成统一 toolCall ：

```text
{
  type: "toolCall",
  id: event.content_block.id,
  name: event.content_block.name,
  arguments: event.content_block.input ?? {},
}
```

Pi 内部已有的 toolCall 再发回 Anthropic 时，adapter 会转回 Anthropic 的 tool_use ：

```text
{
  type: "tool_use",
  id: block.id,
  name: block.name,
  input: block.arguments ?? {},
}
```

工具执行结果则转成 Anthropic 的 tool_result ：

```text
{
  type: "tool_result",
  tool_use_id: msg.toolCallId,
  content: convertContentBlocks(msg.content),
  is_error: msg.isError,
}
```

对比 OpenAI 你会发现：两边外部协议完全不同，但进到 Agent 主循环前都变成了同一种内部结构。这就是 adapter 的价值。

## 第七层：Coding Agent 真正在哪里调用模型

packages/coding-agent/src/core/sdk.ts 是 Coding Agent 接入模型的地方。这里不是直接调用 OpenAI 或 Anthropic，而是调用 streamSimple() 。

```text
return streamSimple(model, context, {
  ...options,
  apiKey: auth.apiKey,
  env,
  timeoutMs,
  headers: mergeProviderAttributionHeaders(...),
});
```

这段代码说明三件事：

- API key、headers、timeout、retry 这些运行参数在进入 provider 前统一整理。

- Agent 主流程只依赖 streamSimple ，不直接依赖厂商 SDK。

- 换模型时主要改变 model 配置，而不是改 Agent loop。

## 第八层：自定义 provider 怎么进入 Pi

packages/coding-agent/src/core/model-registry.ts 里有一段逻辑：如果 provider 配置里提供了 streamSimple ，Pi 会动态调用 registerApiProvider 。

```text
if (config.streamSimple) {
  registerApiProvider({
    api: config.api,
    stream: (model, context, options) =>
      streamSimple(model, context, options),
    streamSimple,
  }, `provider:${providerName}`);
}
```

这意味着 Pi 不只支持内置 provider，也给“外部接入自己的模型接口”留了扩展口。你可以走两条路：

- OpenAI-compatible 路线： 你的推理服务实现 OpenAI Chat Completions，Pi 配置 baseUrl 指向你的服务。

- 原生 adapter 路线： 写一个新的 streamSimple ，把你的私有请求和响应转成 Pi 内部事件流。

## 把 Pi 的做法迁移到 Mini Agent

如果你自己写 Mini Agent，最小结构可以照 Pi 缩小一版：

```text
type InternalMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

type ModelAdapter = {
  name: string;
  stream(messages, tools, options): AsyncIterable<ModelEvent>;
};

const adapters = new Map();

function registerAdapter(name, adapter) {
  adapters.set(name, adapter);
}

function callModel(model, messages, tools, options) {
  const adapter = adapters.get(model.api);
  return adapter.stream(messages, tools, options);
}
```

重点不是代码长什么样，而是边界：Agent loop 只处理“要不要继续、有没有工具调用、工具结果怎么回填”；adapter 只处理“这个模型 API 的消息格式和流式响应怎么互相转换”。这个边界立住后，后面加 Claude、Gemini、自研模型、OpenRouter，就不会把主循环搅乱。

## 推荐落地路线

- 先做 `/v1/chat/completions` 非流式接口，支持 messages、tools、tool_calls。

- 让 Pi/Agent 跑通一个 read 工具调用。

- 再支持 tool result 回传后的第二轮模型调用。

- 再做 stream 输出，提升前端体验。

- 如果工具调用不稳定，再做结构化输出约束或指令微调。

- 最后再考虑 Anthropic 兼容或 Pi 原生 provider。

## 官方接口参考

- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat)

- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages)

- [Anthropic Tool use overview](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)

建议
[[01 - Pi Agent/13 - 源码调用图：从入口追到工具执行|再看 Pi 的 provider 和 tool 调用图]]
