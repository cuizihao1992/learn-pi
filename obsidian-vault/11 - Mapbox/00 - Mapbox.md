---
title: "Mapbox：从矢量瓦片到 WebGL 地图"
module: "Mapbox"
source_html: "modules/mapbox/index.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mapbox/index.html"
tags:
  - learn-pi
  - module/mapbox
---

> Mapbox

# Mapbox：从矢量瓦片到 WebGL 地图

Mapbox GL JS 的核心心智模型是：数据被切成 tile，样式写成 Style JSON，渲染器按 source 和 layer 把瓦片里的要素批量绘制到 WebGL。它特别擅长二维地图、矢量瓦片、样式驱动渲染、符号标注和大规模地图交互。

## 一句话链路

```text
Map
  -> Style JSON
  -> Sources
  -> Layers
  -> Tile loading / worker parsing
  -> Bucket / layout
  -> WebGL draw calls
  -> screen pixels
```

## Mapbox 的几个核心概念

### Map

`mapboxgl.Map` 是入口，负责 canvas、相机、交互、style 加载、渲染循环和事件系统。

### Style

Style JSON 定义地图画什么、按什么顺序画、每层怎么画。官方 Style Spec 明确说 style 定义地图视觉外观、绘制数据和绘制顺序。

### Source

source 是数据来源：vector、raster、raster-dem、geojson、image、video 等。vector source 通常是 Mapbox Vector Tile。

### Layer

layer 是绘制规则：fill、line、symbol、circle、heatmap、raster、hillshade、fill-extrusion、model 等。

### Worker

瓦片解析、布局、符号处理等工作会放到 worker 中，减轻主线程压力。

### Renderer

渲染器按 layer 和 tile 组织 draw call，使用 WebGL 绘制线、面、符号、栅格和部分 3D 效果。

## 一个最小例子

```text
mapboxgl.accessToken = "YOUR_TOKEN";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [116.39, 39.9],
  zoom: 10
});

map.on("load", () => {
  map.addSource("points", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { name: "Beijing" },
        geometry: { type: "Point", coordinates: [116.39, 39.9] }
      }]
    }
  });

  map.addLayer({
    id: "points-circle",
    type: "circle",
    source: "points",
    paint: {
      "circle-radius": 8,
      "circle-color": "#00768a"
    }
  });
});
```

这段代码的核心不是“画一个点”这么简单，而是把数据放进 source，把绘制规则放进 layer。Mapbox 的渲染器会根据当前视口、zoom、style、source 数据自动组织渲染。

## 推荐学习顺序

- 先理解 Style JSON：source 和 layer 是 Mapbox 的骨架。

- 理解 vector tile：地图数据为什么要切片、简化、编码、缓存。

- 理解 layer 类型：fill、line、symbol、circle、heatmap、raster、fill-extrusion。

- 理解表达式 expression：样式如何根据 zoom、属性、状态动态变化。

- 理解性能模型：source 数、layer 数、vertex 数、表达式复杂度、数据更新频率。

- 最后和 Cesium 对比：二维样式地图为什么通常更轻，三维地球为什么更复杂。

## 官方参考

- [Mapbox GL JS Guides](https://docs.mapbox.com/mapbox-gl-js/guides/)

- [Mapbox Style Specification](https://docs.mapbox.com/style-spec/guides/)

- [Mapbox GL JS performance guide](https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/)

- [Mapbox Vector Tile Specification](https://github.com/mapbox/vector-tile-spec)

下一步
[[11 - Mapbox/01 - Mapbox 渲染路径：样式驱动的瓦片渲染|看 Mapbox 渲染架构]]
