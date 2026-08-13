---
title: "Cesium 如何写自定义着色器：从 API 到 DrawCommand"
module: "Cesium"
source_html: "modules/cesium/custom-shader.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/cesium/custom-shader.html"
tags:
  - learn-pi
  - module/cesium
---

> Custom Shader

# Cesium 如何写自定义着色器：从 API 到 DrawCommand

在 Cesium 里写 shader，不能只用 Three.js/WebGL 的直觉去理解。Cesium 是地理三维引擎，它会把 Entity、Primitive、Model、3D Tiles、Globe、PostProcess 等对象分层调度。你写的 GLSL 代码通常不是直接变成一次 `gl.draw*`，而是先被 Cesium 拼进某种材质、Appearance、Model pipeline 或后处理阶段，最后进入 `DrawCommand` 或后处理命令，再由 Renderer 执行。

## 一、先分清：你到底想改哪一层

Cesium 支持多种“自定义着色器”入口，但它们不是互相替代关系。选择接口前先问：你想改单个模型/3D Tiles 的材质？改 Primitive 几何的外观？改整个屏幕最终效果？还是自己从底层产生命令？

| 目标 | 推荐接口 | 主要作用层 | 适合场景 | 难度 |
| --- | --- | --- | --- | --- |
| 改 glTF 模型或 3D Tiles 表面效果 | `CustomShader` | Model / Cesium3DTileset shader pipeline | 建筑泛光、按属性改颜色、模型顶点扰动、材质替换 | 中 |
| 改 Entity/Primitive 的材质 | `Material` + Fabric | Material / Appearance | 墙体流光、线材质、面材质、椭球/多边形材质 | 低到中 |
| 自定义 Primitive 的顶点/片元 shader | `Appearance` / `MaterialAppearance` / 自定义 Appearance | Primitive -> DrawCommand | 自定义几何、专用渲染效果、完全控制 attribute/varying | 中到高 |
| 改整个画面 | `PostProcessStage` | Framebuffer texture -> full-screen pass | 泛光、描边、夜视、色调、屏幕空间扫描线 | 中 |
| 完全控制 WebGL 命令 | 自定义 Primitive + `DrawCommand` | Renderer command layer | 研究 Cesium 内核、高性能特殊渲染 | 高 |

## 二、总调度图：shader 最后怎么变成命令

```text
业务代码写 shader / material
  -> Cesium 对象保存配置
  -> Scene.render() 每帧开始
  -> Primitive / Model / Tileset / PostProcessStage update
  -> 生成或更新 ShaderProgram / uniformMap / RenderState
  -> 填充 DrawCommand 或后处理命令
  -> commandList 分 pass、裁剪、排序
  -> Renderer 执行 command
  -> gl.useProgram + gl.bindBuffer + gl.uniform* + gl.draw*
```

关键点：你写的 shader 只是命令的一部分。最终的 `DrawCommand` 还必须包含顶点数据、uniform、渲染状态、pass、boundingVolume 等信息。Cesium 不会因为你写了 GLSL 就立刻画，它仍然要进入统一的 Scene 调度。

## 三、接口分类图表

| 接口 | 你写什么 | Cesium 帮你做什么 | 最后进入什么 |
| --- | --- | --- | --- |
| `CustomShader` | `vertexShaderText` / `fragmentShaderText` 片段、uniforms、varyings | 拼接 Model/3D Tiles 内部 shader，处理属性、材质、光照模式 | Model/Tile content 的 draw commands |
| `Material.fromType` / Fabric | Fabric JSON、`source` 片段、uniforms | 把材质片段组装进 Appearance 的片元 shader | Primitive 的 `DrawCommand.shaderProgram` |
| `MaterialAppearance` | material、vertexShaderSource、fragmentShaderSource、renderState | 生成完整 Appearance，声明 vertex format 和 shader 依赖 | Primitive.update 创建的 DrawCommand |
| `PostProcessStage` | 屏幕空间 fragment shader | 把 scene color/depth texture 作为输入，创建全屏 quad pass | 后处理阶段的 framebuffer 绘制命令 |
| 自定义 Primitive | `update(frameState)` 里自己创建 command | 只使用 Cesium Renderer 封装，很多事情要自己处理 | 你 push 到 `frameState.commandList` 的 DrawCommand |

