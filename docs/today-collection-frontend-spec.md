# 今日入馆页前端 Spec

> 状态：当前已确认，作为“问题回答完成后的收获页”实现与验收依据。  
> 最终效果图：`设计-v2-今日入藏页 (3).png`，原始画布 `2880 × 1620`。  
> 前端基准舞台：`1440 × 810`，即效果图按 `50%` 等比换算。  
> 本文覆盖页面语义、数据固化、馆藏编号、路由、素材、视觉层级、滚动、交互与验收；馆藏列表/展柜页本身的视觉不在本文范围内。

## 1. 页面定位与范围

今日入馆页位于“问题回答页”和“馆藏列表/展柜页”之间，是本次记录完成后的只读收获页。页面把已经提交的原始记录、引导问题和用户回答组合成一件正式入馆的个人馆藏。

本页的职责是：

- 展示本次已经创建的 `MemoryEntry`，不再读取或编辑草稿；
- 展示该馆藏永久固定的创建日期和馆藏编号；
- 提供“进入馆藏”“再记一刻”“返回首页”三个后续去向；
- 由项目统一的柔焦转场自然揭示，并在静态状态下保留主体上下的亮暗光影。

本页不负责：

- 调用 AI 或生成任何新文案；
- 修改原始记录、引导问题或问题回答；
- 再次创建馆藏、重新分配编号或增加查看次数；
- 展示馆藏列表、筛选、收藏、擦亮或详情弹窗；
- 手机竖屏重排。

### 1.1 已确认内容映射

| 视觉内容 | 文案或数据来源 | 是否变化 |
| --- | --- | --- |
| 页面标题 | `今日入馆` | 固定 |
| 页面说明 | `将今天值得留下的一刻，正式收入你的个人馆藏` | 固定 |
| 日期 | `entry.createdAt` | 每条馆藏固定 |
| 馆藏编号 | `entry.collectionNumber` | 每条馆藏固定 |
| 左侧标题 | `今天，我想记住` | 固定 |
| 左侧正文 | `entry.recordText` | 用户原始记录 |
| 右上引导语 | `我问自己：${entry.question.text}` | 用户选中的问题 |
| 右侧标题 | `原来，这也是我` | 固定 |
| 右侧正文 | `entry.answerText` | 用户在问题回答页填写的内容 |

必须保持以上语义。右侧正文不是 AI 总结，左侧正文也不是回答摘要。

## 2. 路由与完整用户流

### 2.1 路由定义

新增带稳定条目 ID 的路由：

```text
/today-collection/:entryId  → TodayCollectionPage
/display-archive           → DisplayArchivePage（馆藏列表/展柜页）
```

应用部署仍固定在 `/letter/`。以上均为 React Router 的应用内路径，代码中不得手写 `/letter/` 前缀。

使用 URL 参数而不是只使用 `location.state`，确保页面刷新、复制地址和从历史记录恢复时仍能找到同一件馆藏。

### 2.2 从问题回答页进入

问题回答页有效提交的顺序调整为：

```text
点击“收藏这份回答”
  → 设置提交运行锁
  → 从按钮中心启动 startSoftFocusTransition()
  → 柔光完全覆盖旧页
  → commitDraft() 原子创建 MemoryEntry、分配 collectionNumber、清空 draft
  → replace 到 /today-collection/:createdEntryId
  → 柔光淡出并揭示今日入馆页
```

导航建议使用：

```ts
navigate(`/today-collection/${createdEntryId}`, { replace: true });
```

`replace: true` 用于避免浏览器后退回已经清空草稿的回答页。该提交目标取代 `question-answer-frontend-spec.md` 中直接进入 `/display-archive` 的旧约定；提交锁与校验规则保持不变，转场统一为项目柔焦语言。

### 2.3 页面内三个去向

| 按钮文案 | 目标路由 | 行为 |
| --- | --- | --- |
| `← 进入馆藏` | `/display-archive` | 进入馆藏列表/展柜页 |
| `再记一刻` | `/record` | 开始一条新的原始记录 |
| `返回首页 →` | `/` | 返回首页 |

三个操作只负责导航，不修改当前 `MemoryEntry`，也不再次递增馆藏编号。使用现有 `startSoftFocusTransition`；光源为各按钮中心。转场运行期间忽略重复点击。

