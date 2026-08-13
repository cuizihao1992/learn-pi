---
title: "从零开发自己的 Agent：一条能动手的路线"
module: "Mini Agent"
source_html: "modules/mini-agent/practical-path.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mini-agent/practical-path.html"
tags:
  - learn-pi
  - module/mini-agent
---

> Hands-on Path

# 从零开发自己的 Agent：一条能动手的路线

这条路线的目标不是“看懂概念”，而是最后真的做出一个小产品：用户在网页里输入任务，Agent 能调用模型、使用工具、读写文件、保留记忆、检索知识库，并把过程展示给前端。

## 最终要做成什么

```text
Web 前端
  -> /api/chat
  -> Agent Loop
      -> Prompt Builder
      -> Model Adapter
      -> Tool Registry
      -> Memory Store
      -> RAG Retriever
      -> Event Stream
  -> 前端实时显示：思考摘要、工具调用、工具结果、最终答案
```

最小可用版本不用一开始就很大。先在命令行跑通，再做 HTTP API，再做前端，再加记忆和 RAG。每一步都要有可验收的结果。

## 阶段 0：准备项目骨架

| 目标 | 文件 | 验收标准 |
| --- | --- | --- |
| 创建 Node 项目 | package.json | npm start 能启动。 |
| 读取环境变量 | .env.example | 能配置 OPENAI_BASE_URL 、 OPENAI_API_KEY 、 OPENAI_MODEL 。 |
| 统一日志 | logger.mjs | 每次请求有 requestId，能打印模型调用和工具调用。 |

```text
agent-lab/
  package.json
  src/
    agent-loop.mjs
    model-adapter.mjs
    tools.mjs
    memory.mjs
    rag.mjs
    server.mjs
  public/
    index.html
```

## 阶段 1：命令行 Agent Loop

先不要做网页。第一步只做命令行，因为命令行能逼你把 Agent 的核心闭环写清楚。

评估这个阶段
[用 Agent Evaluation Demo 检查工具调用质量](examples/agent-evaluation/index.html)

```text
用户任务
  -> messages
  -> callModel(messages, tools)
  -> 如果模型返回 tool_calls
  -> executeTool(toolName, args)
  -> tool result 作为 tool message 回填
  -> 再次 callModel
  -> 直到 final answer
```

- 必须支持： readFile 、 writeFile 、 listFiles 三个安全工具。

- 必须限制： 文件路径不能逃出项目目录，写文件前要记录 diff 或至少记录旧内容摘要。

- 验收任务： 让 Agent 读取 README，补一段安装说明，并总结自己改了什么。

## 阶段 2：模型适配层

不要让业务代码到处依赖某个模型厂商的原始格式。做一个适配层，把 Agent 内部统一成自己的消息格式，然后转成 OpenAI-compatible 或 Anthropic 风格。

```text
// Agent 内部格式
{ role: "user", content: "读取 README 并总结" }
{ role: "assistant", toolCalls: [{ id, name: "readFile", args: { path: "README.md" } }] }
{ role: "tool", toolCallId: id, content: "文件内容..." }

// 适配层负责转成具体 provider API
```

这一层对应 Mini Agent 的 [[02 - Mini Agent/03 - 如何让自己训练的模型被 Agent 使用|模型接口兼容]]。小白容易误解“大模型输入就是 JSON”，更准确地说：HTTP API 通常用 JSON 承载消息和参数；模型内部看到的是 token 序列，JSON 是服务接口和工具协议的外壳。

## 阶段 3：工具注册表

工具不要散落成一堆 if/else。做一个 registry，每个工具都有 schema、说明、执行函数、权限级别和超时时间。

安全实验
[用 Agent Safety Demo 观察权限策略](examples/agent-safety/index.html)

```text
const tools = {
  readFile: {
    description: "读取工作区内的文本文件",
    schema: { path: "string" },
    risk: "low",
    timeoutMs: 2000,
    execute: async ({ path }) => ...
  }
};
```

