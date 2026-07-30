整理好了。下面这份可以直接作为你项目里的一个新文档，例如：

`首页实现方案-三背景状态交互.md`

---

# 首页实现方案：三背景状态切换 + 热区交互

## 背景

当前项目已经完成核心数据流验证，下一阶段重点是完成 UI 视觉和交互实现。

之前尝试按照 Figma 组件化思路拆分首页元素，例如：

- 拱门组件
- 信件组件
- 墙面文字组件
- Hover Variant
- Selected Variant

但是经过实际分析，发现首页的交互状态非常有限，并不需要复杂组件状态管理。

首页本质上是一个**场景驱动的交互页面**，而不是大量独立组件组合页面。

因此采用：

> **三张完整背景图代表三种首页状态，在背景图之上叠加交互热区（Hot Area），通过状态切换完成交互。**

---

# 一、首页核心状态设计

首页只保留三个主要状态：

## State 0：默认状态（Idle）

### 目的

用户首次进入产品时看到完整的私人信件博物馆空间。

### 内容

展示完整场景：

- 房间环境
- 墙面文字
- 阳光效果
- 拱形入口
- 书桌区域
- 信件展示氛围

用户可以选择两个主要方向：

1. 进入记录空间
2. 进入回味展厅空间

---

## State 1：聚焦记录空间（Focus Record）

### 触发

用户点击书桌 / 托盘 / 信件区域。

### 视觉变化

切换到第二张背景图：

- 镜头靠近书桌区域
- 金属托盘成为视觉中心
- 信件更加突出
- 背景弱化

### 对应功能

进入：

`RecordEntryPage`

用户开始书写自己的积极记忆。

---

## State 2：聚焦展厅空间（Focus Archive）

### 触发

用户点击拱门 / 展厅入口区域。

### 视觉变化

切换到第三张背景图：

- 镜头靠近拱门
- 展厅内部更加明显
- 墙面文字或者导览信息出现
- 营造进入私人记忆博物馆的感觉

### 对应功能

进入回味合集入口：

包含：

- 时间线陈列
- 精选回味
- 随机品味

---

# 二、实现方式调整

## 不采用复杂组件 Variant 方案

原因：

首页不是多个独立组件之间产生大量状态组合。

实际状态数量：

```
背景状态：
3个

交互热点：
2~3个

动画：
少量切换动画
```

因此没有必要提前拆：

- Letter Component
- Arch Component
- Wall Text Component

并为每个组件建立大量 Variant。

---

# 三、推荐实现结构

## 页面结构

```
HomePage

 ├── BackgroundLayer
 │
 │    ├── State0 Background Image
 │    ├── State1 Background Image
 │    └── State2 Background Image
 │
 ├── Hotspot Layer
 │
 │    ├── Record Hotspot
 │    └── Archive Hotspot
 │
 └── Transition Animation
```

---

# 四、交互热区设计

## Hotspot 1：书桌 / 信件区域

范围：

覆盖：

- 金属托盘
- 信件
- 书桌区域

行为：

点击：

```
State0
 ↓
State1
 ↓
进入 RecordEntryPage
```

---

## Hotspot 2：拱门区域

范围：

覆盖：

- 拱门
- 展厅入口

行为：

点击：

```
State0
 ↓
State2
 ↓
进入 Archive Menu
```

## 初始页与热点区前端标注

> 用途：交给 Codex 或前端开发人员，实现初始页背景及两个透明点击热点。  
> 数据来源：3 张 Figma 截图中的画板尺寸、Position 与 Dimensions 属性。

## 1. 页面基准

- Figma 画板：`Desktop - Primary`
- 基准尺寸：`1440 × 810 px`
- 宽高比：`16:9`
- 坐标原点：画板左上角
- 坐标含义：
  - `left / x`：从画板左边缘向右
  - `top / y`：从画板上边缘向下
  - `width / height`：热点矩形的宽和高

