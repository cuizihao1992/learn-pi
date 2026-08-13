---
title: "Cesium 渲染术语表"
module: "Cesium"
source_html: "modules/cesium/glossary.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/cesium/glossary.html"
tags:
  - learn-pi
  - module/cesium
---

> Reference

# Cesium 渲染术语表

## Viewer

最高级应用入口，帮你创建 Scene、Camera、Clock、EntityCollection、DataSourceDisplay 等。

## Scene

一帧渲染的调度中心，管理 canvas、camera、globe、primitives、frameState 和 commandList。

## Entity

业务友好的动态对象抽象。适合应用层描述对象，但不是底层绘制命令。

## Primitive

更接近渲染层的对象，update 时通常产生命令。

## Appearance

描述几何体如何着色，关联 shader、material、render state。

## DrawCommand

一次绘制命令，封装 vertexArray、shaderProgram、uniformMap、renderState、pass。

## RenderState

WebGL 渲染状态，如深度测试、剔除、混合、颜色写入。

## ShaderProgram

顶点着色器和片元着色器编译链接后的程序。

## FrameState

当前帧状态，包含相机、时间、pass、commandList、cullingVolume 等。

## Pass

渲染阶段，如 opaque、translucent、overlay、pick。

## Globe

地球渲染入口，管理地形、影像图层和瓦片选择。

## 3D Tiles

面向海量三维数据的瓦片格式和运行时，按视角和误差选择 tile。