## 3. 数据模型与馆藏编号

### 3.1 `MemoryEntry` 扩展

```ts
export interface MemoryEntry {
  id: string;
  collectionNumber: number;
  recordText: string;
  frameworkId: FrameworkId;
  question: QuestionItem;
  answerText: string;
  createdAt: number;
  viewCount: number;
  lastViewedAt: number | null;
  polishCount: number;
  lastPolishedAt: number | null;
  favoritedAt: number | null;
}
```

`collectionNumber` 是数据，不是根据当前数组下标计算的展示值。排序、删除、收藏、擦亮或查看都不能改变它。

### 3.2 `ArchiveState` 扩展

```ts
export interface ArchiveState {
  entriesById: Record<string, MemoryEntry>;
  entryOrder: string[];
  nextCollectionNumber: number;
}

export const initialArchive: ArchiveState = {
  entriesById: {},
  entryOrder: [],
  nextCollectionNumber: 1,
};
```

当前项目使用 Zustand Persist，本规范中的“全局递增”指当前用户这份持久化馆藏中的全局序号：不按日期、框架或会话重置。当前本地优先架构下，它不会跨浏览器或跨设备同步；未来接入账号后，应改由服务端在用户馆藏范围内分配。

### 3.3 分配规则

- 第一条馆藏分配 `1`，显示为 `001`；
- 每次成功创建一条新馆藏，使用当前 `nextCollectionNumber`；
- 同一次 Zustand 状态提交中，把 `nextCollectionNumber` 加一；
- 删除馆藏后不回收、不补号；
- 提交失败、空回答、重复点击或只进入本页都不能消耗编号；
- 页面刷新、重新查看旧馆藏或从列表进入详情都不能重新编号；
- `999` 之后自然显示 `1000`，不截断为三位。

格式化函数：

```ts
export const formatCollectionNumber = (value: number): string =>
  String(value).padStart(3, '0');
```

### 3.4 原子提交要求

编号读取、条目创建、编号加一和草稿清空必须发生在同一个 `set((state) => ...)` 中。不能先在页面读取 `entryOrder.length + 1`，也不能在两个 action 中分别写入条目和计数器。

推荐结构：

```ts
commitDraft: () => {
  let createdEntryId: string | null = null;

  set((state) => {
    const draft = state.draft;
    // 在 updater 内完成完整校验；无效时 return state。
    // 创建 entry 时使用 state.archive.nextCollectionNumber。
    // 同时写 entry、递增 nextCollectionNumber、清空 draft。
    return nextState;
  });

  return createdEntryId;
};
```

页面层的 `isSubmittingRef` 仍需保留，作为连续点击的第一道保护；Store 原子提交是数据一致性的最终保证。

### 3.5 Persist 迁移

现有持久化 key `zenflow-record-storage-v2` 不改名，以免丢失用户已有草稿和馆藏。增加 Persist `version` 和 `migrate`/归一化逻辑：

1. 按 `entryOrder` 的反向顺序得到从旧到新的馆藏；
2. 为缺少 `collectionNumber` 的旧条目按旧到新顺序分配 `1, 2, 3...`；
3. 已有合法且唯一的正整数编号应保留；
4. 重复、非整数或小于 `1` 的编号视为无效并重新分配；
5. `nextCollectionNumber` 至少为所有有效编号最大值加一；若持久计数器更大则保留更大的值，避免删除最高编号后发生复用，空馆藏为 `1`；
6. `entriesById` 中未出现在 `entryOrder` 的遗留条目按 `createdAt` 升序追加后再参与迁移。

迁移必须幂等：同一份数据多次经过归一化，编号不能继续变化。

## 4. 素材清单与资源约定

实现时将运行时素材放入：

```text
public/today-collection/
  background.webp
  display-board.webp
  shadow-overlay.webp
  light-overlay.webp
  original-record-panel.png
  reflection-answer-panel.png

public/fonts/
  italianno-400.woff2
  OFL-Italianno.txt
```

推荐将用户提供的 PNG 转为无损 WebP；透明素材不得使用会产生边缘脏色的有损压缩。保留原始 PNG 作为设计源文件，不直接散落在 `src` 中。

