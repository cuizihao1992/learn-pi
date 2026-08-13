---
title: "Cesium 完整渲染路径：从 Viewer 到 GPU"
module: "Cesium"
source_html: "modules/cesium/render-path.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/cesium/render-path.html"
tags:
  - learn-pi
  - module/cesium
---

> Rendering Pipeline

# Cesium 完整渲染路径：从 Viewer 到 GPU

这一章回答一个核心问题：你在 Cesium 里添加一个对象后，它到底如何一步步变成屏幕上的像素？

## 一句话总览

```text
Viewer
  -> CesiumWidget
  -> Scene
  -> frameState
  -> PrimitiveCollection / Globe / 3D Tiles
  -> Primitive.update()
  -> DrawCommand / ComputeCommand
  -> Scene command execution
  -> Renderer
  -> WebGL
  -> GPU pixels
```

## 1. Viewer：应用入口

`Viewer` 是最常用的入口。它帮你创建 canvas、CesiumWidget、Scene、Camera、Clock、DataSourceDisplay、EntityCollection、ImageryLayerCollection 等。业务代码通常写：

```text
const viewer = new Cesium.Viewer("container");
viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(116.39, 39.9),
  point: { pixelSize: 10, color: Cesium.Color.RED }
});
```

这时你添加的是 Entity。Entity 还不是 WebGL 绘制命令，它只是业务描述。

## 2. Entity 到 Primitive

Entity API 是高级抽象。Cesium 内部会通过 DataSourceDisplay 和各种 Visualizer，把 Entity 转成更底层的 Primitive 或相关渲染对象。

```text
Entity
  -> DataSourceDisplay.update()
  -> Visualizer.update()
  -> Primitive / Billboard / Label / Geometry updater
```

如果你直接用 `scene.primitives.add(new Primitive(...))`，则跳过 Entity 层，直接进入底层渲染对象。

## 3. Scene 每帧更新

`Scene` 是渲染调度中心。每一帧，它会准备 frameState，更新相机、时间、视锥、pass、环境状态，然后让场景里的对象产生命令。

```text
Scene.render()
  -> initializeFrame()
  -> updateAndExecuteCommands()
  -> render()
  -> postRender events
```

官方架构文档也把 Scene 描述为和 canvas 一一对应的图形对象与状态容器，并说明 Primitive 是添加到 Scene 中、会被绘制的对象。

## 4. Primitive.update 产生命令

Primitive 的职责不是马上调用 WebGL，而是在 update 阶段把自己转换成渲染命令，放入 `frameState.commandList`。

```text
Primitive.update(frameState)
  -> 准备 geometry / vertex array
  -> 准备 appearance / shader
  -> 准备 renderState / uniformMap
  -> 创建 DrawCommand
  -> frameState.commandList.push(drawCommand)
```

这就是 Cesium 很重要的设计：对象先产生命令，Scene 再统一排序、分 pass、执行命令。

## 5. DrawCommand 封装一次绘制

`DrawCommand` 可以理解为“一次 WebGL draw call 的完整说明书”。它通常包含：

- vertexArray：顶点数据。

- shaderProgram：顶点/片元着色器。

- uniformMap：每帧传给 shader 的变量。

- renderState：深度测试、混合、剔除等状态。

- pass：opaque、translucent、overlay、pick 等渲染阶段。

- boundingVolume：视锥裁剪和调试。

```text
DrawCommand {
  vertexArray,
  shaderProgram,
  uniformMap,
  renderState,
  pass,
  boundingVolume
}
```

## 6. Scene 统一执行命令

Scene 会对 commandList 做裁剪、排序、按 pass 执行。opaque 和 translucent 通常不能随便混着画，因为透明物体需要特殊排序和混合。

```text
commandList
  -> culling
  -> pass sorting
  -> executeCommand()
  -> command.execute(context, passState)
```

## 7. Renderer 封装 WebGL

