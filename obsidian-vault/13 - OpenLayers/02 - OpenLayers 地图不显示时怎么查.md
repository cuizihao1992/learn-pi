---
title: "OpenLayers 地图不显示时怎么查"
module: "OpenLayers"
source_html: "modules/openlayers/debugging.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/openlayers/debugging.html"
tags:
  - learn-pi
  - module/openlayers
---

> Debugging

# OpenLayers 地图不显示时怎么查

二维地图问题通常发生在 target、View、Layer、Source、网络、投影、样式或 renderer。按链路查，不要只看最后的 canvas。

## 常见问题定位表

| 现象 | 可能原因 | 检查点 |
| --- | --- | --- |
| 地图空白 | target DOM 没尺寸；View 未设置；Layer 没加；瓦片请求失败 | 容器 CSS、Map options、Network 面板 |
| 瓦片加载 404 | URL 模板、token、跨域、投影或 tile grid 错 | Source URL、z/x/y、CORS |
| 矢量要素不显示 | 坐标投影错、style 返回空、extent 不在视图内 | Feature 坐标、View projection、styleFunction |
| 点击选不中 | hitTolerance 太小、layer filter、feature 不可见 | forEachFeatureAtPixel、layerFilter |
| 性能卡顿 | Feature 太多、样式函数太重、频繁 setState | 聚合、VectorTile、WebGL layer |

## 调试顺序

```text
1. target 容器是否有宽高
2. new Map 是否成功创建
3. View center/zoom/projection 是否合理
4. layers 数组是否有图层
5. layer.getSource() 是否存在
6. Source state 是否 ready
7. Network 是否加载瓦片/数据
8. 坐标是否需要 fromLonLat
9. styleFunction 是否返回可见样式
10. renderer 是否报错
```

## 最容易犯的错：经纬度和投影

OpenLayers 默认 View 常用 EPSG:3857，业务经纬度通常是 EPSG:4326。如果你直接把 `[116.39, 39.9]` 当成 Web Mercator 坐标，点会跑错位置。常见写法是用 `fromLonLat()` 转换。

```text
import {fromLonLat} from "ol/proj.js";

const coordinate = fromLonLat([116.39, 39.9]);
```