| 目标文件 | 用户来源文件 | 源尺寸 | 透明内容/关键参数 | 运行时用途 |
| --- | --- | ---: | --- | --- |
| `background.webp` | `背景图.png` | `1440 × 810` | 全舞台背景；右缘存在少量透明像素 | 页面完整室内背景 |
| `display-board.webp` | `主体背景图@2x.png` | `1980 × 1418` | `@2x`；非透明边界约 `(35,87)–(1979,1418)` | 纸张、蕾丝、布板与黄铜托架整体 |
| `shadow-overlay.webp` | `暗层.png` | `1440 × 810` | Alpha `0–71`，约 30% 效果已烘焙 | 主体常驻暗部 |
| `light-overlay.webp` | `亮层.png` | `1440 × 810` | Alpha `0–130`，柔光透明度已烘焙 | 主体常驻亮部 |
| `original-record-panel.png` | 第一个正文叠加层 | `321 × 213` | `#F2DADA`，最大 Alpha `153/255`（60%） | 新版左侧原始记录底层 |
| `reflection-answer-panel.png` | 第二个正文叠加层 | `353 × 213` | `#F2DADA`，最大 Alpha `153/255`（60%） | 新版右侧回答底层 |
| 不进入运行时 | `Rectangle 9.png` | `233 × 71` | 可见字形边界约 `(27,20)–(206,47)` | 仅作为花体视觉参考 |

素材约束：

- 所有路径通过 `assetUrl('today-collection/...')` 生成，不硬编码 `/letter/`、域名或根路径；
- `display-board.webp` 按 `990 × 709` CSS 像素显示，保留 `@2x` 清晰度；
- `shadow-overlay.webp` 和 `light-overlay.webp` 都按完整 `1440 × 810` 舞台定位；
- 两个光影 PNG 的透明度已经包含在像素 Alpha 中，CSS `opacity` 必须为 `1`。不能再对暗层设置 `opacity: .3`，否则会把最终暗部降低到约 9%；
- 两个新版粉色叠加层分别按 `321 × 213`、`353 × 213` 原尺寸使用，不拉伸为同宽；
- 背景层设置暖桃色兜底，避免源图右缘透明像素在部分浏览器中露出深色舞台底；
- 装饰图片统一 `alt=""`、`aria-hidden="true"`、`draggable="false"`、`pointer-events: none`；
- 文案、日期、编号和按钮必须是 DOM，不得重新合并到效果图中。

素材引用示例：

```ts
const ASSET_ROOT = assetUrl('today-collection');

const TODAY_COLLECTION_ASSETS = {
  background: `${ASSET_ROOT}/background.webp`,
  displayBoard: `${ASSET_ROOT}/display-board.webp`,
  shadow: `${ASSET_ROOT}/shadow-overlay.webp`,
  light: `${ASSET_ROOT}/light-overlay.webp`,
  originalPanel: `${ASSET_ROOT}/original-record-panel.png`,
  answerPanel: `${ASSET_ROOT}/reflection-answer-panel.png`,
} as const;
```

## 5. 舞台与桌面适配

### 5.1 固定 16:9 舞台

本轮只考虑桌面端，沿用相邻页面的完整舞台策略：

```css
.today-collection-page {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #8f6553;
}

.today-collection-stage {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  overflow: hidden;
  isolation: isolate;
  container-type: inline-size;
  color-scheme: only light;
  background: #d7a38b;
}
```

- 所有设计坐标统一使用 `1440 × 810`；
- 页面背景、主体、光影、文字和交互层在同一舞台内整体等比缩放；
- 推荐使用 `cqw`，换算公式为 `1px = 0.069444cqw`；
- 非 16:9 窗口完整显示舞台并居中，剩余区域使用同色系延展/留边；
- 不使用 `cover` 裁掉主体，不为窄屏重排左右内容；
- 浏览器缩放和窗口变化不能使图片与 DOM 文字发生相对漂移。

### 5.2 基准坐标

下表是 `1440 × 810` 逻辑舞台上的实现基准。主体与两个叠加层来自素材匹配后的确定坐标；文字坐标允许在截图对照时进行 `±3px` 光学校正。

