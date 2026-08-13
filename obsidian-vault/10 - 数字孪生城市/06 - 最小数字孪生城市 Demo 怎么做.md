---
title: "最小数字孪生城市 Demo 怎么做"
module: "Digital Twin City"
source_html: "modules/digital-twin-city/mvp.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/digital-twin-city/mvp.html"
tags:
  - learn-pi
  - module/digital-twin-city
---

> MVP

# 最小数字孪生城市 Demo 怎么做

MVP 不应该一开始就追求全城三维大屏。最小可用版本要能展示一块区域、几个业务图层、一类实时数据、一次对象查询和一次 Agent 分析闭环。

## 第一版目标

```text
区域：一个园区或一个街区
底图：Mapbox 二维地图 + Cesium 三维视图
资产：建筑白模或简单 3D Tiles
实时：模拟传感器 / 车辆 / 告警
交互：点击对象看属性，时间轴回放
Agent：问“这里发生了什么”，调用工具查对象和时序数据
```

## 阶段计划

| 阶段 | 交付物 | 完成标准 |
| --- | --- | --- |
| 1. 地图底座 | Mapbox 地图 + Cesium 场景 | 能切换二维/三维，定位到同一区域。 |
| 2. 静态资产 | 建筑、道路、摄像头、传感器点位 | 点击对象能打开属性面板。 |
| 3. 实时模拟 | WebSocket 推送车辆和告警 | 地图对象随时间变化，告警列表同步更新。 |
| 4. 历史回放 | 时间轴和轨迹查询 | 选择时间范围能回放车辆或传感器曲线。 |
| 5. Agent 工具 | 空间查询、时序查询、报告生成 | Agent 回答必须引用工具结果。 |
| 6. 权限审计 | 用户角色、工具调用日志 | 高风险操作需要确认并留痕。 |

## 推荐技术栈

- 前端： React/Vue + Mapbox GL JS + CesiumJS + ECharts。

- 后端： Node.js 或 Python FastAPI。

- 空间库： PostgreSQL + PostGIS。

- 实时： WebSocket，后续可接 MQTT/Kafka。

- 时序： TimescaleDB 或简化版 PostgreSQL 表。

- 三维资产： 先用简单 glTF/3D Tiles，不急着接全量倾斜摄影。

- Agent： 先做工具调用，不做自动控制。

## 最小数据表

```text
assets(id, type, name, geom, properties)
sensors(id, asset_id, type, unit, status)
sensor_readings(sensor_id, time, value)
vehicles(id, name, status, last_geom)
vehicle_positions(vehicle_id, time, geom, speed)
events(id, type, level, geom, status, started_at, ended_at)
agent_tool_logs(id, user_id, tool_name, args, result, created_at)
```

## 判断 MVP 成功的标准

- 用户能在地图上快速定位对象。

- 实时状态和历史状态能互相切换。

- 告警能关联空间对象和时序曲线。

- Agent 能调用工具回答问题，而不是空泛聊天。

- 系统在普通笔记本和手机上能基本查看，不依赖高端机器。
