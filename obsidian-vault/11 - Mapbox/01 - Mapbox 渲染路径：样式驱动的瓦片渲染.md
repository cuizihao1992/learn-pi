---
title: "Mapbox 渲染路径：样式驱动的瓦片渲染"
module: "Mapbox"
source_html: "modules/mapbox/architecture.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mapbox/architecture.html"
tags:
  - learn-pi
  - module/mapbox
---

> Architecture

# Mapbox 渲染路径：样式驱动的瓦片渲染

Mapbox 的设计非常“地图产品化”：数据按瓦片切好，样式按 layer 声明，渲染器批量处理可见瓦片。业务开发者通常不直接操作 WebGL，而是通过 source、layer、expression 控制渲染。

## 完整调度链路

```text
new mapboxgl.Map()
  -> load style JSON
  -> create sources and layers
  -> determine visible tile IDs by camera/zoom
  -> request vector/raster tiles
  -> worker parse vector tile into features
  -> layout symbol/line/fill buckets
  -> upload buffers/textures to GPU
  -> render layers in style order
  -> WebGL draws pixels
```

## Style JSON 是 Mapbox 的“渲染协议”

Cesium 常从对象和场景图进入，而 Mapbox 常从 style 进入。style 决定 source、layer、paint、layout、filter、minzoom、maxzoom、sprite、glyphs。它像一份地图渲染说明书：哪些数据源可用、哪些图层要画、不同 zoom 和属性下怎么画。

## Source 和 Layer 为什么分开

source 负责数据，layer 负责视觉。一个 source 可以被多个 layer 使用。例如同一份道路 vector source，可以有一个 line layer 画道路底色，一个 line layer 画道路描边，一个 symbol layer 画道路名称。这样数据只需要加载一次，样式可以多层表达。

## Vector Tile 为什么快

- 空间切片： 只加载当前视口附近和当前 zoom 需要的瓦片。

- 数据简化： 不同 zoom 可以使用不同精度，远处不需要高精度几何。

- 缓存友好： 瓦片 URL 可缓存，浏览器、CDN、服务端都能复用。

- 二进制编码： MVT 比直接传巨大 GeoJSON 更适合网络传输和解析。

- 样式分离： 同一份矢量数据可以换样式，不必重新生成栅格图。

## Layer 渲染顺序

Mapbox 按 style 的 layers 顺序绘制。通常底图先画 background、raster、fill，再画 line、fill-extrusion、symbol。symbol 层还涉及文字避让、图标 atlas、glyph 加载、碰撞检测等逻辑。官方 layer spec 也列出了 background、fill、line、symbol、circle、heatmap、raster、hillshade、fill-extrusion、model 等 layer 类型。

## 性能模型

Mapbox 官方性能文档把性能拆成 render time、source update time、layer update time。直觉上，渲染时间受 source 数、layer 数、vertex 数影响；更新 source 受 layer 数和 vertex 数影响；更新 layer 受 vertex 数影响。

| 成本来源 | 为什么变慢 | 优化方向 |
| --- | --- | --- |
| source 太多 | 每个 source 都有加载、解析、调度成本 | 合并 vector source，避免碎片化数据源。 |
| layer 太多 | layer 越多，样式计算和 draw 组织越复杂 | 合并相似 layer，用 expression 区分样式。 |
| GeoJSON 太大 | 主线程/worker 解析和更新成本高 | 改用 vector tiles，或拆分动态小 GeoJSON。 |
| 表达式复杂 | 每个 feature 都要计算样式表达式 | 简化 expression，预计算属性。 |
| 频繁 setData | source 反复更新，触发布局和上传 | 快速变化数据单独 source，或用 feature-state。 |

## 和 Cesium 命令层的类比

| Mapbox | Cesium | 含义 |
| --- | --- | --- |
| Style JSON | Scene + Primitive 配置 | 渲染意图和配置。 |
| Source | Tileset / Imagery / Terrain / DataSource | 数据来源。 |
| Layer | Appearance / Material / Primitive 类型 | 怎么画。 |
| Tile bucket | DrawCommand 前的数据组织 | 按瓦片和图层批量整理。 |
| WebGL draw | DrawCommand.execute | 底层 GPU 绘制。 |