百分比换算公式：

```text
left%   = x / 1440 × 100
top%    = y / 810 × 100
width%  = width / 1440 × 100
height% = height / 810 × 100
```

## 2. 页面资源与交互状态

建议将三个页面图片资源命名为：

```text
initial-background.webp   初始页原始背景图
letter-clicked.webp       点击托盘信件后显示的图片 1
arch-clicked.webp         点击拱门后显示的图片 2
```

交互关系：

```text
初始状态
├─ 点击「托盘信件热点」→ 显示 letter-clicked.webp
└─ 点击「拱门热点」    → 显示 arch-clicked.webp
```

本文按“点击后将主画面切换为对应整张状态图”理解。若图片 1、图片 2 实际是弹窗或局部叠加素材，热点坐标不变，只需调整点击处理逻辑。

## 3. 热点标注

### 3.1 拱门热点

Figma 图层名：`拱门展示热点区`

| 属性 | 像素值 | 百分比值 |
|---|---:|---:|
| left | 59 px | 4.0972% |
| top | 18 px | 2.2222% |
| width | 362 px | 25.1389% |
| height | 695 px | 85.8025% |

覆盖范围：

```text
x: 59 → 421 px
y: 18 → 713 px
```

### 3.2 托盘信件热点

Figma 图层名：`托盘信件热点区`

| 属性 | 像素值 | 百分比值 |
|---|---:|---:|
| left | 899 px | 62.4306% |
| top | 554 px | 68.3951% |
| width | 216 px | 15.0000% |
| height | 72 px | 8.8889% |

覆盖范围：

```text
x: 899 → 1115 px
y: 554 → 626 px
```

## 4. Codex 可直接读取的数据

```json
{
  "coordinateSystem": {
    "origin": "top-left",
    "baseWidth": 1440,
    "baseHeight": 810,
    "aspectRatio": "16/9"
  },
  "assets": {
    "initial": "initial-background.webp",
    "letterClicked": "letter-clicked.webp",
    "archClicked": "arch-clicked.webp"
  },
  "hotspots": [
    {
      "id": "arch",
      "label": "拱门",
      "action": "show-arch-clicked",
      "pixel": {
        "left": 59,
        "top": 18,
        "width": 362,
        "height": 695
      },
      "percent": {
        "left": 4.0972,
        "top": 2.2222,
        "width": 25.1389,
        "height": 85.8025
      }
    },
    {
      "id": "tray-letter",
      "label": "托盘上的信件",
      "action": "show-letter-clicked",
      "pixel": {
        "left": 899,
        "top": 554,
        "width": 216,
        "height": 72
      },
      "percent": {
        "left": 62.4306,
        "top": 68.3951,
        "width": 15,
        "height": 8.8889
      }
    }
  ]
}
```

## 5. 推荐的前端结构

```html
<main class="scene" data-state="initial">
  <img
    class="scene__image"
    src="/images/initial-background.webp"
    alt="写信场景"
  />

  <button
    class="hotspot hotspot--arch"
    type="button"
    aria-label="查看拱门区域"
    data-target-state="arch"
  ></button>

  <button
    class="hotspot hotspot--letter"
    type="button"
    aria-label="打开托盘上的信件"
    data-target-state="letter"
  ></button>
</main>
```

```css
.scene {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.scene__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.hotspot {
  position: absolute;
  z-index: 2;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.hotspot--arch {
  left: 4.0972%;
  top: 2.2222%;
  width: 25.1389%;
  height: 85.8025%;
}

.hotspot--letter {
  left: 62.4306%;
  top: 68.3951%;
  width: 15%;
  height: 8.8889%;
}
```

简单状态切换示例：