## 四、方式 1：CustomShader，用在 Model 和 3D Tiles

`CustomShader` 是 Cesium 官方提供给 `Model` 和 `Cesium3DTileset` 的用户自定义 GLSL 入口。官方文档说明它是 user defined GLSL shader，用于 Model 和 Cesium3DTileset。它不是普通 Primitive 的材质系统，而是模型管线的一部分。

```text
const tileset = await Cesium.Cesium3DTileset.fromUrl(url);
tileset.customShader = new Cesium.CustomShader({
  mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
  lightingModel: Cesium.LightingModel.PBR,
  uniforms: {
    u_time: {
      type: Cesium.UniformType.FLOAT,
      value: 0.0
    },
    u_color: {
      type: Cesium.UniformType.VEC3,
      value: new Cesium.Cartesian3(0.2, 0.8, 1.0)
    }
  },
  fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
      float pulse = 0.5 + 0.5 * sin(u_time);
      material.diffuse = mix(material.diffuse, u_color, 0.35 * pulse);
      material.alpha = 1.0;
    }
  `
});
viewer.scene.primitives.add(tileset);

viewer.scene.preRender.addEventListener(function(scene, time) {
  tileset.customShader.setUniform("u_time", performance.now() * 0.001);
});
```

这段代码没有直接创建 `DrawCommand`。它只是告诉 tileset：生成模型 draw command 时，把这段 fragment 逻辑拼进模型 shader。实际调度大致是：

```text
Cesium3DTileset.update(frameState)
  -> 遍历可见 tile
  -> tile content / Model update
  -> Model pipeline 处理 customShader
  -> 组合 attribute、feature metadata、material、lighting
  -> 创建或复用 ShaderProgram
  -> 生成 DrawCommand
  -> frameState.commandList.push(command)
```

### CustomShader 的两种常见模式

| 模式 | 含义 | 适合场景 |
| --- | --- | --- |
| `MODIFY_MATERIAL` | 先运行原有材质，再让你的 shader 修改材质结果 | 给建筑加颜色、透明、扫描、根据属性调色 |
| `REPLACE_MATERIAL` | 不使用原材质，由你的 shader 生成材质 | 完全替换模型外观，例如纯程序材质 |

入门建议先用 `MODIFY_MATERIAL`。这样模型原有贴图、PBR、feature 信息仍然在，你只是叠加效果。`REPLACE_MATERIAL` 控制更强，但也更容易把原模型材质、光照、透明关系弄丢。

### CustomShader 最后变成什么

最终不是一个单独的“CustomShader 命令”，而是模型或 tile 对应的 `DrawCommand` 里的 `shaderProgram` 被 custom shader 影响。你可以把它理解成：

```text
DrawCommand {
  vertexArray: 模型 glTF 顶点 buffer,
  shaderProgram: Cesium 生成的模型 shader + 你的 custom shader 片段,
  uniformMap: 模型矩阵、相机、光照、u_time、u_color 等,
  renderState: 深度测试、混合、剔除,
  pass: opaque / translucent,
  boundingVolume: tile 或 model 的包围体
}
```

## 五、方式 2：Material / Fabric，用在 Entity 和 Primitive 材质

`Material` 是 Cesium 老牌材质系统。官方文档说明 Material 通过 diffuse、specular、normal、emission、alpha 等组成 surface appearance，并使用 Fabric JSON 描述，Cesium 会解析并组装成 GLSL。重点是：Fabric 的 `source` 通常是材质片段，不是完整 vertex/fragment shader。

```text
const flowingMaterial = new Cesium.Material({
  fabric: {
    type: "FlowLine",
    uniforms: {
      color: Cesium.Color.CYAN,
      speed: 1.0,
      time: 0.0
    },
    source: `
      czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        float t = fract(materialInput.st.s - time * speed);
        float stripe = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.2, 0.3, t));
        material.diffuse = color.rgb;
        material.alpha = stripe * color.a;
        return material;
      }
    `
  }
});
```

如果这个材质被挂到 `PolylineMaterialAppearance`、`MaterialAppearance` 或某些 Entity 材质属性上，最后会参与 Primitive 的 Appearance 生成。调度链路是：

```text
Entity.polyline.material / Primitive.appearance.material
  -> Material fabric parse
  -> Appearance 组装 shader source
  -> Primitive.update(frameState)
  -> create ShaderProgram
  -> create DrawCommand
  -> command.shaderProgram 包含材质片段