| 元素 | x | y | width | height | 说明 |
| --- | ---: | ---: | ---: | ---: | --- |
| 背景图 | 0 | 0 | 1440 | 810 | 全舞台 |
| 主体背景图画布 | 208 | 46 | 990 | 709 | `@2x` 素材以 50% 显示 |
| 暗层 | 0 | 0 | 1440 | 810 | CSS opacity 为 1 |
| 亮层 | 0 | 0 | 1440 | 810 | CSS opacity 为 1 |
| 页面主标题 | 598 | 71 | 192 | 38 | `今日入馆`，以内容视觉中心 `x = 694` 居中 |
| 日期 | 350 | 99 | 84 | 25 | 从 `createdAt` 格式化，随顶部信息组左移 `26px` |
| 页面说明 | 824 | 99 | 294 | 25 | 固定文案，左对齐且不得与右侧分割线重叠 |
| Collection 文本盒 | 363 | 226 | 235 | 38 | 真实 DOM 花体文字 |
| 左侧标题 | 362 | 281 | 252 | 38 | `今天，我想记住` |
| 左侧标题下划线 | 362 | 341 | 205 | 1 | CSS 线条 |
| 左侧叠加层 | 329 | 355 | 321 | 213 | 新版原始记录背景 |
| 左侧正文滚动视口 | 362 | 389 | 261 | 153 | 左边缘与左侧标题对齐 |
| 引导问题滚动视口 | 754 | 244 | 319 | 28 | 左边缘与右侧标题对齐，与正文滚动互不影响 |
| 右侧标题 | 754 | 281 | 252 | 38 | `原来，这也是我` |
| 右侧标题下划线 | 754 | 341 | 204 | 1 | CSS 线条 |
| 右侧叠加层 | 738 | 355 | 353 | 213 | 新版问题回答背景，右边缘保持 `x = 1091` |
| 右侧正文滚动视口 | 754 | 389 | 301 | 153 | 叠加层内部 |
| “进入馆藏”按钮盒 | 207 | 736 | 135 | 42 | 左对齐 |
| “再记一刻”按钮盒 | 641.5 | 736 | 105 | 42 | 中心为 `x = 694`，与页面主标题及正文中缝对齐 |
| “返回首页”按钮盒 | 1178 | 736 | 135 | 42 | 右对齐 |

顶部标题、日期、页面说明与四段细装饰线作为一个整体相对几何中心左移 `26px`，主标题中心固定为视觉轴 `x = 694`。日期、页面说明与四段顶部装饰线共享 `y = 111px` 的竖向中线；分割线必须停在文字盒外，不能穿过或覆盖字形。它们属于装饰，不进入可访问性树；实现时以最终效果图为准，不得因文本宽度变化挤压主标题。

## 6. 图层和组件结构

### 6.1 图层顺序

从后向前：

```text
TodayCollectionPage
└── TodayCollectionStage
    ├── BackgroundImage
    ├── DisplayBoardImage
    ├── HeaderContent
    │   ├── DateAndRules
    │   ├── PageTitle
    │   └── PageSubtitleAndRules
    ├── CollectionContent
    │   ├── CollectionNumber
    │   ├── OriginalRecordSection
    │   │   ├── SectionTitle + Rule
    │   │   ├── OriginalRecordPanelImage
    │   │   └── OriginalRecordScrollViewport
    │   └── ReflectionSection
    │       ├── QuestionScrollViewport
    │       ├── SectionTitle + Rule
    │       ├── ReflectionAnswerPanelImage
    │       └── ReflectionAnswerScrollViewport
    ├── ShadowOverlay
    ├── LightOverlay
    └── NavigationActions
```

推荐 z-index：

| z-index | 内容 |
| ---: | --- |
| `0` | 背景图 |
| `10` | 主体背景图 |
| `20` | 两个粉色叠加层 |
| `30` | 日期、标题、编号、问题和正文 |
| `40` | 暗层 |
| `50` | 亮层 |
| `60` | 底部导航按钮及其焦点轮廓 |

光影层位于主体内容上方以复现 Figma 合成效果，但必须 `pointer-events: none`。底部按钮放在更高的交互层；光影素材在底部按钮区域本身基本透明，不改变效果图观感。

