# Source Learning Lab

这是一个源码学习网站，用来系统学习复杂工程项目的架构、运行链路、关键源码和设计取舍。

当前模块：

- `modules/pi-agent/`：学习 Agent 如何处理提示词、调用模型、执行工具、保存会话、接入自研模型。
- `modules/cesium/`：学习三维渲染如何从 Viewer、Scene、Primitive、DrawCommand 走到 WebGL/GPU。
- `modules/openlayers/`：学习二维地图如何从 Map、View、Layer、Source 走到 Canvas/WebGL。

## Directory Rules

- `index.html`：全站首页。
- `pages/`：只放全站级页面，例如仪表盘、总宪章、测验，以及旧 URL 的兼容跳转页。
- `modules/{module}/`：放某个专题的学习内容，每个模块至少有 `index.html` 和 `charter.html`。
- `examples/{module}/`：放可运行示例代码。
- `content-manifest.json`：机器可读的模块清单。

旧的 `pages/*.html` 专题链接会继续保留为跳转页，避免历史链接失效；新增内容优先放进对应的 `modules/` 目录。

## Local Preview

可以直接打开 `index.html`，也可以启动静态服务：

```bash
python -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/`。

## Deployment

仓库通过 GitHub Pages 部署。推送到 `main` 后，GitHub Actions 会发布静态站点。