```

### Material / Fabric 适合什么

- 自定义线、面、墙、椭球、水面等材质效果。

- 写 `czm_getMaterial`，控制 diffuse、alpha、emission 等材质输出。

- 不需要完全控制顶点 shader，只想改表面颜色、透明、纹理和动画。

它不适合复杂模型 glTF 的 per-feature shader，也不适合全屏后处理。模型/3D Tiles 优先看 `CustomShader`，全屏效果优先看 `PostProcessStage`。

## 六、方式 3：Appearance，自定义 Primitive 的 shader

当你直接创建 `Primitive`，Cesium 需要一个 `Appearance` 来说明这批 geometry 如何渲染。`MaterialAppearance` 是常用的 Appearance，官方文档说明它用于 arbitrary geometry，并支持 materials。Appearance 可以提供 `vertexShaderSource`、`fragmentShaderSource`、`renderState` 等信息。

```text
const geometry = new Cesium.RectangleGeometry({
  rectangle: Cesium.Rectangle.fromDegrees(110, 30, 120, 40),
  vertexFormat: Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat
});

const primitive = new Cesium.Primitive({
  geometryInstances: new Cesium.GeometryInstance({ geometry }),
  appearance: new Cesium.MaterialAppearance({
    material: new Cesium.Material({
      fabric: {
        type: "Color",
        uniforms: {
          color: Cesium.Color.fromBytes(40, 180, 255, 160)
        }
      }
    }),
    translucent: true,
    closed: false
  })
});

viewer.scene.primitives.add(primitive);
```

如果要更进一步控制 shader，可以自定义 Appearance 对象，提供 `getVertexShaderSource()`、`getFragmentShaderSource()`、`renderState` 等。这个路线更接近 Cesium 内部开发，要求你理解 geometry 的 attribute、vertexFormat 和 shader 输入变量是否匹配。

### Appearance 到 DrawCommand 的路径

```text
new Primitive({ geometryInstances, appearance })
  -> Primitive.update(frameState)
  -> GeometryPipeline 创建顶点属性
  -> VertexArray.fromGeometry()
  -> appearance.getVertexShaderSource()
  -> appearance.getFragmentShaderSource()
  -> ShaderProgram.fromCache()
  -> RenderState.fromCache()
  -> new DrawCommand({
       vertexArray,
       shaderProgram,
       uniformMap,
       renderState,
       pass
     })