### 6.2 组件职责

| 组件 | 输入 | 职责 |
| --- | --- | --- |
| `TodayCollectionPage` | 路由 `entryId` | 守卫、读取条目、组织导航 |
| `CollectionHeader` | `createdAt` | 日期、主标题、说明和装饰线 |
| `CollectionNumberLabel` | `collectionNumber` | 三位起始格式化和花体展示 |
| `ReadOnlyScrollPanel` | `label`, `asset`, `children` | 粉色背景、裁切、键盘可达滚动 |
| `QuestionPrompt` | `question.text` | 独立固定高度问题滚动区 |
| `CollectionActions` | 三个导航回调 | 柔光转场、重复点击保护 |

页面可以先写在一个 TSX 文件内，但 DOM 和 class 命名应保留以上职责边界，不能把数据守卫、编号分配和滚动样式混进装饰图片组件。

## 7. 页面读取与守卫

页面必须从归档读取已提交条目：

```ts
const { entryId } = useParams<{ entryId: string }>();
const entry = useRecordStore((state) =>
  entryId ? state.archive.entriesById[entryId] : undefined,
);
```

禁止从以下位置读取主要内容：

- 已被 `commitDraft()` 清空的 `draft`；
- `location.state` 中临时复制的一份正文；
- 当前日期或 `entryOrder` 下标；
- URL 中可被用户修改的编号。

守卫：

```text
entryId 缺失或 archive 中不存在对应条目
  → replace 到 /display-archive
  → 守卫期间返回 null，避免残缺纸张闪现

entry 存在
  → 渲染今日入馆页
```

自动进入今日入馆页不调用 `viewEntry()`，不增加 `viewCount`。查看次数只在用户从馆藏列表主动打开馆藏详情时增加。

## 8. 日期与馆藏编号表现

### 8.1 日期

日期固定来自 `entry.createdAt`，不能使用页面当前日期：

```ts
const dateLabel = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date(entry.createdAt));
```

目标形式：

```text
2026年8月23日
```

### 8.2 `Collection NO.` 花体方案

`Rectangle 9.png` 只用于视觉比对，不作为运行时整句图片。正式实现使用真实文本，并随项目自托管 `Italianno Regular` WOFF2。该字体的细线连写气质与参考图接近，且可以覆盖所有动态编号。

```css
@font-face {
  font-family: "Italianno";
  src: url("../fonts/italianno-400.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

.today-collection-number {
  font-family: "Italianno", "Segoe Script", cursive;
  font-size: 33px;
  font-weight: 400;
  line-height: 38px;
  letter-spacing: 0;
  white-space: nowrap;
  color: rgb(91 76 61 / 82%);
}
```

渲染：

```tsx
<p className="today-collection-number" aria-label={`馆藏编号 ${collectionNumber}`}>
  Collection NO.{formatCollectionNumber(collectionNumber)}
</p>
```

约束：

- 大小写和标点固定为 `Collection NO.027` 的形式；
- `NO.` 与数字之间不加空格；
- 不把前缀做成图片后再拼接系统字体数字；
- 不制作 0–9 数字精灵图；
- 字体加载失败时允许脚本字体 fallback，但截图验收必须在 WOFF2 成功加载后进行；
- 如果实现截图中 `Italianno` 与参考图存在明显字宽差异，只允许微调字号、字距和盒子 x 坐标，不改回图片编号方案。

## 9. 三个独立滚动区域

可能溢出的内容有且只有：

1. 左侧用户原始记录；
2. 右上引导问题；
3. 右侧用户问题回答。

三者必须使用独立滚动容器，滚动位置互不影响。页面舞台自身不能滚动，内容也不能撑大主体图片。

### 9.1 原始记录和回答面板

- 左侧外框固定 `321 × 213`，右侧外框固定 `353 × 213`；
- PNG 位于 wrapper 底层，文本滚动视口位于其上；
- wrapper 负责固定尺寸，内部 viewport 负责 `overflow-y: auto`；
- 保留用户换行：`white-space: pre-wrap`；
- 连续长 URL 或无空格文本使用 `overflow-wrap: anywhere`；
- 不使用省略号、不截断、不自动缩小字体；
- 初次进入时滚动位置为顶部；离开后无需持久化滚动位置。

