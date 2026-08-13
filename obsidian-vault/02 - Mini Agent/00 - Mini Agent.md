---
title: "从零开发一个 Mini Agent"
module: "Mini Agent"
source_html: "modules/mini-agent/index.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mini-agent/index.html"
tags:
  - learn-pi
  - module/mini-agent
---

> Build

# 从零开发一个 Mini Agent

这一章不讲 Pi 的大工程，先用最小代码把 agent 的骨架写出来。你理解了这个，再回头看 Pi 的 `AgentSession`、`Agent`、`runLoop` 就会清楚很多。

## Mini Agent 的目标

做一个能完成这种任务的小 agent：

```text
用户：读取 README.md，总结内容，如果没有安装说明就补上。
```

它需要会三件事：调用模型、执行工具、把工具结果继续发给模型。

先懂循环本身
[[02 - Mini Agent/01 - while 循环在计算机底层是怎么实现的|看 while 如何变成机器码和 CPU 跳转]]

打穿 Agent Loop
[[02 - Mini Agent/02 - 最小 Agent Loop：模型决策、工具执行、结果回填|看模型决策、工具执行、结果回填]]

评估运行质量
[看工具选择、参数和 toolResult grounding](examples/agent-evaluation/index.html)

先补接口地基
[[02 - Mini Agent/03 - 如何让自己训练的模型被 Agent 使用|看如何让自研模型兼容 OpenAI 接口]]

## MVP 项目结构

先做一个最小 Node.js 项目，不引入框架，只依赖 Node 18+ 自带的 `fetch`、`fs`、`child_process`。

仓库里也放了一份可直接查看的示例代码：[examples/mini-agent-node/mini-agent.mjs](examples/mini-agent-node/mini-agent.mjs)

```text
mini-agent/
  package.json
  mini-agent.mjs
  README.md
```

## package.json

```text
{
  "name": "mini-agent-mvp",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node mini-agent.mjs"
  },
  "engines": {
    "node": ">=18"
  }
}
```

## 运行方式

这个 MVP 默认连接 OpenAI-compatible 接口。它可以是真 OpenAI，也可以是你自己的兼容服务。

```text
# OpenAI 官方或兼容服务
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_API_KEY="你的 key"
export OPENAI_MODEL="gpt-4.1-mini"

# 运行
npm start -- "读取 README.md，总结内容，如果没有安装说明就补上，然后运行 npm test"
```

如果你是 Windows PowerShell：

```text
$env:OPENAI_BASE_URL="https://api.openai.com/v1"
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_MODEL="gpt-4.1-mini"
npm start -- "读取 README.md，总结内容，如果没有安装说明就补上，然后运行 npm test"
```

## 完整 MVP 代码：mini-agent.mjs

```text
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const cwd = process.cwd();

if (!API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const userTask = process.argv.slice(2).join(" ") || "读取 README.md 并总结。";

const tools = [
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a UTF-8 text file from the current project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path." }
        },
        required: ["path"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "writeFile",
      description: "Write UTF-8 text to a file in the current project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path." },
          content: { type: "string", description: "Complete new file content." }
        },
        required: ["path", "content"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "runCommand",
      description: "Run a shell command in the current project.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Command to run." }
        },
        required: ["command"],
        additionalProperties: false
      }
    }
  }
];

function resolveInsideProject(relativePath) {
  const fullPath = path.resolve(cwd, relativePath);
  if (!fullPath.startsWith(cwd)) {
    throw new Error(`Path escapes project: ${relativePath}`);
  }
  return fullPath;
}

async function runTool(toolCall) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || "{}");

  console.log(`\\n[tool] ${name}`, args);

  if (name === "readFile") {
    const fullPath = resolveInsideProject(args.path);
    return await fs.readFile(fullPath, "utf8");
  }

  if (name === "writeFile") {
    const fullPath = resolveInsideProject(args.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, args.content, "utf8");
    return `Wrote ${args.path}`;
  }

  if (name === "runCommand") {
    const { stdout, stderr } = await execAsync(args.command, {
      cwd,
      timeout: 120_000,
      maxBuffer: 1024 * 1024
    });
    return stdout || stderr || "Command completed with no output.";
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function callModel(messages) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto"
    })
  });

  if (!response.ok) {
    throw new Error(`Model API error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  return json.choices[0].message;
}

