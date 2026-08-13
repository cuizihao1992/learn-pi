---
title: "Pi Agent：读懂开源 Agent 的运行架构"
module: "Pi Agent"
source_html: "modules/pi-agent/index.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/pi-agent/index.html"
tags:
  - learn-pi
  - module/pi-agent
---

> Pi Agent Module

# Pi Agent：读懂开源 Agent 的运行架构

这个模块专门研究 Pi 这个开源 Agent 项目：它如何组织提示词、模型 provider、工具系统、会话状态、事件流和终端前端。想从零实现自己的 Agent，请进入独立的 Mini Agent 模块。

## 这个模块和其他模块的关系

### Pi Agent

研究“决策系统”：提示词、上下文、模型、工具、会话、压缩、事件。

### Cesium

研究“三维渲染系统”：Viewer、Scene、Primitive、Command、Renderer、GPU。

### OpenLayers

研究“二维地图系统”：Map、View、Layer、Source、Renderer、Canvas/WebGL。

### 共同心智模型

高层意图不会直接执行，都会先变成中间结构，再由运行时统一调度。

## 推荐学习顺序

- 架构设计： 先知道 Pi 为什么拆成 coding-agent、agent-core、pi-ai、pi-tui。

- 完整流程： 用一个完整对话看 prompt、toolCall、toolResult、最终回答如何闭环。

- 提示词处理： 理解原始输入如何被系统提示词、上下文、工具定义包起来。

- 工具调用： 理解模型为什么不能直接改文件，必须请求运行时执行工具。

- 模型接口： 理解 OpenAI、Anthropic、自研模型如何被适配成统一消息流。

- 动手练习： 先完成 Pi 源码阅读任务；再到 Mini Agent 模块把抽象落到代码。

## 入口

### 主线课程

从架构开始读，适合第一次系统学习。
[[01 - Pi Agent/01 - Pi Agent 的架构到底怎么分层|开始学习]]

### 完整例子

直接看一次完整任务如何跑完。
[[01 - Pi Agent/02 - 完整例子：从一句话到模型、工具、前端|看运行流程]]

### 工具闭环深挖

从 `runLoop`、`executeToolCalls`、`prepareToolCall` 追到 `toolResult` 回填。
[[01 - Pi Agent/05 - Pi Agent：toolCall 如何变成 toolResult|打穿 toolCall]]

### 仓库理解工具

用 Understand Anything 扫描 Pi Agent，先得到文件分布、导入热点和研究入口。
[[01 - Pi Agent/14 - 用 Understand Anything 研究 Pi Agent|看 UA 方法]]

### 生成结果

查看本次对本地 Pi Agent 仓库生成的扫描摘要和下一步深挖顺序。
[[01 - Pi Agent/15 - Pi Agent 的 Understand Anything 扫描摘要|看扫描结果]]

### 动手实现

从零写一个 Node Mini Agent。
[[02 - Mini Agent/00 - Mini Agent|写 Mini Agent]]