```js
const scene = document.querySelector(".scene");
const image = scene.querySelector(".scene__image");

const stateImages = {
  initial: "/images/initial-background.webp",
  letter: "/images/letter-clicked.webp",
  arch: "/images/arch-clicked.webp"
};

scene.addEventListener("click", (event) => {
  const hotspot = event.target.closest("[data-target-state]");
  if (!hotspot) return;

  const nextState = hotspot.dataset.targetState;
  scene.dataset.state = nextState;
  image.src = stateImages[nextState];
});
```

## 6. 响应式实现约束

1. 背景图与热点必须放在同一个 `position: relative` 的容器中。
2. 热点必须以该容器为百分比定位基准，不能直接以浏览器窗口为基准。
3. 三张状态图应使用相同的画布尺寸和裁切方式，推荐全部导出为 `1440 × 810`。
4. 推荐保持完整 `16:9` 画面。若使用 `object-fit: cover` 填满任意比例屏幕，画面会被裁切，以上百分比不能直接套用，必须同步计算裁切偏移。
5. 正式环境中热点保持透明；调试时可临时加半透明颜色和描边检查位置。

调试样式：

```css
.debug .hotspot--arch {
  background: rgb(206 21 21 / 18%);
  outline: 1px solid #ce1515;
}

.debug .hotspot--letter {
  background: rgb(230 36 36 / 18%);
  outline: 1px solid #e62424;
}
```

## 7. 给 Codex 的实施指令

```text
请按照本标注文档实现一个 16:9 的响应式交互场景：

1. 初始显示 initial-background.webp。
2. 在同一个场景容器内创建两个透明 button 热点。
3. 拱门热点：left 4.0972%，top 2.2222%，width 25.1389%，height 85.8025%。
4. 托盘信件热点：left 62.4306%，top 68.3951%，width 15%，height 8.8889%。
5. 点击托盘信件后显示 letter-clicked.webp。
6. 点击拱门后显示 arch-clicked.webp。
7. 三张图片与热点共用同一坐标空间；缩放时热点必须随图片等比例移动和缩放。
8. 使用语义化 button，并提供 aria-label、键盘焦点状态和手型光标。
9. 不要把 Figma 中用于标示热点的红色描边做进正式页面。
```

## 8. 验收基准

在 `1440 × 810` 下检查：

- 拱门热点左上角为 `(59, 18)`，尺寸为 `362 × 695`。
- 托盘信件热点左上角为 `(899, 554)`，尺寸为 `216 × 72`。
- 将页面等比缩放到任意 `16:9` 尺寸时，热点与图中目标区域保持重合。
- Tab 键可以依次聚焦两个热点，Enter/Space 可以触发对应状态。
- 正式页面不显示热点的调试底色和红色描边。


---
# 四、墙上文字的方案
背景文字层前端标注

## 1. 坐标基准

- Figma 画板：`Desktop - Primary`
- 基准尺寸：`1440 × 810 px`
- 宽高比：`16:9`
- 坐标原点：画板左上角
- 文字定位基准：与背景图片相同的场景容器

百分比换算公式：

```text
left%   = x / 1440 × 100
top%    = y / 810 × 100
width%  = width / 1440 × 100
height% = height / 810 × 100
```

## 2. 文字内容

当前示例文案：

```text
写下今天感觉最好的瞬间
```

文案后期可能频繁修改，必须作为独立的真实文本渲染，不能合并或烘焙进背景图片。

## 3. 位置与当前尺寸

| 属性 | 像素值 | 百分比值 |
|---|---:|---:|
| left | 720 px | 50.0000% |
| top | 114 px | 14.0741% |
| width | 440 px | 30.5556% |
| height | 47 px | 5.8025% |

当前覆盖范围：

```text
x: 720 → 1160 px
y: 114 → 161 px
```

定位要求：

- 左上定位锚点固定为 `left: 50%`、`top: 14.0741%`。
- `440 × 47 px` 是当前示例文案在临时字体下的参考尺寸。
- 文案或字体变化后，实际文字宽度可以变化，不要将所有文案强制压缩进 `440 px`。
- 默认保持单行；若后期需要长文案，可设置最大宽度并允许换行。

