# Source Learning Lab

这是一个源码学习网站，用来系统学习复杂工程项目的架构、运行链路、关键源码和设计取舍。

当前模块：

- `modules/pi-agent/`：学习 Pi Agent 源码如何处理提示词、调用模型、执行工具、保存会话和事件。
- `modules/mini-agent/`：从零实现最小 Agent，包含 Node MVP、模型接口兼容和产品化路线。
- `modules/cesium/`：学习三维渲染如何从 Viewer、Scene、Primitive、DrawCommand 走到 WebGL/GPU。
- `modules/openlayers/`：学习二维地图如何从 Map、View、Layer、Source 走到 Canvas/WebGL。
- `modules/mapbox/`：学习 Mapbox GL JS 的 source、layer、style、vector tiles、WebGL 渲染，以及与 Cesium 的性能和场景边界对比。
- `modules/gaussian-splatting/`：学习 3D Gaussian Splatting 如何从照片、相机位姿、稀疏点云走到可微渲染和实时 viewer。
- `modules/stock-kline/`：学习股票 K 线、技术指标、量价关系、买卖信号、长短线分类、现实解释和风控复盘。
- `modules/quant-trading/`：学习量化交易如何从策略假设、数据、回测、实盘执行走到服务器资源和风控监控。
- `modules/nuclear-battery/`：学习 RTG、放射性同位素电源、贝塔伏特电池，以及卫星原子钟和电源系统的区别。

## Directory Rules

- `index.html`：全站首页。
- `pages/`：只放全站级页面，例如仪表盘、总宪章、全站检索、测验，以及旧 URL 的兼容跳转页。
- `modules/{module}/`：放某个专题的学习内容，每个模块至少有 `index.html` 和 `charter.html`。
- `examples/{module}/`：放可运行示例代码。
- `content-manifest.json`：机器可读的模块清单。
- `search-index.json`：前端检索索引，由静态页面直接读取。
- `vendor/lunr.min.js`：开源前端检索库 Lunr.js，本地 vendored，避免运行时依赖 CDN。

旧的 `pages/*.html` 专题链接会继续保留为跳转页，避免历史链接失效；新增内容优先放进对应的 `modules/` 目录。

## Local Preview

可以直接打开 `index.html`，也可以启动静态服务：

```bash
python -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/`。

## Search Index

新增或移动页面后，重新生成检索索引：

```bash
node scripts/build-search-index.mjs
```

## Deployment

仓库通过 GitHub Pages 部署。推送到 `main` 后，GitHub Actions 会发布静态站点。