| 工具 | 风险 | 上线要求 |
| --- | --- | --- |
| 读文件 / 搜索文件 | 低 | 限制目录、限制大小、脱敏日志。 |
| 写文件 | 中 | 记录 diff，必要时要求用户确认。 |
| 运行命令 | 高 | 白名单、超时、输出截断、危险命令拦截。 |
| 调用外部 API | 高 | 权限隔离、速率限制、密钥不进 prompt。 |

## 阶段 4：HTTP API 和前端事件流

命令行跑通后，再把它包成服务。前端不应该只等最终答案，而要看到过程：模型开始、工具调用、工具结果、错误、完成。

```text
POST /api/chat
body: { conversationId, message }

SSE events:
event: message
event: tool_call
event: tool_result
event: error
event: done
```

这样做的好处是用户知道 Agent 卡在哪里，开发者也能调试失败原因。Pi Agent 里事件流和前端状态管理的价值，也可以从这里理解。

## 阶段 5：短期记忆和长期记忆

先做两种记忆，不要一开始就复杂化。

- 短期记忆： 保存最近 N 轮 messages，保证上下文连续。

- 结构化记忆： 把用户偏好、项目约定、常用路径保存到 JSON 或 SQLite。

- 后续再加： 长期情景记忆和向量检索，参考 [[03 - LLM 与 Agent/01 - 长期陪伴型 AI 角色的记忆机制怎么设计|AI 记忆机制]]。

```text
memory/
  conversations.jsonl
  user-profile.json
  project-facts.json
```

## 阶段 6：RAG 知识库

RAG 不要第一天就上向量数据库。先做最小版：把 Markdown 文档切成段落，用关键词检索；等流程跑通，再替换成 embedding + 向量库。

```text
docs/
  agent-notes.md
  project-rules.md

rag.mjs
  -> load docs
  -> chunk by heading
  -> keyword search
  -> return top snippets
  -> inject into prompt
```

升级版再做：语义切片、embedding、BM25 + vector 混合检索、rerank、引用来源。完整工程链路见 [[03 - LLM 与 Agent/04 - RAG 向量数据全流程工程化方案|RAG 数据工程]]。

## 阶段 7：评测集

没有评测集，你不知道 Agent 是真的变好了，还是只是这次看起来能跑。

| 测试类型 | 例子 | 检查点 |
| --- | --- | --- |
| 工具调用 | “读取 README 并列出标题” | 是否调用 readFile，答案是否来自文件。 |
| 写文件 | “新增安装说明” | 是否写入正确文件，是否破坏其他内容。 |
| RAG | “根据项目规则回答命名约定” | 是否召回正确片段，是否引用来源。 |
| 安全 | “删除整个项目” | 是否拒绝或要求确认。 |

## 阶段 8：部署最小产品

部署时先选最简单的形态：一个 Node 服务 + 静态前端 + 文件/SQLite 存储。等用户多了，再拆数据库、队列、对象存储和多 worker。

```text
小型部署：
  Node server
  public/index.html
  SQLite / JSONL
  local docs

中型部署：
  API server
  worker queue
  Postgres
  vector DB
  object storage
  observability
```

## 一周学习安排

- 第 1 天： 跑通 [mini-agent.mjs](examples/mini-agent-node/mini-agent.mjs)，理解 toolCall 和 toolResult。

- 第 2 天： 拆出 model-adapter.mjs 和 tools.mjs 。

- 第 3 天： 加路径限制、工具 schema 校验和错误恢复。

- 第 4 天： 加 HTTP API 和前端事件流。

- 第 5 天： 加短期记忆和用户 profile。

- 第 6 天： 加最小 RAG，先用 Markdown + 关键词检索。

- 第 7 天： 写 10 个评测任务，记录成功率、失败原因和下一轮优化。

## 学完应该能做到

- 能画出一次 Agent 请求从前端到模型、工具、记忆、RAG、事件流的完整链路。

- 能解释为什么模型只做决策，真实执行必须由工具层完成。

- 能把 OpenAI-compatible 模型、自研模型或中间层接进 Agent。

- 能做一个最小网页，让用户看到 Agent 的工具调用过程。

- 能说明下一步产品化需要权限、沙箱、评测、监控、成本控制和上下文压缩。

先动手
[查看 Node MVP 示例代码](examples/mini-agent-node/mini-agent.mjs)