Renderer 层把 WebGL 对象包装成 Cesium 内部对象：`Context`、`ShaderProgram`、`VertexArray`、`Texture`、`Framebuffer`、`RenderState`。这样上层不需要到处直接操作 WebGL API。

```text
DrawCommand.execute()
  -> bind shaderProgram
  -> bind vertexArray
  -> apply renderState
  -> set uniforms
  -> gl.drawElements / gl.drawArrays
```

## 8. Globe / Terrain / Imagery 的特殊路径

地球不是一个普通三角形。Globe 会管理地形瓦片、影像图层、瓦片加载、LOD、裁剪、shader 混合。逻辑上仍然会走“对象产生 command，Scene 执行 command”的路径，只是它内部的 tile pipeline 更复杂。

```text
Scene.globe
  -> Globe.update()
  -> QuadtreePrimitive
  -> terrain tile selection
  -> imagery layer texture
  -> terrain/imagery draw commands
```

## 9. 3D Tiles 的特殊路径

3D Tiles 会先做 tileset traversal，根据相机选择可见 tile，再加载 glTF/mesh/metadata，最后生成 draw commands。

```text
Cesium3DTileset.update()
  -> traversal / screen space error
  -> request visible tiles
  -> prepare tile content
  -> push draw commands
```

## 10. 为什么这样设计

- Entity 友好： 业务代码容易写。

- Primitive 高效： 性能敏感场景可以跳过高级抽象。

- Command 可调度： Scene 能统一排序、裁剪、分 pass、做 picking。

- Renderer 可复用： WebGL 状态管理集中，不污染高层对象。

- 适合海量数据： Terrain、Imagery、3D Tiles 都可以用各自的 tile pipeline 产生命令。

## 11. 自定义 shader 插在哪里

自定义 shader 不是绕开这条路径，而是插入到路径中的某个层级：`CustomShader` 插入 Model/3D Tiles 的 shader pipeline；`Material/Fabric` 插入 Appearance 的材质片段；`PostProcessStage` 插入 Scene 渲染完成后的屏幕空间 pass；底层自定义 Primitive 则直接创建 `DrawCommand`。

```text
CustomShader / Material / Appearance / PostProcessStage
  -> 影响 ShaderProgram 或后处理 shader
  -> 进入 DrawCommand / post-process command
  -> Renderer 统一执行
```

详细例子见 [[12 - Cesium/02 - Cesium 如何写自定义着色器：从 API 到 DrawCommand|Cesium 自定义着色器]]。

## 和 Pi Agent 的类比

| Pi Agent | Cesium | 共同点 |
| --- | --- | --- |
| 用户 prompt | 业务 Entity/Primitive | 都是高层意图。 |
| AgentSession | Viewer/Scene | 都是运行时调度中心。 |
| toolCall | DrawCommand | 都是“下一步要执行什么”的结构化命令。 |
| 工具执行 | Renderer/WebGL 执行 | 真正落地动作在底层执行。 |
| AgentEvent | frameState/commandList | 中间状态让系统可观察、可调度。 |

## 源码阅读入口

- `packages/engine/Source/Widgets/Viewer/Viewer.js`：应用入口。

- `packages/engine/Source/Scene/Scene.js`：渲染调度中心。

- `packages/engine/Source/Scene/Primitive.js`：Primitive 如何产生命令。

- `packages/engine/Source/Renderer/DrawCommand.js`：绘制命令。

- `packages/engine/Source/Renderer/Context.js`：WebGL 上下文封装。

- `packages/engine/Source/Scene/Globe.js`：地球、地形和影像入口。

- `packages/engine/Source/Scene/Cesium3DTileset.js`：3D Tiles 入口。

## 官方参考

- [Cesium Architecture Wiki](https://github.com/CesiumGS/cesium/wiki/Architecture)

- [Geometry and Appearances](https://github.com/CesiumGS/cesium/wiki/Geometry-and-Appearances)

- [CesiumJS API Reference](https://cesium.com/learn/cesiumjs/ref-doc/)
