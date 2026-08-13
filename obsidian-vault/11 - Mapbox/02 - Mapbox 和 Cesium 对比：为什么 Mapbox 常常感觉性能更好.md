---
title: "Mapbox 和 Cesium 对比：为什么 Mapbox 常常感觉性能更好"
module: "Mapbox"
source_html: "modules/mapbox/vs-cesium.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mapbox/vs-cesium.html"
tags:
  - learn-pi
  - module/mapbox
---

> Comparison

# Mapbox 和 Cesium 对比：为什么 Mapbox 常常感觉性能更好

这个问题必须加限定条件：在二维地图、矢量瓦片、城市道路、POI、样式切换、普通业务标注等场景里，Mapbox 往往更轻、更快；但在真实三维地球、地形、海量 3D Tiles、全球坐标精度、地下/倾斜摄影/航空航天场景里，Cesium 的能力边界更强。它们不是同一个目标下的简单快慢关系。

## 核心差异表

| 维度 | Mapbox GL JS | CesiumJS |
| --- | --- | --- |
| 核心目标 | 高性能交互式 Web 地图，强项是 2D/2.5D 矢量地图 | 三维地球和大规模 3D 地理空间可视化 |
| 数据模型 | source + layer + vector/raster tiles | Scene + Primitive + Globe + Terrain + Imagery + 3D Tiles |
| 坐标复杂度 | 主要围绕 Web Mercator 和屏幕瓦片 | 全球椭球、ECEF、地形高度、相机视锥、精度处理 |
| 渲染对象 | 按瓦片和图层批量画线、面、符号、栅格 | 地球、地形、影像、模型、点云、3D Tiles、体量数据 |
| 常见性能优势 | 轻量瓦片、样式驱动、批处理、worker 解析、缓存友好 | 处理复杂三维场景能力强，但调度负担更重 |
| 适合场景 | 导航地图、业务地图、POI、路线、运营看板、2D 城市地图 | 数字孪生、三维地球、倾斜摄影、地形、3D Tiles、航空航天 |

## 为什么 Mapbox 在二维地图里常常更快

### 1. 问题更窄，架构更专

Mapbox 的主战场是地图瓦片和样式渲染。它不需要默认处理完整三维地球的地形曲面、全球精度、3D Tiles traversal、terrain imagery 混合、地下空间、复杂相机和海量三维对象。问题域越窄，优化就越集中。

### 2. Vector tile 天然适合裁剪和缓存

Mapbox 的矢量瓦片只加载当前 zoom 和视口附近的数据。瓦片可以被 CDN 和浏览器缓存，数据也可以按 zoom 简化。相比直接加载大 GeoJSON 或复杂三维 tileset，典型二维地图的数据量和解析成本更可控。

### 3. Style layer 可以批量组织渲染

Mapbox 的 layer 类型非常明确：fill、line、symbol、circle 等。渲染器可以围绕这些固定类型做批处理和缓存。Cesium 的对象类型更开放，可能是地形、影像、模型、点云、primitive、classification、后处理，统一调度更复杂。

### 4. Worker 分担瓦片解析

Mapbox 会把不少瓦片解析、布局、符号处理放进 worker。主线程更多负责交互和提交渲染。Cesium 也有异步加载和 worker，但三维场景的数据准备和可见性判断通常更重。

### 5. 二维屏幕空间交互更便宜

二维地图的 pan/zoom 可以围绕瓦片金字塔和屏幕变换优化。Cesium 的三维相机要处理椭球、地形遮挡、视锥裁剪、深度、精度和更多 pass。越接近真实三维世界，计算负担越重。

## 什么时候 Cesium 更合适

- 你需要真实三维地球，而不是平面或轻量 2.5D 地图。

- 你要加载地形、倾斜摄影、BIM、点云、3D Tiles。

- 你需要全球尺度、高精度相机、卫星轨道、飞行路径、地球曲率。

- 你需要和 3D Tiles、glTF、大规模三维数据生态结合。

## 选择建议

| 需求 | 更推荐 | 原因 |
| --- | --- | --- |
| 普通业务地图、点线面、POI、路线 | Mapbox | 样式系统强，矢量瓦片成熟，交互轻。 |
| 大屏二维地图、城市运营、热力、轨迹 | Mapbox / OpenLayers | 二维地图成本低，开发快。 |
| 三维地球、地形、卫星轨迹 | Cesium | 全球 3D 场景是 Cesium 的核心。 |
| 倾斜摄影、BIM、点云、3D Tiles | Cesium | 3D Tiles 加载和调度能力成熟。 |
| 只要建筑拔高 2.5D 效果 | Mapbox | `fill-extrusion` 足够，成本低。 |
| 建筑内部结构、真实三维模型交互 | Cesium / Three.js 组合 | 需要更强三维表达。 |

## 一句话总结

Mapbox 快，常常是因为它把问题收敛到“瓦片化二维/2.5D 地图 + 样式驱动批量渲染”；Cesium 重，常常是因为它承担了“真实三维地球 + 地形 + 影像 + 3D Tiles + 全球精度”的复杂性。不是谁绝对更好，而是谁的抽象更匹配你的问题。