```

这条路径回答了“写的着色器最后变成什么命令”：它会变成 `DrawCommand.shaderProgram` 的源头，同时 uniform 会进入 `DrawCommand.uniformMap`，混合/深度测试会进入 `DrawCommand.renderState`。

## 七、方式 4：PostProcessStage，改整个屏幕

`PostProcessStage` 用于后处理。官方文档说明它运行在 scene 渲染出的 texture 或上一个 stage 的输出上。它不是给某个 Primitive 换材质，而是拿整张画面作为输入 texture，再画一个全屏 pass。

```text
const nightVision = new Cesium.PostProcessStage({
  name: "simple_green_tint",
  fragmentShader: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    void main() {
      vec4 color = texture(colorTexture, v_textureCoordinates);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      out_FragColor = vec4(0.1 * gray, 1.2 * gray, 0.2 * gray, color.a);
    }
  `
});
viewer.scene.postProcessStages.add(nightVision);
```

后处理链路大致是：

```text
Scene 先正常渲染到 framebuffer
  -> colorTexture / depthTexture
  -> PostProcessStageCollection.update()
  -> 为每个 stage 准备 framebuffer 和 shader
  -> full-screen quad DrawCommand
  -> fragment shader 读取 colorTexture/depthTexture
  -> 输出到下一个 framebuffer 或屏幕
```

所以后处理 shader 最后也会变成 draw command，但它的 vertex 数据通常只是全屏矩形，不是你的地球、模型或瓦片 geometry。

## 八、方式 5：自定义 Primitive + DrawCommand，最底层路线

如果你想完全控制命令，可以写一个有 `update(frameState)` 方法的对象，加入 `scene.primitives`。在 `update` 里创建 `VertexArray`、`ShaderProgram`、`RenderState`、`DrawCommand`，然后 push 到 `frameState.commandList`。这是最强也最危险的方式。

```text
function MyPrimitive() {
  this._command = undefined;
}

MyPrimitive.prototype.update = function(frameState) {
  if (!this._command) {
    const context = frameState.context;
    const shaderProgram = Cesium.ShaderProgram.fromCache({
      context,
      vertexShaderSource: "...",
      fragmentShaderSource: "...",
      attributeLocations: { position: 0 }
    });

    this._command = new Cesium.DrawCommand({
      shaderProgram,
      renderState: Cesium.RenderState.fromCache({
        depthTest: { enabled: true }
      }),
      pass: Cesium.Pass.OPAQUE,
      uniformMap: {
        u_color: function() {
          return Cesium.Color.RED;
        }
      }
      // 还需要 vertexArray、boundingVolume 等
    });
  }

  frameState.commandList.push(this._command);
};
```

这类代码通常不建议入门者直接使用，因为很多属性必须自己维护：资源生命周期、VAO、shader cache、context lost、boundingVolume、pick pass、translucent pass、renderState、uniform 变化等。更常见的工程路线是先用 `CustomShader`、`Material` 或 `PostProcessStage`。

## 九、完整例子：3D Tiles 建筑按高度渐变

假设你有一份 3D Tiles 建筑数据，想让建筑按模型空间高度出现蓝到黄的渐变。使用 `CustomShader` 的思路是：在 fragment shader 中读取模型位置或属性，计算颜色，再写回 `material.diffuse`。

```text
tileset.customShader = new Cesium.CustomShader({
  mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
  uniforms: {
    u_minHeight: {
      type: Cesium.UniformType.FLOAT,
      value: 0.0
    },
    u_maxHeight: {
      type: Cesium.UniformType.FLOAT,
      value: 200.0
    }
  },
  fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
      float h = fsInput.attributes.positionMC.z;
      float t = clamp((h - u_minHeight) / (u_maxHeight - u_minHeight), 0.0, 1.0);
      vec3 lowColor = vec3(0.05, 0.25, 0.9);
      vec3 highColor = vec3(1.0, 0.85, 0.15);
      material.diffuse = mix(lowColor, highColor, t);
    }
  `
});
```

这段代码最后的调度逻辑是：

```text
你的 fragmentMain
  -> 进入 CustomShader 对象
  -> tileset visible tile 进入 Model pipeline
  -> Cesium 生成完整 fragment shader
  -> ShaderProgram.fromCache 编译/复用 program
  -> 每个 tile content 产生 DrawCommand
  -> DrawCommand.shaderProgram 包含高度渐变逻辑
  -> Renderer 执行 gl.drawElements
  -> 每个片元根据 positionMC.z 混色
