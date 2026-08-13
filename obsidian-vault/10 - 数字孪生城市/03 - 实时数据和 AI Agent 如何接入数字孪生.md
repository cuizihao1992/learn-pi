---
title: "实时数据和 AI Agent 如何接入数字孪生"
module: "Digital Twin City"
source_html: "modules/digital-twin-city/realtime-agent.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/digital-twin-city/realtime-agent.html"
tags:
  - learn-pi
  - module/digital-twin-city
---

> Realtime and Agent

# 实时数据和 AI Agent 如何接入数字孪生

数字孪生城市的“实时”不只是地图上点在动。它要求设备数据能进入系统、被清洗、被存储、被推送、被分析，并能在告警发生时让 Agent 调用工具解释原因、关联周边对象、生成处置建议。

## 实时数据链路

```text
设备 / 业务系统
  -> MQTT / HTTP / Kafka
  -> 接入网关
  -> 数据校验、去重、补全
  -> 实时流处理
  -> 时序数据库 / 空间数据库 / 事件库
  -> WebSocket 推送前端
  -> 地图图层和告警面板更新
```

## 实时数据类型

| 数据 | 频率 | 存储 | 前端表现 |
| --- | --- | --- | --- |
| 车辆 GPS | 秒级 | 轨迹库 / 时序库 | 移动点、轨迹回放、路线偏离。 |
| 环境传感器 | 秒级到分钟级 | 时序数据库 | 数值标签、热力、阈值告警。 |
| 摄像头状态 | 事件驱动 | 设备库 + 事件库 | 图标状态、视频弹窗、离线告警。 |
| 工单/告警 | 事件驱动 | 事件库 / 业务库 | 告警列表、空间定位、状态流转。 |
| 人流/车流统计 | 分钟级 | 时序库 / OLAP | 热力图、趋势图、拥堵指数。 |

## Agent 应该能做什么

Agent 的价值不是替代指挥员，而是把跨系统查询和初步分析变快。它应该通过工具调用获取事实，而不是凭空编答案。

- 空间查询： “查这个告警点 500 米内的学校、医院、摄像头”。

- 时序分析： “过去 6 小时这个水压传感器是否异常”。

- 关联分析： “这次拥堵是否和附近施工、事故、天气有关”。

- 图层操作： “打开积水点、泵站、排水管网图层”。

- 报告生成： “生成本次告警处置摘要和后续建议”。

## Agent 工具设计

```text
tools = [
  querySpatialObjects(radius, center, types),
  queryTimeSeries(sensorId, start, end),
  queryEvents(areaId, eventType, start, end),
  setLayerVisibility(layerId, visible),
  flyToObject(objectId),
  generateIncidentReport(eventId)
]
```

高风险动作要让人确认，例如派单、广播、控制设备、关闭道路、调度人员。Agent 可以建议，但不能默认直接执行。

## 一次完整对话例子

```text
用户：为什么 A 区突然出现拥堵？
Agent：
  1. 调 queryEvents(A区, 交通事故, 最近1小时)
  2. 调 queryRoadSpeed(A区, 最近2小时)
  3. 调 queryWeather(A区, 最近2小时)
  4. 调 setLayerVisibility("traffic-incidents", true)
  5. 调 flyToObject("事故点")
回答：
  A 区拥堵从 08:42 开始扩大，和 08:39 的追尾事故位置高度重合。
  附近两条支路速度下降 60%，天气无明显异常。
  建议优先查看事故点北侧摄像头，并临时引导车辆绕行 B 路。
```
