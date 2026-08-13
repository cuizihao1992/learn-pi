---
title: "做自己的 Agent：项目任务清单"
source_html: "pages/agent-project-checklist.html"
site_url: "https://cuizihao1992.github.io/learn-pi/pages/agent-project-checklist.html"
tags:
  - learn-pi
---

> Project Checklist

# 做自己的 Agent：项目任务清单

如果你真想写一个自己的 Agent，不要一开始做“全能智能体”。先做一个文件助手：能读文件、查知识、调用模型、解释过程、返回结果。

## MVP 范围

| 模块 | 必须有 | 暂时不要做 |
| --- | --- | --- |
| 模型 | OpenAI-compatible chat completions | 多模型自动路由 |
| 工具 | readFile、listFiles、searchText | 任意 shell 执行 |
| 记忆 | 最近对话 + project facts | 复杂情绪画像 |
| RAG | Markdown 文档关键词检索 | 一开始就上分布式向量库 |
| 前端 | 任务输入、事件流、最终答案 | 复杂多用户系统 |

## 任务拆解

- 新建 Node 项目，能读取环境变量并调用模型。

- 实现统一消息格式，不让业务代码直接依赖 provider 原始格式。

- 实现工具注册表，所有工具都有 schema、描述、超时和风险等级。

- 实现 Agent Loop：模型返回 toolCall，运行工具，toolResult 回填，再次调用模型。

- 实现路径安全：工具不能读取工作区外文件。

- 实现事件流：message、tool_call、tool_result、error、done。

- 实现最小网页：输入任务，实时显示工具调用过程。

- 实现短期记忆：保存最近 N 轮消息。

- 实现 project facts：保存项目偏好和常用路径。

- 实现最小 RAG：读取 docs 目录，按标题切片，关键词检索。

- 实现 10 个评测任务，记录每次是否通过。

## 验收任务

```text
任务 1：读取 README，列出项目主要模块。
任务 2：搜索所有包含 toolCall 的页面，解释 toolResult 为什么要回填。
任务 3：根据 docs/project-rules.md 回答命名规范，并引用来源。
任务 4：记住“我喜欢先看架构图再看代码”，下一轮回答时主动按这个偏好组织。
任务 5：尝试访问工作区外路径，Agent 必须拒绝。
```

## 失败复盘表

| 失败现象 | 可能原因 | 下一步 |
| --- | --- | --- |
| 模型不调用工具 | tool description 不清楚，system prompt 没要求用工具 | 改工具说明，增加示例。 |
| 工具参数错误 | schema 太松或模型输出不稳定 | 加参数校验和错误回填。 |
| 回答编造 | RAG 没召回证据或 prompt 没约束引用 | 加引用要求和无法回答策略。 |
| 前端看不到过程 | 没有事件流或事件粒度太粗 | 把工具调用、工具结果拆成事件。 |