```css
.today-collection-scroll {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgb(112 82 68 / 26%) transparent;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.today-collection-scroll:hover,
.today-collection-scroll:focus-visible {
  scrollbar-color: rgb(112 82 68 / 52%) transparent;
}

.today-collection-scroll::-webkit-scrollbar {
  width: 5px;
}

.today-collection-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.today-collection-scroll::-webkit-scrollbar-thumb {
  border: 1px solid transparent;
  border-radius: 999px;
  background: rgb(112 82 68 / 26%);
  background-clip: padding-box;
}

.today-collection-scroll:hover::-webkit-scrollbar-thumb,
.today-collection-scroll:focus-visible::-webkit-scrollbar-thumb {
  background: rgb(112 82 68 / 52%);
  background-clip: padding-box;
}
```

滚动条始终保留可用能力；内容未溢出时浏览器自然不显示 thumb。不要完全隐藏滚动条。

### 9.2 引导问题

问题区域固定为 `319 × 28px` 的视口，左边缘与右侧标题及回答正文统一落在 `x = 754` 的列轴上，整句包含固定前缀：

```tsx
<div
  className="today-collection-question-scroll today-collection-scroll"
  role="region"
  tabIndex={0}
  aria-label={`我问自己：${entry.question.text}`}
>
  <p><span>我问自己：</span>{entry.question.text}</p>
</div>
```

- 短问题保持设计稿中的单行观感；
- 长问题自然换行后在该区域内部纵向滚动；
- 不能把标题“原来，这也是我”向下推；
- 不能与右侧回答面板共享滚动条；
- 不做跑马灯、水平滚动或省略号。

### 9.3 滚轮和键盘

- 鼠标位于某个区域上方时，滚轮只滚动该区域；
- 三个 viewport 均设置 `tabIndex={0}`，支持方向键、Page Up/Down、Home/End；
- focus-visible 使用低对比暖棕色内轮廓，不能改变尺寸；
- `overscroll-behavior: contain` 防止滚到边界后把手势传给外层页面。

## 10. Typography 与视觉样式

中文统一使用项目自托管的 `Noto Serif SC`，且字体声明与字重规则限定在本页，方便后续替换成只包含所需字形和字重的子集。页面禁止受系统深色模式自动反色。

| 元素 | Font | Weight | Size / line-height | Color |
| --- | --- | ---: | --- | --- |
| 页面标题“今日入馆” | Noto Serif SC | 500 Medium | `48 / 38px` | `#765f4c` |
| 日期 | Noto Serif SC | 400 | `14 / 24px` | `rgb(94 78 63 / 72%)` |
| 页面说明 | Noto Serif SC | 400 | `14 / 24px` | `rgb(94 78 63 / 72%)` |
| Collection 编号 | Italianno | 400 | `33 / 38px` | `rgb(91 76 61 / 82%)` |
| 引导问题 | Noto Serif SC | 200 ExtraLight | `15 / 25px` | `rgb(0 0 0 / 60%)` |
| 左右内容标题 | Noto Serif SC | 500 Medium | `36 / 38px` | `#171411` |
| 原始记录正文 | Noto Serif SC | 400 | `19 / 38px` | `#28221d` |
| 问题回答正文 | Noto Serif SC | 400 | `19 / 38px` | `#28221d` |
| 底部导航 | Noto Serif SC | 500，hover/focus 为 700 | `22 / 36px` | `rgb(92 78 63 / 74%)` |

补充：

- 正文使用 `text-align: left`，不做两端强制对齐；
- 本页左右列轴固定为 `x = 362` 与 `x = 754`：标题、引导问题和面板内正文分别对齐，不按粉色叠加层外框居中；
- 当前仓库中的临时 Noto Serif SC 文件覆盖 `400–700`；引导问题先声明 `font-weight: 200`，待 ExtraLight 子集到位后直接扩展/替换 `@font-face`，布局参数不再改变；
- 正文保留真实换行，段落之间不额外插入内容；
- 标题下划线为 `1px` 暖灰棕色，不使用文本下划线；
- 粉色面板不增加额外边框、阴影或 backdrop blur；
- 不在纸张上增加白色表单感、输入光标或编辑态；
- 三个导航按钮分别响应自己的 hover/focus；命中后切换到 `700` 字重，同时轻微提亮、增加柔和文字阴影，并让箭头位移 `1–2px`，不增加胶囊底。

