---
title: "Mapbox 常用接口和调试路径"
module: "Mapbox"
source_html: "modules/mapbox/api-debugging.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mapbox/api-debugging.html"
tags:
  - learn-pi
  - module/mapbox
---

> API

# Mapbox 常用接口和调试路径

Mapbox 开发大多数问题都可以沿着 `Map -> Style -> Source -> Layer -> Expression -> Event` 查。先确认 style 是否加载，再确认 source 是否存在，最后确认 layer 的 filter、paint、layout 是否符合预期。

## 常用接口分类

| 类别 | 接口 | 作用 |
| --- | --- | --- |
| 地图生命周期 | `new Map`、`map.on("load")`、`map.remove()` | 创建、等待样式加载、销毁地图。 |
| 数据源 | `addSource`、`getSource`、`removeSource`、`setData` | 添加和更新 GeoJSON/vector/raster 数据。 |
| 图层 | `addLayer`、`removeLayer`、`setPaintProperty`、`setLayoutProperty` | 控制绘制规则和样式。 |
| 相机 | `flyTo`、`easeTo`、`jumpTo`、`fitBounds` | 控制中心点、zoom、bearing、pitch。 |
| 查询 | `queryRenderedFeatures`、`querySourceFeatures` | 查询屏幕上或 source 中的要素。 |
| 交互 | `click`、`mousemove`、`mouseenter`、`mouseleave` | 绑定地图和图层事件。 |
| 状态 | `setFeatureState`、`getFeatureState` | 高效更新要素 hover/selected 状态。 |

## 表达式 expression

Expression 是 Mapbox 样式系统的灵魂。它让样式可以根据 zoom、feature 属性、feature-state 动态变化。例如按人口给圆点半径分级：

```text
map.addLayer({
  id: "city-circle",
  type: "circle",
  source: "cities",
  paint: {
    "circle-radius": [
      "interpolate", ["linear"], ["get", "population"],
      100000, 4,
      1000000, 12,
      10000000, 28
    ],
    "circle-color": [
      "case",
      [">", ["get", "population"], 10000000],
      "#d64f45",
      "#277da1"
    ]
  }
});
```

## 调试 checklist

- 地图空白： 检查 token、style URL、容器高度、网络请求、控制台错误。

- source 不显示： 确认 `map.on("load")` 后添加，source id 写对，GeoJSON 坐标是 `[lng, lat]`。

- layer 不显示： 检查 source-layer、filter、minzoom/maxzoom、paint 透明度、layer 顺序。

- 点击查不到要素： 确认 layer 可渲染，使用 `queryRenderedFeatures(point, { layers: [...] })`。

- 频繁更新卡顿： 不要频繁更新大 GeoJSON；把动态数据拆成小 source，或用 `feature-state`。

- 文字不显示： 检查 glyphs、字体、symbol placement、碰撞避让。

## 性能优化清单

- 使用 vector tileset，不要把超大 GeoJSON 直接塞进浏览器。

- 合并相似 layers，用表达式区分颜色、宽度、半径。

- 合并 vector tile sources，减少 source 调度成本。

- 删除不会显示的属性和要素，减小 tile 体积。

- 快速变化的数据单独放 source，避免每次更新整张地图的数据。

- hover/selected 状态优先用 `feature-state`，不要反复 `setData`。
