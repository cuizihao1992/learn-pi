---
title: "OpenLayers 完整渲染路径：从 Map 到 Canvas/WebGL"
module: "OpenLayers"
source_html: "modules/openlayers/render-path.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/openlayers/render-path.html"
tags:
  - learn-pi
  - module/openlayers
---

> Rendering Pipeline

# OpenLayers 完整渲染路径：从 Map 到 Canvas/WebGL

这一章回答：你创建一个 TileLayer 或 VectorLayer 后，OpenLayers 如何加载数据、计算视图、选择 renderer，并最终画到屏幕上。

## 一句话总览

```text
new Map({ target, view, layers })
  -> MapBrowserEventHandler / interactions
  -> View state: center / resolution / rotation / projection
  -> layerGroup
  -> LayerRenderer
  -> Source loads tiles/features/images
  -> frameState / layerState
  -> Canvas or WebGL renderer
  -> browser paints pixels
```

## 1. Map 是调度中心

`Map` 持有目标 DOM、View、LayerGroup、交互、控件。它监听 View 和 Layer 的变化，然后安排下一帧渲染。

```text
Map
  -> target HTMLElement
  -> View
  -> LayerGroup
  -> interactions
  -> controls
  -> renderer
```

## 2. View 决定地图怎么看

View 不是图层，也不是数据。它描述当前视角：center、resolution/zoom、rotation、projection。Layer renderer 会根据 View state 计算需要加载哪些瓦片或哪些要素落在当前视口内。

```text
View state
  center: 当前中心
  resolution: 当前地图分辨率
  zoom: resolution 的离散表达
  rotation: 旋转角
  projection: 坐标系
```

## 3. Layer 是视觉表达，Source 是数据来源

官方 Basic Concepts 里把 Layer 定义为 Source 数据的视觉表示，并列出 Tile、Image、Vector、VectorTile 四类基本 Layer。这个分离非常重要：Source 管数据，Layer 管怎么展示。

```text
TileLayer
  -> TileSource(OSM/XYZ/WMTS)
  -> tile grid
  -> image tiles

VectorLayer
  -> VectorSource
  -> Feature collection
  -> Style function

VectorTileLayer
  -> VectorTileSource
  -> tile features
  -> renderer draws tiled vectors
```

## 4. TileLayer 的渲染路径

```text
Map render frame
  -> TileLayerRenderer.prepareFrame()
  -> Source.getTile(z, x, y)
  -> tile cache / network loading
  -> draw loaded tile images to canvas
  -> handle opacity / extent / zIndex
```

瓦片图层的关键是：根据当前 View resolution 选择 z/x/y 瓦片，加载图片，按瓦片网格贴到 canvas 上。

## 5. VectorLayer 的渲染路径

```text
Map render frame
  -> VectorLayerRenderer.prepareFrame()
  -> Source.getFeaturesInExtent()
  -> styleFunction(feature, resolution)
  -> build replay/instruction groups
  -> draw geometries/text/images to canvas
```

矢量图层的关键是：要素在客户端渲染。样式函数会把 Feature 转成绘制指令。

## 6. VectorTileLayer 的路径

VectorTile 结合了瓦片加载和客户端矢量渲染：数据按瓦片切分，但每个瓦片内是矢量要素，而不是图片。

```text
VectorTileLayer
  -> choose visible vector tile coords
  -> load MVT/GeoJSON vector tiles
  -> parse features
  -> apply styles
  -> render tile-local vectors
```

## 7. Canvas 和 WebGL 的差别

| 渲染器 | 适合 | 特点 |
| --- | --- | --- |
| Canvas | 普通瓦片、普通矢量、小中等数据量 | 实现直观，调试容易，性能有限。 |
| WebGL | 大量点线面、矢量瓦片、图像处理 | 把更多工作交给 GPU，性能更好，但 shader 和状态更复杂。 |

## 8. OpenLayers 和 Cesium 的渲染链路类比

| OpenLayers | Cesium | 共同点 |
| --- | --- | --- |
| Map | Viewer / Scene | 运行时入口和调度中心。 |
| View | Camera | 决定当前看哪里、怎么看。 |
| Layer | Primitive / Globe / Tileset | 可渲染对象。 |
| Source | TerrainProvider / ImageryProvider / Tile content | 数据来源和加载。 |
| LayerRenderer | DrawCommand / Renderer | 把对象转成底层绘制动作。 |

## 9. 源码阅读入口

- `src/ol/Map.js`：地图入口和渲染调度。

- `src/ol/View.js`：视图状态和约束。

- `src/ol/layer/Base.js`、`Layer.js`：图层基础类。

- `src/ol/source/Source.js`：Source 基础类。

- `src/ol/renderer/`：Canvas/WebGL renderer。

- `src/ol/layer/Tile.js`、`Vector.js`、`VectorTile.js`：典型 Layer。