async function runAgent(task) {
  const messages = [
    {
      role: "system",
      content: [
        "你是一个最小 coding agent。",
        "你可以读取文件、写文件、运行命令。",
        "先观察再修改；修改后尽量运行验证命令。",
        "不要访问当前项目目录之外的路径。",
        "最终回答要总结做了什么、验证结果是什么。"
      ].join("\\n")
    },
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
      try {
        const result = await runTool(toolCall);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: String(result).slice(0, 20_000)
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Tool error: ${error.message}`
        });
      }
    }
  }

  return "Stopped after 12 steps to avoid an infinite loop.";
}

const finalAnswer = await runAgent(userTask);
console.log("\\n[final]\\n" + finalAnswer);
```

## 这个 MVP 已经具备什么

- 能接 OpenAI-compatible 模型服务。

- 能把工具 schema 发给模型。

- 能执行 `readFile`、`writeFile`、`runCommand`。

- 能把工具结果以 `role: "tool"` 回填给模型。

- 能多轮循环，直到模型给最终文本回答。

- 有一个简单安全限制：文件路径不能逃出当前项目目录。

## 这个 MVP 还缺什么

- 没有流式输出： 用户要等模型整段返回。

- 没有 edit patch： `writeFile` 是全量覆盖，不如 Pi 的 `edit` 安全。

- 没有会话保存： 进程结束后历史丢失。

- 没有权限确认： 运行命令和写文件前没有用户确认。

- 没有上下文压缩： 长任务会超过模型窗口。

- 没有前端事件： 只有 console 输出，没有 UI 状态。

## MVP 到 Pi Agent 的差距

这个 MVP 是为了理解核心闭环，不是替代 Pi。Pi 把这些问题都工程化了：更完整的工具系统、更强的事件流、会话树、压缩、扩展、UI 和多 provider 适配。

## 最小 Agent Loop

```text
async function runAgent(userText) {
  const messages = [
    { role: "system", content: "你是一个会使用工具的 coding agent。" },
    { role: "user", content: userText }
  ];

  while (true) {
    const assistant = await callModel(messages, tools);
    messages.push(assistant.message);

    const toolCall = assistant.message.tool_calls?.[0];
    if (!toolCall) {
      return assistant.message.content;
    }

    const result = await runTool(toolCall);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: result
    });
  }
}
```

这段代码就是 agent 的核心：模型决定下一步，程序执行工具，结果再交给模型。

## 定义三个工具

```text
const tools = [
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a local file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "writeFile",
      description: "Write text to a local file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "runCommand",
      description: "Run a shell command",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"]
      }
    }
  }
];
```

## 实现工具执行器

```text
async function runTool(toolCall) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || "{}");

  if (name === "readFile") {
    return await fs.promises.readFile(args.path, "utf8");
  }

  if (name === "writeFile") {
    await fs.promises.writeFile(args.path, args.content, "utf8");
    return `Wrote ${args.path}`;
  }

  if (name === "runCommand") {
    const { stdout, stderr } = await execAsync(args.command);
    return stdout || stderr;
  }

  throw new Error(`Unknown tool: ${name}`);
}
```

## 调用 OpenAI-compatible 模型

```text
async function callModel(messages, tools) {
  const response = await fetch("http://localhost:8000/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.API_KEY}`
    },
    body: JSON.stringify({
      model: "my-agent-model",
      messages,
      tools,
      tool_choice: "auto"
    })
  });

  const json = await response.json();
  return {
    message: json.choices[0].message
  };
}
```

这里的 `localhost:8000` 可以是 OpenAI 兼容服务，也可以是你自己训练模型外面包的一层 adapter。

## Mini Agent 对照 Pi Agent

| Mini Agent | Pi Agent | 含义 |
| --- | --- | --- |
| `messages` | `Agent.state.messages` | 当前对话和工具结果。 |
| `callModel()` | `pi-ai streamSimple()` | 调用模型 provider。 |
| `runTool()` | `executeToolCalls()` | 执行模型请求的工具。 |
| `role: "tool"` | `ToolResultMessage` | 工具结果回填上下文。 |
| `while (true)` | `runLoop()` | 多轮推理和工具执行。 |
| 无 | `AgentSession` | 产品层：会话、扩展、UI、压缩、重试。 |

## 从 Mini Agent 扩展到真正可用

- 加流式输出，让用户看到模型正在生成。

- 加工具执行事件，让前端显示“正在 read/write/bash”。

- 加会话保存，支持恢复上次任务。

- 加上下文压缩，避免长任务超过窗口。

- 加权限控制，限制文件系统和命令执行范围。

- 加工具 schema 校验和更好的错误消息。

## 你现在应该理解的关键点

Agent 不是“一个更聪明的 prompt”。Agent 是一个循环系统：模型负责决策，工具负责执行，程序负责状态和安全边界。Pi Agent 只是把这个最小循环工程化、可扩展化、可观察化。

下一步
[[02 - Mini Agent/04 - 从零开发自己的 Agent：一条能动手的路线|按实战路线做成一个小产品]]