```

## 十、完整例子：Primitive 面材质流动线

如果你画的是一个 Primitive 面、墙、线，而不是 glTF/3D Tiles，通常用 Material/Fabric 更自然。你写 `czm_getMaterial`，Cesium 把它插入 Appearance 的 fragment shader。

```text
const material = new Cesium.Material({
  fabric: {
    type: "MovingStripe",
    uniforms: {
      color: Cesium.Color.ORANGE,
      time: 0.0
    },
    source: `
      czm_material czm_getMaterial(czm_materialInput input) {
        czm_material m = czm_getDefaultMaterial(input);
        float x = fract(input.st.s * 8.0 - time);
        float line = smoothstep(0.0, 0.05, x) * (1.0 - smoothstep(0.12, 0.18, x));
        m.diffuse = color.rgb;
        m.alpha = line;
        return m;
      }
    `
  }
});
```

最后变成的命令可以理解为：

```text
Primitive DrawCommand {
  vertexArray: Rectangle/Polygon/Polyline geometry 生成的顶点数据,
  shaderProgram: Appearance 默认 shader + MovingStripe 材质片段,
  uniformMap: color、time、czm_frameNumber、相机矩阵等,
  renderState: translucent true 对应的 blending/depth 设置,
  pass: translucent
}
```

## 十一、调试时沿这张表查

| 现象 | 可能原因 | 检查点 |
| --- | --- | --- |
| shader 没效果 | 接口用错，材质没有挂到实际渲染对象 | 确认是 Model/3D Tiles 用 CustomShader，Primitive 用 Material/Appearance，屏幕效果用 PostProcessStage。 |
| 编译报错 | GLSL 版本、变量名、入口函数不符合 Cesium pipeline | CustomShader 用 `fragmentMain`；Fabric 用 `czm_getMaterial`；PostProcessStage 读取 `colorTexture`。 |
| 模型消失 | alpha、discard、深度、剔除、pass 设置错误 | 检查 material.alpha、translucent、RenderState、backFaceCulling。 |
| uniform 不更新 | 只改 JS 变量，没有更新 Cesium uniform | CustomShader 用 `setUniform`；Material uniforms 需要改变实际 uniform 值；PostProcessStage uniforms 可用函数。 |
| 透明排序不对 | 半透明对象需要特殊 pass 和排序 | 检查 translucent、depthMask、blend、primitive order。 |
| 性能很差 | shader 分支多、纹理采样多、后处理全屏多 pass | 减少 texture sample，降低后处理 pass，避免每帧重建 shader。 |

## 十二、选择接口的口诀

- 模型/3D Tiles： 优先 `CustomShader`。

- 普通几何表面： 优先 `Material` / Fabric。

- 自定义 Geometry + 完整外观： 用 `Appearance` / `MaterialAppearance`。

- 整屏效果： 用 `PostProcessStage`。

- 研究内核或特殊高性能渲染： 自定义 Primitive，自己 push `DrawCommand`。

## 官方参考

- [Cesium CustomShader API](https://cesium.com/learn/ion-sdk/ref-doc/CustomShader.html)

- [Cesium Custom Shader Guide](https://github.com/CesiumGS/cesium/blob/main/Documentation/CustomShaderGuide/README.md)

- [Cesium Material API](https://cesium.com/learn/ion-sdk/ref-doc/Material.html)

- [Cesium Fabric Wiki](https://github.com/CesiumGS/cesium/wiki/Fabric)

- [Cesium MaterialAppearance API](https://cesium.com/learn/cesiumjs/ref-doc/MaterialAppearance.html)

- [Cesium PostProcessStage API](https://cesium.com/learn/ion-sdk/ref-doc/PostProcessStage.html)

下一步
[[12 - Cesium/03 - Cesium 没渲染出来时怎么查|把 shader 问题放进渲染调试链路]]
