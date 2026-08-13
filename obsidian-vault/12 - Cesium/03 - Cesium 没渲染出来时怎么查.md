---
title: "Cesium 没渲染出来时怎么查"
module: "Cesium"
source_html: "modules/cesium/debugging.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/cesium/debugging.html"
tags:
  - learn-pi
  - module/cesium
---

> Debugging

# Cesium 没渲染出来时怎么查

Cesium 渲染问题要沿着 Viewer -> Scene -> Primitive -> Command -> Renderer -> WebGL 查。不要只盯业务数据。

## 常见问题定位

| 现象 | 可能原因 | 检查点 |
| --- | --- | --- |
| 对象完全不显示 | 坐标错、被裁剪、没进入 commandList、show=false | Primitive.update 是否执行；boundingVolume 是否正确 |
| 只有某些角度显示 | 剔除、深度、包围球、相机 near/far | cullingVolume、RenderState、debugShowBoundingVolume |
| 透明物体异常 | pass 错、排序错、blend state 错 | Pass.TRANSLUCENT、RenderState.blending |
| shader 编译失败 | GLSL 版本、attribute/uniform 名不匹配 | ShaderProgram 创建日志 |
| 地形/影像不加载 | 网络、token、tile provider、LOD | terrainProvider、imageryLayers、Network 面板 |

## 渲染链路检查清单

```text
1. Viewer 是否创建成功
2. Scene 是否在 render
3. 对象是否加入 scene.primitives 或 entities
4. update 是否把命令 push 到 frameState.commandList
5. DrawCommand 是否有 vertexArray / shaderProgram / renderState
6. pass 是否正确
7. boundingVolume 是否合理
8. shader 是否编译通过
9. WebGL 是否报错
10. framebuffer / depth / blending 是否符合预期
```

## 最重要的一句话

Cesium 里“数据存在”不等于“会画出来”。只有最终形成正确的 DrawCommand，并被 Scene 在正确 pass 执行，GPU 才会产生像素。