## 4. 截图中的临时文字样式

| 属性 | Figma 截图值 | 前端要求 |
|---|---|---|
| 字体 | Karla | 仅为示意，最终字体未确定 |
| 字重/样式 | ExtraBold Italic | 仅为示意 |
| 字号 | 40 px | 1440 px 基准宽度下的参考值 |
| 行高 | Auto，当前高度 47 px | 可暂用 `1.175` |
| 字间距 | 0% | `letter-spacing: 0` |
| 水平对齐 | 左对齐 | `text-align: left` |
| 垂直对齐 | 顶部 | 顶部对齐 |
| 颜色 | `#FFFFFF`，100% | 白色 |
| 旋转 | 0° | 不旋转 |

字体、字重和斜体效果都不是最终设计要求。实现时应通过 CSS 变量或设计令牌集中管理，以便之后替换。

## 5. Codex 可直接读取的数据

```json
{
  "coordinateSystem": {
    "origin": "top-left",
    "baseWidth": 1440,
    "baseHeight": 810,
    "aspectRatio": "16/9"
  },
  "textLayer": {
    "id": "scene-heading",
    "tag": "h1",
    "content": "写下今天感觉最好的瞬间",
    "contentIsEditable": true,
    "fontIsFinal": false,
    "pixel": {
      "left": 720,
      "top": 114,
      "width": 440,
      "height": 47
    },
    "percent": {
      "left": 50,
      "top": 14.0741,
      "width": 30.5556,
      "height": 5.8025
    },
    "referenceTypography": {
      "fontFamily": "Karla",
      "fontStyle": "ExtraBold Italic",
      "fontSizeAtBaseWidth": 40,
      "lineHeight": "auto",
      "letterSpacing": "0%",
      "textAlign": "left",
      "color": "#FFFFFF"
    }
  }
}
```

## 6. 推荐实现

文案配置：

```js
export const sceneCopy = {
  heading: "写下今天感觉最好的瞬间"
};
```

HTML：

```html
<section class="scene">
  <img class="scene__background" src="/images/initial-background.webp" alt="" />
  <h1 class="scene__heading">写下今天感觉最好的瞬间</h1>
</section>
```

CSS：

```css
.scene {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  overflow: hidden;
  container-type: inline-size;
}

.scene__background {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.scene__heading {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 14.0741%;
  width: auto;
  max-width: 46%;
  margin: 0;
  color: #fff;
  font-family: var(--scene-heading-font, sans-serif);
  font-size: clamp(20px, 2.7778vw, 40px);
  font-weight: var(--scene-heading-weight, 800);
  font-style: var(--scene-heading-style, italic);
  line-height: 1.175;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
}

@supports (font-size: 1cqw) {
  .scene__heading {
    font-size: 2.7778cqw;
  }
}
```

如果文案需要自动换行：

```css
.scene__heading {
  width: 46%;
  white-space: normal;
  overflow-wrap: anywhere;
}
```

## 7. 实现约束

1. 文字必须是可选择、可读取、可替换的 HTML 文本。
2. 不得把文字合并进背景图片。
3. 文案内容与视觉样式分离。
4. 文案优先从组件参数、配置文件、CMS 或接口读取。
5. 文字与背景图片必须放在同一个 `position: relative` 场景容器中。
6. 文字百分比位置必须相对于场景容器，不能相对于浏览器窗口。
7. 场景保持 `16:9` 完整显示时，文字随背景同步定位和缩放。
8. 若背景使用 `object-fit: cover` 并发生裁切，需要同步计算文字定位偏移。
9. 最终字体确定后，重新检查实际字宽、行高以及中英文显示效果。

## 8. 给 Codex 的实施指令

