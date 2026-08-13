---
title: "用 Understand Anything 研究 Pi Agent"
module: "Pi Agent"
source_html: "modules/pi-agent/understand-anything.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/understand-anything.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Repository Understanding

# 用 Understand Anything 研究 Pi Agent

Understand Anything 是一个代码库理解工具。它会扫描仓库文件、导入关系和代码结构，并生成 `.understand-anything/knowledge-graph.json` 供交互式图谱使用。对 Pi Agent 这类多包 TypeScript 项目，它适合先建立仓库地图，再围绕 toolCall、模型 provider、session、前端事件流做深挖。

## 它解决什么问题

| 问题 | Understand Anything 的作用 | 人工仍要判断什么 |
| --- | --- | --- |
| 不知道从哪里读源码 | 列出文件、包、语言、导入热点和架构层级。 | 哪些链路对学习目标最重要。 |
| 调用关系分散 | 提取 import map、结构节点、函数类信息。 | 导入关系不等于真实运行链路，需要结合入口和事件。 |
| 仓库太大 | 把 800+ 文件压成可检索图谱。 | 是否先限定到 `packages/coding-agent`、`packages/ai` 等子域。 |
| 想问“这个功能在哪里” | 通过 dashboard / chat / explain 辅助定位。 | 答案要回到源码验证，不能只信摘要。 |

## 安装与运行

Windows 安装到 Pi 平台：

```text
iwr -useb https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.ps1 | iex
```

非交互安装可以显式指定平台：

```text
$script = Join-Path $env:TEMP 'understand-anything-install.ps1'
Invoke-WebRequest -UseBasicParsing `
  -Uri 'https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.ps1' `
  -OutFile $script
powershell -ExecutionPolicy Bypass -File $script -Platform pi
```

进入 Pi Agent 仓库后，完整技能流程是：

```text
/understand --language zh
/understand-dashboard
/understand-chat Pi Agent 的 toolCall 到 toolResult 是怎么流转的？
/understand-explain packages/coding-agent/src/core/agent-session.ts
```

## 本次实际运行情况

当前 Codex 会话中，Understand Anything 已安装到本机，但新技能不能在当前会话热加载，所以没有直接执行完整 `/understand` 多代理流程。已直接运行插件内的确定性脚本，生成了 Pi Agent 的扫描、导入关系和结构提取文件。

| 产物 | 路径 | 作用 |
| --- | --- | --- |
| 扫描结果 | C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\pi\.understand-anything\intermediate\scan-raw.json | 文件清单、语言、类型、行数、复杂度。 |
| 导入关系 | C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\pi\.understand-anything\intermediate\import-map.json | 827 个文件的内部 import map。 |
| 核心结构 | C:\Users\Administrator\Documents\Codex\2026-06-16\pi-agent-pi-agent\work\pi\.understand-anything\intermediate\structure-core.json | `packages/*` 核心源码结构提取。 |

## 用它研究 Pi Agent 的正确流程

- 先运行仓库级扫描，确认项目规模、语言、包分布。

- 再看导入热点，找到入口和协调器文件。

- 围绕一个问题深挖，不要试图一次读完整仓库。

- 把 Understand Anything 的图谱结果和手工调用图互相校验。

- 最终沉淀成 learn-pi 的专题页，而不是只保留工具输出。

## 最适合 Pi Agent 的五个研究问题

### toolCall 到 toolResult

模型请求工具后，运行时如何校验、执行、回填结果。
[[01 - Pi Agent/05 - Pi Agent：toolCall 如何变成 toolResult|看源码深挖]]

### 模型 provider 适配

OpenAI、Anthropic、自研模型如何进入统一消息流。
[[01 - Pi Agent/07 - pi-ai：为什么需要模型适配层|看模型接口]]

### AgentSession

会话如何保存消息、工具、压缩、事件和运行时服务。
[[01 - Pi Agent/06 - 会话、分支和上下文压缩|看会话与压缩]]

### 前端事件流

AgentEvent 如何变成终端 UI 可展示的状态。
[[01 - Pi Agent/08 - 前端如何实时展示 Agent 运行过程|看前端事件]]

### Mini Agent 对照

用最小 Agent Loop 反推 Pi 的工程化复杂度。
[[02 - Mini Agent/00 - Mini Agent|看 Mini Agent]]

本次生成结果
[[01 - Pi Agent/15 - Pi Agent 的 Understand Anything 扫描摘要|查看 Pi Agent 扫描摘要]]
