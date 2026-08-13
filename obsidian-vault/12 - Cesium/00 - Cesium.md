---
title: "Cesium 学习路径：从 Viewer 到 GPU"
module: "Cesium"
source_html: "modules/cesium/index.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/cesium/index.html"
tags:
  - learn-pi
  - module/cesium
---

> Cesium Path

# Cesium 学习路径：从 Viewer 到 GPU

这是一条和 Pi Agent 并列的学习路径。Pi 路径关注 agent 如何决策和调用工具；Cesium 路径关注三维引擎如何从数据、场景、命令一路走到 WebGL 绘制。

## 先建立 Cesium 的分层心智模型

### 应用层

`Viewer`、`CesiumWidget`、Entity API、Camera、Imagery/Terrain 配置。大多数业务从这里进入。

### 场景层

`Scene` 管理 canvas、frameState、primitives、globe、camera、render loop。

### 数据表达层

Entity、DataSource、Primitive、GeometryInstance、Appearance、3D Tiles、Globe、Terrain、Imagery。

### 渲染命令层

Primitive update 产生 `DrawCommand` / `ComputeCommand`，命令进入 frameState.commandList。

### Renderer 层

ShaderProgram、VertexArray、RenderState、Texture、Framebuffer 对 WebGL 做封装。

### GPU 层

WebGL 执行 draw call，顶点着色、片元着色、深度测试、混合、输出到 framebuffer。

## 为什么 Cesium 不直接让 Entity 画到 WebGL

Entity 是面向业务的高级抽象，适合描述“这个对象是什么”。WebGL 需要的是 buffer、shader、uniform、render state。中间必须经过 Primitive 和 Command 层，把业务对象变成可执行的绘制命令。

## 推荐学习顺序

- 先会用 `Viewer` 创建地球、相机、图层。

- 理解 Entity 和 Primitive 的区别。

- 理解 Scene 每帧如何 update 和 render。

- 理解 Primitive 如何产生 DrawCommand。

- 理解 DrawCommand 如何封装 WebGL draw call。

- 理解自定义 shader 如何进入 `ShaderProgram` 和 `DrawCommand`。

- 最后读 Globe、Terrain、Imagery、3D Tiles 的专用渲染管线。

## 新增重点章节

如果你想知道 Cesium 里写的 GLSL 最后变成什么，可以直接读自定义着色器章节。它按 `CustomShader`、`Material/Fabric`、`Appearance`、`PostProcessStage` 和底层 `DrawCommand` 分类说明。

Shader 专章
[[12 - Cesium/02 - Cesium 如何写自定义着色器：从 API 到 DrawCommand|看自定义着色器到 DrawCommand 的完整链路]]

## 官方参考

- [Cesium Architecture Wiki](https://github.com/CesiumGS/cesium/wiki/Architecture)

- [CesiumJS GitHub](https://github.com/CesiumGS/cesium)

- [CesiumJS API Reference](https://cesium.com/learn/cesiumjs/ref-doc/)

下一步
[[12 - Cesium/01 - Cesium 完整渲染路径：从 Viewer 到 GPU|看完整渲染路径]]
