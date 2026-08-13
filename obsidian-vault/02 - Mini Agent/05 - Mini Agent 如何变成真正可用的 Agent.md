---
title: "Mini Agent 如何变成真正可用的 Agent"
module: "Mini Agent"
source_html: "modules/mini-agent/roadmap.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mini-agent/roadmap.html"
tags:
  - learn-pi
  - module/mini-agent
---

> Roadmap

# Mini Agent 如何变成真正可用的 Agent

50 行 agent loop 只能说明原理。要做成可用产品，还要补齐安全、状态、UI、错误恢复、观测和模型兼容。

## 升级路线

- 工具 schema 校验： 防止模型输出坏参数。

- 事件系统： 把 message、tool、error、done 都变成事件。

- 流式输出： 提升用户感知，支持前端实时渲染。

- 会话持久化： 保存 messages、toolResult、usage、错误。

- 权限沙箱： 限制文件路径、命令、网络和环境变量。

- 上下文压缩： 长任务必须有 summary 和截断策略。

- 模型适配层： 支持 OpenAI-compatible、自研模型和不同 provider。

- 评测集： 用真实任务验证工具调用成功率和恢复能力。

先看安全边界
[打开 Agent Safety Demo](examples/agent-safety/index.html)

## 和 Pi 的对应关系

Pi Agent 可以看成 Mini Agent 的工程化版本：`Agent` 负责状态，`runLoop` 负责调度，`AgentSession` 负责产品运行时，`pi-ai` 负责模型适配，tools 负责真实执行。
