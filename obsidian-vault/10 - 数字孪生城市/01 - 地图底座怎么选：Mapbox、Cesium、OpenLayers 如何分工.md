---
title: "地图底座怎么选：Mapbox、Cesium、OpenLayers 如何分工"
module: "Digital Twin City"
source_html: "modules/digital-twin-city/map-stack.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/digital-twin-city/map-stack.html"
tags:
  - learn-pi
  - module/digital-twin-city
---

> Map Stack

# 地图底座怎么选：Mapbox、Cesium、OpenLayers 如何分工

数字孪生城市常常不是一个地图引擎打天下。二维运营看板、传统 GIS 管理、三维城市漫游、倾斜摄影和 3D Tiles 的目标不同，底层引擎也应该分工。

## 选择表

| 场景 | 推荐底座 | 原因 |
| --- | --- | --- |
| 道路、POI、车辆、网格、热力 | Mapbox | 矢量瓦片和样式系统强，二维交互性能好。 |
| 测绘、WMS/WFS、投影转换、传统 GIS 管理 | OpenLayers | GIS 协议和投影体系成熟，适合管理型应用。 |
| 三维城市、地形、倾斜摄影、3D Tiles | Cesium | 三维地球、3D Tiles、地形和大范围空间坐标能力强。 |
| 街区级真实重建展示 | Cesium / Three.js + Gaussian Splatting | 高斯泼溅适合局部真实感，Cesium 适合放入地理坐标框架。 |

## 常见架构：二维 + 三维双视图

```text
左侧/主视图：Mapbox 二维运营地图
  -> 快速看车辆、告警、道路、网格、热力

右侧/详情视图：Cesium 三维场景
  -> 查看建筑、地形、倾斜摄影、3D Tiles、飞行路线

统一状态：
  -> camera center / selected object / time range / layer visibility
```

这样做的好处是：日常操作用轻量二维地图，进入复杂空间理解时再切三维。不要所有页面都强行用三维地球，否则前端性能、交互复杂度和用户认知成本都会上升。

## 统一坐标和对象 ID

多地图底座最容易出问题的是坐标和对象身份。必须建立统一对象 ID，例如建筑 `building_id`、路段 `road_id`、摄像头 `camera_id`、传感器 `sensor_id`。二维图层、三维模型、属性数据库、告警事件都引用同一个 ID。

```text
building_id = BLDG_001
  -> Mapbox fill layer feature
  -> Cesium 3D Tiles feature metadata
  -> PostGIS building table
  -> Alarm event building_id
  -> Agent tool query parameter
```

## 图层体系

- 基础图层： 行政区、道路、水系、建筑轮廓、影像。

- 业务图层： 车辆、摄像头、传感器、管网、网格员、工单。

- 三维图层： 白模、精模、倾斜摄影、BIM、点云、地形。

- 分析图层： 热力、缓冲区、等值面、风险区、拥堵指数。

- 交互图层： 选中高亮、搜索结果、路径规划、告警闪烁。