## 11. 静态光影

暗层和亮层是页面静态合成的一部分，不是加载状态或 AI 状态：

```text
主体与 DOM 内容
  → 暗层（导出 Alpha 已包含约 30% 效果）
  → 亮层（Figma 图层 100%，导出 Alpha 已包含柔光边缘）
```

要求：

- 页面静止时两层始终存在；
- 不做呼吸、闪烁、跟随鼠标或循环动画；
- 不因 `prefers-reduced-motion` 隐藏，因为它们是静态视觉而非运动；
- 不通过 CSS gradient 重画；
- 不给光影图设置混合模式，除非逐像素对照证明 Figma 使用了非 Normal 模式；当前按普通 Alpha 合成实现。

回答页提交时的 `WarmLightTransitionLayer` 位于路由页面之上；它淡出后仍保留本页这两个静态光影层。

## 12. 页面交互与状态

### 12.1 进入馆藏

- 点击后柔光从左下按钮中心扩散；
- 导航至 `/display-archive`；
- 不调用 `viewEntry()`，不改变当前馆藏数据；
- 馆藏列表如需高亮刚入馆条目，可另传 `location.state.highlightEntryId`，但不是本页必需条件。

### 12.2 再记一刻

- 点击后柔光从底部中央按钮中心扩散；
- 导航到 `/record`；
- 此时上一条提交已经清空 `draft`，记录页应创建新的练习；
- 不复制上一条记录或问题到新草稿。

### 12.3 返回首页

- 点击后柔光从右下按钮中心扩散；
- 导航到 `/`；
- 不删除刚创建的馆藏。

### 12.4 运行锁

三个按钮共享页面级 `transitioning` 状态或 ref。任一导航开始后：

- 三个按钮都忽略后续点击；
- 保持原位置，允许通过 `aria-disabled` 或真实 `disabled` 表达状态；
- 转场启动失败时释放锁；
- 不显示加载文案，因为三个目标都不依赖 AI。

## 13. 可访问性

- 页面使用唯一的视觉/语义 `h1`：`今日入馆`；
- 左右标题使用 `h2`；
- 日期使用 `<time dateTime={...}>`；
- 馆藏编号通过 `aria-label="馆藏编号 027"` 提供中文语义；
- 原始记录、引导问题和回答都是 DOM 文本，不依赖图片 OCR；
- 三个滚动区使用 `role="region"`、清晰 `aria-label` 和 `tabIndex={0}`；
- 装饰线、背景、主体、面板和光影全部从可访问性树隐藏；
- 三个导航必须使用 `<button type="button">` 或 React Router `<Link>`，不能使用无语义 `<div>`；
- focus-visible 轮廓在粉色/桃色背景上必须可辨识；
- DOM 阅读顺序建议：主标题与日期 → 馆藏编号 → 左标题与原始记录 → 引导问题 → 右标题与回答 → 三个导航；
- `prefers-reduced-motion: reduce` 下复用统一柔光规范的快速淡入淡出版本，按钮箭头不位移。

## 14. 文件改造范围

实现阶段预计涉及：

```text
src/App.tsx
src/pages/QuestionAnswerPage.tsx
src/pages/TodayCollectionPage.tsx            # 新增
src/pages/TodayCollectionPage.css            # 新增
src/store/useRecordStore.ts
src/utils/formatCollectionNumber.ts          # 可选新增
public/today-collection/*                     # 新增运行时素材
public/fonts/italianno-400.woff2              # 新增字体
public/fonts/OFL-Italianno.txt                 # 新增字体许可
docs/question-answer-frontend-spec.md          # 提交目标同步
docs/zustand-store-design.md                   # 实现时同步正式数据模型
docs/README.md                                 # 文档索引
```

当前 `DisplayArchivePage.tsx` 继续承担馆藏列表/展柜页，不应被今日入馆视觉直接覆盖。今日入馆页必须是独立页面组件。

## 15. 推荐实现顺序

