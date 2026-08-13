---
title: "OpenLayers 学习路径：从 Map 到像素"
module: "OpenLayers"
source_html: "modules/openlayers/index.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/openlayers/index.html"
tags:
  - learn-pi
  - module/openlayers
---

> OpenLayers Path

# OpenLayers 学习路径：从 Map 到像素

OpenLayers 是 Web 二维地图引擎。它的核心不是“画一张图”，而是把地图视图、图层、数据源、投影、交互和渲染器组织成一个可扩展系统。

## 最小例子

```text
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";

const map = new Map({
  target: "map",
  layers: [
    new TileLayer({ source: new OSM() })
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});
```

官方 API 文档也强调：Map 是核心组件；要渲染一个地图，需要 target container、View 和一个或多个 Layer。

## 核心分层

### Map

应用入口，持有 target、layers、view、controls、interactions，负责统一调度渲染。

### View

描述“怎么看地图”：中心点、分辨率/zoom、旋转、投影、约束。

### Layer

数据的视觉表达。OpenLayers 官方概念里常见 Layer 类型包括 Tile、Image、Vector、VectorTile。

### Source

数据来源。Source 负责加载瓦片、影像、矢量要素、WMS/WMTS/XYZ/OSM 等。

### Renderer

把 Layer 的数据转成 Canvas 或 WebGL 绘制动作。不同 Layer 类型有不同 renderer。

### Interaction / Control

交互和控件层，处理拖拽、缩放、选择、绘制、比例尺等用户行为。

## OpenLayers 和 Cesium 的区别

| 点 | OpenLayers | Cesium |
| --- | --- | --- |
| 主要场景 | 二维 Web 地图、GIS 数据、瓦片和矢量 | 三维地球、地形、3D Tiles、空间可视化 |
| 核心入口 | Map + View + Layer + Source | Viewer + Scene + Primitive + Globe |
| 渲染抽象 | Layer Renderer，Canvas/WebGL | Primitive -> DrawCommand -> Renderer/WebGL |
| 相机/视图 | View 管中心、分辨率、旋转、投影 | Camera 管三维位置、方向、视锥 |

## 推荐学习顺序

- Map/View/Layer/Source 四件套。

- TileLayer + OSM/XYZ 的瓦片加载路径。

- VectorLayer + VectorSource + Feature + Style 的矢量渲染。

- VectorTileLayer 的切片矢量数据路径。

- Renderer 如何选择 Canvas 或 WebGL。

- 交互和事件：pointer、select、modify、draw。

## 官方参考

- [OpenLayers 官方网站](https://openlayers.org/)

- [OpenLayers Basic Concepts](https://openlayers.org/doc/tutorials/concepts.html)

- [OpenLayers API Reference](https://openlayers.org/en/latest/apidoc/)

- [OpenLayers GitHub](https://github.com/openlayers/openlayers)

下一步
[[13 - OpenLayers/01 - OpenLayers 完整渲染路径：从 Map 到 Canvas WebGL|看 OpenLayers 完整渲染路径]]