```text
请根据本文档实现背景上的独立标题文字层：

1. 使用真实的 h1 文本，不要把文字做进背景图。
2. 当前文案为“写下今天感觉最好的瞬间”。
3. 文案必须从组件参数、配置、CMS 或接口读取，便于频繁修改。
4. 基准画板为 1440 × 810。
5. 标题定位为 left 50%、top 14.0741%。
6. 当前示例文案的参考尺寸为 440 × 47 px。
7. 1440 px 基准宽度下参考字号为 40 px，颜色为 #FFFFFF。
8. Karla、ExtraBold、Italic 均为临时示意，不得作为不可替换的最终样式。
9. 使用 CSS 变量管理字体、字重和字形，便于最终字体确定后统一替换。
10. 默认单行显示，并为长文案预留可选的自动换行方案。
11. 文字和背景必须使用同一个坐标空间，响应式缩放时保持位置对应。
```

## 9. 验收标准

- 在 `1440 × 810` 下，标题左上角位于 `(720, 114)`。
- 当前示例文案的参考尺寸为 `440 × 47 px`。
- 标题为真实 HTML 文本，可通过鼠标选择，也可被辅助技术读取。
- 修改文案时无需重新导出背景图。
- 修改文案时无需调整热点坐标。
- 替换字体时只需修改样式变量，不影响场景结构。
- 正常长度的文案不会超出画面右侧。

# 五、动画方案

交互效果：
鼠标移到银色托盘中央的信纸区域触发
约 900ms 渐进压暗，并轻微推进画面
移开后以更慢节奏恢复，切换更自然
手机端可轻触切换
支持键盘聚焦和“减少动态效果”设置

素材有两张尺寸和构图完全一致的图片：

初始明亮状态：完整的初始页背景-包含拱门与托盘信件.png

Hover 暖棕压暗状态：托盘Hover-暖棕压暗效果样例.png

实现要求：

不要直接使用 CSS brightness、sepia 等滤镜模拟最终效果。

将两张完整场景图绝对定位并完全重叠，通过 opacity 做交叉淡化。

只有鼠标进入银色托盘中央的信件区域时才触发，不能让整个页面都成为 Hover 区域。

使用一个透明的绝对定位按钮作为热点区域；大致位置为：

left: 60.2%

top: 66.1%

width: 21.6%

height: 13.5%

border-radius: 50%

Hover 进入时：

初始图 opacity 从 1 变为 0

暖棕图 opacity 从 0 变为 1

时长约 900ms

easing 使用 cubic-bezier(.32,.72,0,1) 或类似的柔和减速曲线

暖棕图进入前为 scale(1.006)，激活后变为 scale(1.001)，形成非常轻微的镜头推进，禁止明显缩放。

鼠标离开时恢复时间设置为 1100–1250ms，比进入稍慢，让画面自然舒展回来。

增加一层透明度很低的暖棕径向渐变，中心位于托盘附近；可增加极弱的边缘暗角，但不能让画面变脏。

支持键盘 focus/blur。

移动端使用点击切换状态。

支持 prefers-reduced-motion，用户要求减少动态效果时将过渡缩短到约 120ms。

图片使用 object-fit: cover，桌面端保持中心构图；竖屏时适当将 object-position 向右调整，确保托盘仍然可见。

不要加入明显按钮、卡片或复杂 UI，只保留非常轻的首次交互提示。

目标体验：像环境光和情绪慢慢发生变化，而不是普通网页的图片切换效果。
---

# 六、Figma实现方式

当前阶段不需要制作完整 Design System。

Figma目标：

不是生产组件库。

而是：

> 给 Codex / 前端提供视觉参考和交互状态说明。

因此制作：

## Frame 1

首页默认状态

```
Home-State0
```

包含：

- 背景图
- 热区标记
- 文案位置


## Frame 2

记录聚焦状态

```
Home-State1
```


## Frame 3

展厅聚焦状态

```
Home-State2
```


三个 Frame 即可。

---