1. 扩展 `MemoryEntry`、`ArchiveState` 和 Persist 迁移；
2. 修改 `commitDraft()`，在一次原子提交中分配编号；
3. 新增 `/today-collection/:entryId` 路由和页面守卫；
4. 导入、无损转换并校验全部素材及字体；
5. 完成舞台、主体和静态光影层；
6. 完成日期、编号、标题和三个独立滚动区；
7. 接入三个导航与柔光转场；
8. 修改问题回答页提交目标并验证结晶覆盖层跨路由衔接；
9. 执行迁移、刷新、重复提交、长文本和多比例桌面截图验收。

## 16. 验收标准

### 16.1 页面与素材

- [ ] 页面使用 `1440 × 810` 基准舞台并完整等比缩放；
- [ ] 非 16:9 桌面窗口不裁切主体；
- [ ] 背景、主体、光影和叠加层均来自指定素材；
- [ ] 主体素材位于 `(208, 46)`，显示尺寸 `990 × 709`；
- [ ] 左右粉色层分别为 `321 × 213` 和 `353 × 213`，没有被拉成相同宽度；
- [ ] 日期、页面说明与四段顶部细线沿同一竖向中线排布，文字不被细线遮挡；
- [ ] “今日入馆”、正文中缝和“再记一刻”共同落在 `x = 694` 的视觉中心轴；
- [ ] 暗层和亮层 CSS opacity 均为 `1`，不存在重复降透明度；
- [ ] 图片与 DOM 在缩放后保持相对对齐，无漂移。

### 16.2 内容语义

- [ ] 左侧展示 `entry.recordText`；
- [ ] 右上展示 `我问自己：${entry.question.text}`；
- [ ] 右侧展示 `entry.answerText`；
- [ ] 页面没有 AI 生成、等待或改写逻辑；
- [ ] 日期来自 `entry.createdAt`，不是当前日期；
- [ ] 页面内容来自路由 ID 对应的已归档条目，不读取草稿。

### 16.3 编号

- [ ] 第一条馆藏显示 `Collection NO.001`；
- [ ] 每次成功创建新馆藏只递增一次；
- [ ] 刷新、返回、重复查看和按钮导航不递增；
- [ ] 删除旧条目不补号；
- [ ] `999` 后显示 `1000`；
- [ ] 旧 Persist 数据迁移后按旧到新稳定编号；
- [ ] 迁移重复执行不会改变已有编号；
- [ ] `Collection NO.` 使用自托管花体真实文本，不使用 `Rectangle 9.png` 作为动态编号。

### 16.4 滚动

- [ ] 原始记录、引导问题和回答三个区域分别独立滚动；
- [ ] 任一区域溢出都不改变主体尺寸和其他元素位置；
- [ ] 文本不截断、不省略、不自动缩小；
- [ ] 滚动条默认低对比，hover/focus 时增强；
- [ ] 三个区域均可通过键盘聚焦和滚动；
- [ ] 滚到边界不会带动页面舞台。

### 16.5 路由与交互

- [ ] 回答提交成功后通过统一柔焦转场进入 `/today-collection/:entryId`；
- [ ] 刷新今日入馆 URL 仍显示同一件馆藏；
- [ ] 无效 ID 无残缺页面闪现并 replace 到 `/display-archive`；
- [ ] “进入馆藏”进入 `/display-archive`；
- [ ] “再记一刻”进入 `/record`；
- [ ] “返回首页”进入 `/`；
- [ ] 任一转场运行期间不会因连续点击触发多次导航；
- [ ] 自动进入本页不会增加条目 `viewCount`。

### 16.6 工程检查

- [ ] 所有静态路径通过 `assetUrl()` 或 `import.meta.env.BASE_URL`；
- [ ] `npm run lint` 通过；
- [ ] `npm run build` 通过；
- [ ] `/letter/today-collection/:entryId` 直接刷新可由 SPA fallback 正常恢复；
- [ ] 浏览器控制台无资源 404、字体跨域、重复 key 或状态更新警告；
- [ ] 1440×810、1920×1080、16:10 和超宽桌面视口截图均完成比对；
- [ ] WOFF2 加载完成后的 `Collection NO.` 与参考图保持相近的细线连写观感。
