---
title: "FAQ：新手最容易卡住的问题"
module: "Pi Agent"
source_html: "modules/pi-agent/faq.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/faq.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Reference

# FAQ：新手最容易卡住的问题

## 模型是不是直接改文件？

不是。模型只能返回 toolCall，比如 `edit({ path, edits })`。真正读写文件的是 Pi 的工具系统。

## 用户 prompt 会原封不动发给模型吗？

不会。用户 prompt 会被包装成 AgentMessage，并和 system prompt、历史消息、工具 schema、summary message 一起组成模型上下文。

## 为什么工具结果还要发回模型？

因为模型需要根据工具结果决定下一步。读完文件后才知道怎么改，测试失败后才知道怎么修。

## Agent 和 AgentSession 有什么区别？

Agent 是通用状态化运行时；AgentSession 是 coding-agent 产品层中心，负责会话、工具、扩展、模型、压缩、UI 事件。

## 为什么要有 pi-ai？

为了把不同 provider 的消息、工具调用、stream、reasoning、usage 差异集中处理，让 Agent loop 保持稳定。

## 为什么一个用户问题会调用多次模型？

因为工具调用是多轮的：模型提出 toolCall，Pi 执行后返回 toolResult，模型再基于结果继续推理。

## 上下文压缩会不会丢信息？

会有取舍，所以摘要 prompt 要保留文件路径、函数名、错误、未完成任务。它牺牲完整细节，换取长任务可继续。

## 前端为什么能实时显示工具执行？

因为 runLoop 和 AgentSession 会持续 emit 事件，interactive-mode 订阅事件并用 pi-tui 差分渲染。

## 为什么不让模型自己管理会话？

会话是可靠状态，应该由程序管理。模型只负责推理下一步，不能承担持久化、一致性和恢复职责。

## 读源码最应该先看哪里？

先看 `main.ts`、`agent-session.ts`、`agent.ts`、`agent-loop.ts`、`tools/index.ts`。不要一开始就钻 provider 细节。

回到课程
[打开课程目录](index.html)
