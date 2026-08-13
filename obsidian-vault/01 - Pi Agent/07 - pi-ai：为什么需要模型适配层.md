---
title: "pi-ai：为什么需要模型适配层"
module: "Pi Agent"
source_html: "modules/pi-agent/models.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/models.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Part 6

# pi-ai：为什么需要模型适配层

不同模型 API 对 messages、tools、images、reasoning、stream 的格式都不一样。Pi 把这些差异集中到 `pi-ai`，让 Agent loop 只面对统一抽象。

## Agent loop 希望看到的统一世界

```text
streamSimple(model, context, options)
  -> EventStream<AssistantMessageEvent, AssistantMessage>
```

这意味着上层只关心：模型是什么、上下文是什么、工具有哪些、事件如何流出来。

## provider 差异有哪些

- 工具调用字段名不同。

- thinking/reasoning 表达方式不同。

- 图片输入格式不同。

- stream chunk 格式不同。

- token usage、cache read/write、cost 计算方式不同。

- 认证方式不同：API key、OAuth、headers、endpoint。

## 为什么不直接在 Agent loop 里判断 provider

如果在 runLoop 里到处写 `if provider === "openai"`，主循环会被模型 API 污染，工具执行和状态管理也难测试。把 provider 差异放进 pi-ai，主循环就能保持稳定。

## 关键源码

- `packages/ai/src/index.ts`：统一出口。

- `packages/ai/test/*openai*.test.ts`：OpenAI 相关行为。

- `packages/ai/test/*anthropic*.test.ts`：Anthropic 工具和 thinking 行为。

- `packages/coding-agent/src/core/model-registry.ts`：产品层如何选择模型。

- `packages/coding-agent/src/core/auth-storage.ts`：认证如何保存。

下一步
[[01 - Pi Agent/08 - 前端如何实时展示 Agent 运行过程|看事件如何返回前端]]
