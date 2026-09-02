# 馆藏展示页前端 Spec

> 状态：当前已确认，作为 `/display-archive` 展示页实现与验收依据。  
> 最终视觉基准：用户确认的时间线、多月份、Random、Favorites、全馆藏为空和珍藏为空状态稿。  
> 原始设计画布：`1440 × 810`。  
> 本文覆盖桌面端展示页的数据筛选、月份导航、三种模式、五卡位轮播、阴影资产、卡片交互、空状态、路由衔接与验收。手机重排、跨月份“全部馆藏”和详情页重新设计不在本次 MVP 范围内。

## 1. 页面定位与实现范围

馆藏展示页是用户回看已归档积极记忆的主入口。页面以墙面托架和实体卡片为统一视觉场景，通过左侧月份筛选和右侧展示模式切换，提供三种浏览方式：

- `时间线`：当前月份内按创建时间排列；
- `随机逛逛`：当前月份内随机排列；
- `珍藏记忆`：只展示当前月份内已珍藏的卡片。

三种模式在 MVP 中共用同一个托架和五卡位中间区域，只改变数据集合、顺序、标题和右侧选中状态。早期文档中为随机/精选模式设计独立场景的设想不在本次实现范围内。

本页负责：

- 从 Zustand `archive` 读取已完成的 `MemoryEntry`；
- 根据真实数据生成年份与月份导航；
- 组合“当前月份 × 当前模式”得到展示集合；
- 在固定五个卡位中显示最多五张卡片；
- 通过左右箭头一次移动一个卡位；
- 支持卡片 Hover 抽起和点击进入馆藏详情；
- 展示全馆藏为空和当前月份珍藏为空两种状态；
- 在页面刷新、筛选和翻页过程中保持数据只读。

本页不负责：

- 创建、编辑或删除 `MemoryEntry`；
- 调用 AI 或生成卡片摘要；
- 自动跨月份翻页；
- 在 MVP 中提供“全部月份”聚合筛选；
- 手机竖屏或超小屏幕重排；
- 把五张卡片、导航文字或动态内容烘焙成一张完整效果图。

## 2. 当前代码基线与替换范围

现有路由已存在：

```text
/display-archive → DisplayArchivePage
```

当前 `src/pages/DisplayArchivePage.tsx` 是内联样式占位实现，使用 `timeline / highlights / surprise` 三个临时模式和详情弹窗。本规范实施时应完整替换其视觉与页面交互，但保留以下既有工程约定：

- React Router 内部路径不手写 `/letter`；
- public 素材通过 `assetUrl()` 引用；
- 页面业务数据来自 `useRecordStore`；
- `viewEntry`、`polishEntry` 和 `toggleFavorite` 仍由 Store 负责；
- 页面模式、月份、窗口索引、随机顺序和动画锁属于 React 本地状态，不进入 Persist。

应用仍部署在 `/letter/`，生产 URL 为：

```text
/letter/display-archive
```

## 3. 数据语义与派生结构

### 3.1 复用现有 `MemoryEntry`

展示页不新增卡片持久字段，继续使用：

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

卡片正面内容映射：

| 卡片区域 | 数据来源 | 规则 |
| --- | --- | --- |
| 左上 `NO.027` | `collectionNumber` | 使用 `formatCollectionNumber()`，最少三位 |
| 右上 `08.23` | `createdAt` | 当前本地时区，格式 `MM.DD` |
| `Collection No.027` | `collectionNumber` | DOM 真实文本，不使用图片编号 |
| 中央记录正文 | `recordText` | 初始视口约显示两行，超出后在卡片内纵向滚动，不省略、不调用 AI 改写 |

问题全文和完整回答继续在详情页展示；展示架卡片中央直接显示用户最初的 `recordText`。

### 3.2 月份键必须使用本地时区

月份分组不能使用 `toISOString().slice(0, 7)`，否则中国时区零点附近的记录可能被分到错误月份。使用本地时间字段：

```ts
type MonthKey = `${number}-${string}`; // 例如 2026-08

const getMonthKey = (timestamp: number): MonthKey => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}` as MonthKey;
};
```

从 `archive.entriesById` 派生：

```ts
interface ArchiveMonth {
  key: MonthKey;
  year: number;
  monthIndex: number; // 0–11
  entries: MemoryEntry[];
}
```

要求：

- 只生成至少有一条馆藏的月份；
- 月份按时间升序排列；
- 页面默认选择最新有数据的月份；
- 没有任何馆藏时不生成月份节点；
- 当前 MVP 只在左侧显示当前选中年份中的月份；跨年导航作为后续扩展，派生结构仍需保留年份信息。

### 3.3 时间线排序

当前月份内按 `createdAt` 升序排列，即更早的卡片在左，更晚的卡片在右。时间戳相同时使用永久馆藏编号保证稳定顺序：

```ts
const sortTimeline = (entries: readonly MemoryEntry[]) =>
  [...entries].sort((a, b) =>
    a.createdAt - b.createdAt
    || a.collectionNumber - b.collectionNumber
    || a.id.localeCompare(b.id),
  );
```

Store 中的 `entryOrder` 是“最新在前”，不能直接作为本页从左到右的渲染顺序。

### 3.4 珍藏判定与擦亮衔接

展示页的珍藏筛选使用现有字段：

```ts
const isTreasured = (entry: MemoryEntry) => entry.favoritedAt !== null;
```

`polishCount` 单独增加时不会自动通过上述筛选。由于确认的空状态文案是“擦亮一张卡片后，它会被珍藏在这里”，馆藏详情中的首次“擦亮”动作必须同时确保该条目被珍藏，且不能在重复擦亮时误取消珍藏。

推荐后续在 Store 增加原子 action，而不是页面连续调用两个可能互相竞争的 action：

```ts
polishAndTreasureEntry: (id: string) => {
  // polishCount + 1
  // lastPolishedAt = now
  // favoritedAt 为空时设为 now；已有值时保持不变
}
```

本展示页只读取结果；详情页视觉及该 action 的按钮实现不在本文范围内，但这是“珍藏记忆”可被用户填充的必要业务依赖。

## 4. 页面状态模型

```ts
type ArchiveMode = 'timeline' | 'random' | 'favorites';

interface DisplayArchiveUiState {
  mode: ArchiveMode;
  selectedMonthKey: MonthKey | null;
  windowStart: number;
  randomOrderIds: string[];
  isPaging: boolean;
  liftingEntryId: string | null;
}
```

初始状态：

```text
archive 为空
  → mode = timeline
  → selectedMonthKey = null
  → 显示全馆藏为空状态

archive 非空
  → mode = timeline
  → selectedMonthKey = 最新有数据月份
  → 时间线升序
  → windowStart = max(0, entries.length - 5)
```

选择最新月份和最新五张，保证从“今日入馆”进入展示页时，刚创建的卡片可见。最新五张内部仍保持从左到右时间升序。

## 5. 月份与模式组合规则

### 5.1 月份筛选

点击月份后：

1. 更新 `selectedMonthKey`；
2. 保持当前模式不变；
3. 重新计算当前月份数据；
4. `timeline` 和 `favorites` 定位到集合的最新五张；
5. `random` 在新月份内重新洗牌，并从第一张开始；
6. 翻页动画运行中忽略月份点击，或先完成当前动画再切换，不能同时运行两次位移。

月份不会在点击箭头到达末尾时自动切换。用户必须显式点击左侧月份。

### 5.2 三种模式

| mode | 中文 | 英文标题 | 数据规则 |
| --- | --- | --- | --- |
| `timeline` | 时间线 | `Collection • Timeline` | 当前月全部卡片，按时间升序 |
| `random` | 随机逛逛 | `Collection • Random` | 当前月全部卡片，使用当前随机顺序 |
| `favorites` | 珍藏记忆 | `Collection • Favorites` | 当前月 `favoritedAt !== null`，按时间升序 |

右侧三项位置固定，不因选中项改变而重新排序：

- 选中项文字 100% 不透明度，并在竖线上显示圆点；
- 未选中项文字 60% 不透明度，不显示圆点；
- 选中项可以增大字号，但三个固定行盒高度不得改变，避免布局跳动；
- 圆点沿竖线移动到固定的三个位置。

### 5.3 随机模式

随机顺序只属于当前展示页会话：

- 第一次进入 `random` 时，对当前月份 ID 执行一次 Fisher–Yates 洗牌；
- 已处于 `random` 时再次点击“随机逛逛”，重新洗牌；
- 切换月份后，对新月份重新洗牌；
- 不在 render 或每次 `useMemo` 中调用 `Math.random()`；
- 当集合至少有两张时，重新洗牌不得得到与上一次完全相同的顺序；若碰巧相同，至少循环移动一位；
- 切出随机模式再切回时可以重新洗牌，MVP 不要求跨路由持久化随机顺序。

## 6. 五卡位窗口与翻页

### 6.1 固定卡位

页面始终按五个固定视觉卡位设计：

```text
slot 0 | slot 1 | slot 2 | slot 3 | slot 4
```

规则：

- 1–4 张时依次占用最左侧前 N 个卡位；
- 不居中、不重新分配间距；
- 0 张时不渲染卡片；
- 5 张及以下不显示翻页箭头；
- 超过 5 张时窗口宽度固定为 5；
- 每次只把 `windowStart` 增减 1；
- 最后一个窗口仍尽量保持五张，不产生右侧空槽。

```ts
const VISIBLE_CARD_COUNT = 5;
const maxWindowStart = Math.max(0, entries.length - VISIBLE_CARD_COUNT);

const pageLeft = () => setWindowStart((value) => Math.max(0, value - 1));
const pageRight = () => setWindowStart((value) => Math.min(maxWindowStart, value + 1));
```

### 6.2 箭头显示条件

```ts
const showPagingControls = entries.length > VISIBLE_CARD_COUNT;
const canPageLeft = windowStart > 0;
const canPageRight = windowStart < maxWindowStart;
```

- `entries.length <= 5`：两侧箭头都不渲染；
- 超过五张但位于最左窗口：左箭头隐藏或降至不可交互状态，右箭头可用；
- 位于中间窗口：两侧均可用；
- 位于最右窗口：右箭头隐藏或降至不可交互状态；
- 隐藏与禁用方式应在视觉上保持场景平衡，但禁用箭头不得继续接收点击。

### 6.3 抽顿翻页动效

一次移动一格，总时长建议 `420ms`：

```text
0–300ms   快速移动到目标方向，并超过目标约 8px
300–420ms 回落 8px，吸附到新卡位
```

推荐使用 keyframes，而不是匀速 transition：

```css
@keyframes archive-page-left {
  0% { transform: translateX(0); }
  78% { transform: translateX(calc(var(--slot-step) * -1 - 8px)); }
  100% { transform: translateX(calc(var(--slot-step) * -1)); }
}
```

实现要求：

- 动画期间设置 `isPaging = true`，忽略重复箭头点击；
- 旧窗口、卡片阴影和接触阴影应作为同一运动组位移；
- 动画完成后更新窗口数据、复位 transform，再解锁；
- 新进入的边缘卡片允许在运动前半段无完整接触阴影，落位后必须切换到正确数量的静态阴影；
- `prefers-reduced-motion: reduce` 下取消过冲，使用 `120ms` 淡入淡出或直接更新窗口；
- MVP 不要求鼠标拖拽、滚轮映射横向移动或惯性滑轨，左右箭头与键盘方向键是正式输入方式。

键盘规则：

- 焦点位于卡片托架区域时，`ArrowLeft` / `ArrowRight` 分别移动一格；
- 到达边界时不循环；
- 键盘触发与点击触发共享同一动画锁。

## 7. 阴影资产映射

所有现有阴影图均为与设计舞台对齐的 `1440 × 810` RGBA PNG，不得裁切、平移或二次增加 CSS 模糊。

### 7.1 源文件

```text
output/shadow-layers/
  rack-shadow.png                         # 所有非空卡片状态共用
  card-shadow.png                         # 五张卡片
  contact-shadow.png                      # 五张卡片
  by-card-count/
    1-card/card-shadow.png
    1-card/contact-shadow.png
    2-cards/card-shadow.png
    2-cards/contact-shadow.png
    3-cards/card-shadow.png
    3-cards/contact-shadow.png
    4-cards/card-shadow.png
    4-cards/contact-shadow.png
```

### 7.2 运行时目标目录

实现前复制到：

```text
public/display-archive/shadows/
  rack-shadow.png
  5-cards/card-shadow.png
  5-cards/contact-shadow.png
  4-cards/card-shadow.png
  4-cards/contact-shadow.png
  3-cards/card-shadow.png
  3-cards/contact-shadow.png
  2-cards/card-shadow.png
  2-cards/contact-shadow.png
  1-card/card-shadow.png
  1-card/contact-shadow.png
```

映射：

```ts
const visibleCount = Math.min(5, visibleEntries.length);

const getShadowAssets = (visibleCount: number) => {
  if (visibleCount === 0) return null;
  return {
    card: assetUrl(`display-archive/shadows/card-shadow-${visibleCount}.png`),
    contact: assetUrl(`display-archive/shadows/contact-shadow-${visibleCount}.png`),
  };
};
```

约束：

- `rack-shadow.png` 与卡片数量无关；
- 0 张时不渲染 `card-shadow` 和 `contact-shadow`；
- 1–4 张必须使用对应版本，不能继续显示五张阴影；
- 5 张版本来自父目录的 `card-shadow.png` 与 `contact-shadow.png`；
- PNG Alpha 已包含最终强度，CSS `opacity: 1`；
- 不能再叠加 `box-shadow` 或 `drop-shadow`，否则与 Figma 阴影重复。

## 8. 其他素材与导出要求

建议运行时目录：

```text
public/display-archive/
  background.png
  rack/
    rack-back.png
    rack-front.png
  cards/
    card-shell-01.png
    card-shell-02.png
    card-shell-03.png
    card-shell-04.png
    card-shell-05.png
  shadows/*
```

素材来源与要求：

| 运行时素材 | 当前来源 | 处理要求 |
| --- | --- | --- |
| 背景纹理 | `source-assets/display-archive/background.png` | 纯粉色纹理背景，由 CSS 填满固定舞台 |
| 白色托架 | `source-assets/display-archive/rack/` | 使用白色金属后架与前横梁的 `@2x` 透明图；金色雕花 `rack-layers.zip` 不属于本页面 |
| 五种卡片壳 | `source-assets/display-archive/cards/card-shell-01..05.png` | 已按左至右卡位保存为空壳；动态文字使用 DOM，翻页时数据更换卡位外观 |
| 现有 `card-01-transparent.png` 至 `card-05-transparent.png` | Downloads | 含示例编号、日期和正文，只用于视觉对照，不进入运行时 |
| 阴影 | `output/shadow-layers` | 按第 7 节复制，不重新缩放 |

五种卡片壳可以保留纸张、文件夹、布面、搭扣和轻微角度差异，但不能包含示例数据。若实现阶段暂时只有一张空白卡片壳，MVP 可以先复用同一壳体并通过固定 slot 的轻微旋转/纵向偏移还原层次；不得使用含 `NO.027` 等示例文字的图片冒充真实卡片。

所有图片：

- 通过 `assetUrl('display-archive/...')` 引用；
- 装饰图片使用 `alt=""`、`aria-hidden="true"`、`draggable="false"`；
- 不硬编码 `/letter/` 或域名；
- 透明素材优先保留 PNG；背景可转换为高质量 WebP；
- 完整设计稿只用于截图比对，不作为页面背景。

## 9. 1440 × 810 舞台与布局

### 9.1 固定桌面舞台

与现有相邻页面一致：

```css
.display-archive-page {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #d9b4ad;
}

.display-archive-stage {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  overflow: hidden;
  isolation: isolate;
  container-type: inline-size;
  color-scheme: only light;
}
```

- 基准坐标统一使用 `1440 × 810`；
- 页面整体等比缩放，不单独缩放 DOM 字体；
- 推荐使用 `cqw`，`1px = 0.069444cqw`；
- 非 16:9 桌面完整显示舞台并居中；
- 不使用 `cover` 裁掉托架、箭头或导航；
- 本轮不进行手机布局重排。

### 9.2 基准区域

以下为效果稿对应的实现基准，允许截图比对后进行 `±4px` 光学校正：

| 区域 | x | y | width | height | 说明 |
| --- | ---: | ---: | ---: | ---: | --- |
| 全舞台背景 | 0 | 0 | 1440 | 810 | 粉色纹理墙面 |
| 左侧月份导航 | 88 | 111 | 330 | 235 | 年份、竖线、月份节点 |
| 英文主标题 | 701 | 51 | 545 | 88 | `Collection • {Mode}` |
| 右侧模式导航 | 1145 | 97 | 205 | 252 | 三个固定模式与竖线 |
| 左箭头命中区 | 12 | 440 | 70 | 100 | 图形中心约 `y = 486` |
| 右箭头命中区 | 1358 | 440 | 70 | 100 | 图形中心约 `y = 486` |
| 卡片/托架场景 | 0 | 349 | 1440 | 294 | 五卡位、阴影和托架 |
| 空状态提示框 | 264 | 418 | 978 | 222 | 仅空状态显示 |

五个卡位视觉中心近似为：

```text
slot 0: x ≈ 203
slot 1: x ≈ 455
slot 2: x ≈ 704
slot 3: x ≈ 984
slot 4: x ≈ 1249
```

卡片高度、倾斜和顶部 y 值以最终空壳素材自身为准；卡片底部始终位于前横梁之后，不允许通过提高 z-index 穿到横梁前方。

## 10. 图层与组件结构

### 10.1 图层顺序

从后向前：

```text
DisplayArchivePage
└── DisplayArchiveStage
    ├── BackgroundImage
    ├── RackShadow
    ├── RackBack
    ├── CardTrack
    │   ├── CardShadowLayer
    │   ├── MemoryCard × 0–5
    │   └── ContactShadowLayer
    ├── RackMiddle
    ├── RackFront
    ├── EmptyState（仅空状态）
    ├── MonthNavigation
    ├── ModeNavigation
    ├── PageTitle
    └── PagingControls
```

推荐 z-index：

| z-index | 内容 |
| ---: | --- |
| `0` | 背景 |
| `10` | 托架投墙阴影 |
| `20` | 托架后层 |
| `30` | 卡片阴影 |
| `40` | 卡片和卡片内 DOM |
| `45` | 卡片与托架接触阴影 |
| `50` | 托架中层 |
| `60` | 托架前横梁，始终遮住卡片下部 |
| `70` | 空状态提示 |
| `80` | 标题、月份、模式与箭头 |
| `90` | focus-visible 轮廓与临时交互反馈 |

### 10.2 组件职责

| 组件 | 输入 | 职责 |
| --- | --- | --- |
| `DisplayArchivePage` | Store archive | 守卫、派生月份、持有 UI 状态、组织路由 |
| `ArchiveHeader` | `mode` | 英文标题与固定装饰圆点 |
| `MonthNavigation` | months, selected key | 真实月份渲染、选中态和月份切换 |
| `ModeNavigation` | mode | 三个固定模式、圆点位置和重复随机点击 |
| `ArchiveShelf` | visible entries, paging state | 托架分层、阴影映射、卡片窗口和键盘翻页 |
| `MemoryCard` | entry, slot index | 动态编号、日期、摘句、Hover 与点击抽起 |
| `PagingControls` | canLeft, canRight | 左右一格移动与动画锁 |
| `ArchiveEmptyState` | kind | 全馆藏为空或珍藏为空文案 |

## 11. Typography 与动态文本

项目已有本地字体：

```text
public/fonts/italianno-400.woff2
public/fonts/noto-serif-sc-400-700.woff2
```

展示页使用页面级变量，避免当前全局 `--font-serif-sc` 优先命中不同操作系统的宋体：

```css
.display-archive-stage {
  --archive-font-script: "Italianno", "Segoe Script", cursive;
  --archive-font-serif: "Noto Serif SC", "Songti SC", STSong, SimSun, serif;
}
```

字体基准：

| 元素 | Font | Weight | Size / line-height | 透明度/颜色 |
| --- | --- | ---: | --- | --- |
| `Collection • Mode` | Italianno | 400 | `100 / 100px` | 白色约 87% |
| 年份 `2026` | Italianno | 400 | `50 / 58px` | 白色约 87% |
| 英文月份 | Italianno | 400 | `50 / 60px` | 选中 100%，未选 60% |
| 中文月份 | Noto Serif SC | 400 | `32 / 50px` | 跟随月份选中态 |
| 选中模式 | Noto Serif SC | 400 | `50 / 64px` | 白色 100% |
| 未选模式 | Noto Serif SC | 400 | `30 / 50px` | 白色 60% |
| 卡片顶部编号/日期 | Noto Serif SC | 400 | `9 / 14px` | `#2f2a25` |
| `Collection No.` | Noto Serif SC | 400 | `8 / 13px` | `#2f2a25` |
| 卡片中央摘句 | Noto Serif SC | 500 | `21 / 34px` | `#211d1a` |
| 空状态文案 | Noto Serif SC | 400 | `50 / 72px` | 白色约 87% |

字号以 `1440 × 810` 舞台为准；卡片真实空壳导出后允许对卡片内字号做 `±2px` 校正。

卡片摘句：

```css
.archive-card-excerpt {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: pre-wrap;
}
```

不截断数据本身，不写回 Store，不生成省略后的新字段。

## 12. 月份导航交互

- 当前月份文字 100% 不透明度，节点圆点显示；
- 未选月份文字 60% 不透明度，不显示圆点；
- 整行月份文字和圆点共享一个 `<button>` 命中区；
- Hover/focus 时未选月份可提高至约 82%，但不提前出现选中圆点；
- 只有一个月份时仍显示该月份和圆点，竖线按单月份稿保持；
- 多月份只渲染真实存在月份；例如八月和十月有数据时不补九月；
- 左侧最多直接展示三个完整月份行；超过三个时该区域内部纵向滚动，并在切换后把当前月份滚入可见范围；
- 月份滚动不能带动固定舞台；
- 当前年份显示为月份所属年份。跨年选择 UI 不在 MVP，但数据层不能把年份写死为 `2026`。

## 13. 卡片 Hover、点击与详情衔接

### 13.1 Hover / focus

卡片是语义按钮：

```tsx
<button type="button" className="archive-memory-card" aria-label="查看 8月23日的馆藏 027">
  ...
</button>
```

Hover 或 `:focus-visible`：

- 卡片在前横梁后方向上移动约 `12px`；
- 阴影略增强只能通过独立交互阴影或现有阴影轻微位移实现，不能破坏静态数量阴影；
- 动画建议 `180ms ease-out`；
- 卡片仍低于 `rack-front` 图层；
- 不缩放到遮挡标题或月份导航。

### 13.2 点击抽起

点击有效卡片：

1. 设置 `liftingEntryId` 并锁定其他卡片、月份、模式和翻页；
2. 卡片继续向上抽出约 `28–36px`；
3. 抽出过程中仍由前横梁遮住卡片底部；
4. 约 `260ms` 后调用 `viewEntry(entry.id)`；
5. 导航到稳定详情路由 `/today-collection/:entryId`；
6. 不在展示页内继续使用旧占位详情弹窗。

导航应使用项目统一的 `startSoftFocusTransition()`；触发源为被点击卡片。卡片抽起和柔光覆盖可以有少量重叠，但不能先卸载卡片再播放抽起。

推荐：

```ts
startSoftFocusTransition({
  trigger: cardElement,
  to: `/today-collection/${entry.id}?from=archive`,
  beforeNavigate: () => viewEntry(entry.id),
});
```

`TodayCollectionPage` 通过 `from=archive` 区分展示页详情态：左侧只显示“← 返回馆藏”，右侧显示“擦亮并珍藏”。点击后调用原子 `polishAndTreasureEntry`：每次 `polishCount + 1`，首次同时写入 `favoritedAt`，后续保持原珍藏时间；MVP 不提供取消珍藏。

擦亮成功不使用页面柔焦转场，而是在当前详情卡片四周生成暖白、金色与浅粉光粒，沿不同延迟曲线向卡片中心汇聚，随后出现短暂光晕。`prefers-reduced-motion` 下缩短为轻量闪光。

## 14. 空状态

### 14.1 整个馆藏为空

条件：

```ts
archive.entryOrder.length === 0
```

表现：

- mode 保持 `timeline`；
- 标题为 `Collection • Timeline`；
- 右侧选中“时间线”；
- 左侧不生成月份节点；年份可显示当前年份，竖线仅为静态装饰且不可点击；
- 不显示卡片、托架卡片阴影、接触阴影和翻页箭头；
- MVP 使用已确认的大圆角提示框，不提供“开始记录”入口。

文案固定为：

```text
这里还没有馆藏
完成今天的记录后，
第一张卡片会出现在这里
```

### 14.2 当前月份没有珍藏卡片

条件：当前月份有馆藏，但 favorites 过滤结果为 0。

表现：

- 左侧保留当前月份及其选中圆点；
- 标题为 `Collection • Favorites`；
- 右侧选中“珍藏记忆”；
- 不显示卡片和翻页箭头；
- MVP 使用已确认的大圆角提示框，不把提示语做成托架卡片；
- 空状态中间不要求保留托架。

文案固定为：

```text
这里还没有珍贵记忆
擦亮一张卡片后，它会被珍藏在这里
```

`random` 不产生独立空状态：全馆藏为空时复用第 14.1 节；只要月份存在，随机模式至少有一张卡片。

## 15. 状态变化时的窗口复位

| 事件 | 结果 |
| --- | --- |
| 初次进入页面 | 最新月份、timeline、最新五张 |
| 点击其他月份 | 保持 mode；timeline/favorites 定位最新五张，random 重洗牌并从 0 开始 |
| timeline → favorites | 当前月不变；过滤后定位最新五张 |
| timeline/favorites → random | 当前月不变；生成随机顺序，从 0 开始 |
| random 中再次点击 random | 当前月不变；重新洗牌，从 0 开始 |
| random → timeline/favorites | 丢弃随机顺序，按目标规则定位 |
| 收藏状态在详情页变化后返回 | 重新从 Store 读取；若 favorites 当前窗口越界，clamp 到新的 `maxWindowStart` |
| 当前选中月份数据消失 | 选择剩余数据中的最新月份；若无数据则进入全空状态 |

## 16. 可访问性

- 页面使用唯一 `h1`，其可读文本为当前模式中文名；英文花体标题可设为视觉文本并使用 `aria-hidden="true"`；
- 月份和模式使用真实 `<button>`，并通过 `aria-current="true"` 或 `aria-pressed` 表达选中；
- 左右箭头使用 `<button aria-label="查看更早的卡片">` / `<button aria-label="查看更晚的卡片">`；
- 不能用只有 `div` 和点击事件的透明热区；
- 卡片按钮的 `aria-label` 包含日期和馆藏编号；
- 装饰图片、阴影和竖线不进入可访问性树；
- 卡片托架区域可获得焦点并支持左右方向键；
- focus-visible 轮廓不得被 `overflow: hidden` 完全裁掉；
- 页面切换月份或模式后，通过低打扰 live region 宣布“2026年8月，时间线，共 8 张卡片”；
- 动画运行时使用 `aria-busy="true"`；
- reduced motion 下取消抽顿和大幅抽起，保留状态变化与导航语义。

## 17. 文件改造范围

实现阶段预计涉及：

```text
src/pages/DisplayArchivePage.tsx                  # 替换占位实现
src/pages/DisplayArchivePage.css                  # 新增
src/store/useRecordStore.ts                       # 新增 polishAndTreasureEntry
src/utils/archiveDisplay.ts                       # 推荐新增：月份、排序、洗牌纯函数
public/display-archive/background.png             # 新增
public/display-archive/rack/rack-*@2x.png          # 新增
public/display-archive/cards/card-shell-*.png      # 新增，必须为空壳
public/display-archive/shadows/**/*                # 从 output 复制
docs/display-archive-frontend-spec.md              # 本文
docs/README.md                                     # 文档索引同步
docs/zustand-store-design.md                       # 若新增原子擦亮珍藏 action 则同步
```

不需要新增第三方轮播、日期或随机库。使用原生 `Date`、数组排序、Fisher–Yates 和 CSS 动画即可。

## 18. 推荐实现顺序

1. 准备 `public/display-archive` 运行时素材，确认所有图层为共同 `1440 × 810` 画布；
2. 归档并接入五张无示例文字的卡片空壳；
3. 增加月份分组、稳定排序、珍藏筛选和洗牌纯函数；
4. 用新结构替换 `DisplayArchivePage` 占位内容；
5. 完成固定舞台、背景、托架和图层遮挡；
6. 完成左侧月份、右侧模式和动态英文标题；
7. 完成五卡位窗口与数量阴影映射；
8. 完成左右一格抽顿翻页及键盘操作；
9. 完成卡片 Hover、抽起和详情路由衔接；
10. 完成两个空状态；
11. 若详情页同期实现，增加原子 `polishAndTreasureEntry` 并同步 Store 文档；
12. 进行字体加载、1440×810 截图、边界数据、lint 和 build 验收。

## 19. 验收标准

### 19.1 数据与月份

- [ ] 页面只读取已归档 `MemoryEntry`，不读取 draft；
- [ ] 月份按本地时区分组；
- [ ] 只显示有馆藏的月份，不补空月份；
- [ ] 默认选择最新有数据月份；
- [ ] 当前月份 100% 不透明度并显示圆点；
- [ ] 未选月份 60% 不透明度且无圆点；
- [ ] 点击月份只切换月份，不自动改变 mode；
- [ ] 翻到月份末尾不会自动跨月。

### 19.2 三种模式

- [ ] 时间线按 `createdAt` 从左到右升序；
- [ ] 时间戳相同仍有稳定顺序；
- [ ] 随机模式只随机当前月份；
- [ ] 首次进入、重复点击随机模式和切换月份都会重新洗牌；
- [ ] 珍藏模式只显示 `favoritedAt !== null`；
- [ ] 三个模式共用同一托架和卡位布局；
- [ ] 英文标题分别为 Timeline、Random、Favorites，`Favorites` 使用复数。

### 19.3 卡位与阴影

- [ ] 1–4 张占用最左侧前 N 个固定卡位，不居中；
- [ ] 不足五张时使用对应数量的 card/contact shadow；
- [ ] 五张使用父目录生成的五张阴影；
- [ ] 0 张没有遗留卡片阴影；
- [ ] rack shadow 与数量无关并保持对齐；
- [ ] 卡片底部始终被前横梁遮挡；
- [ ] 所有阴影 CSS opacity 为 1，没有重复 box-shadow。

### 19.4 翻页与动画

- [ ] 只有当前集合超过五张时显示翻页控件；
- [ ] 每次只移动一个卡位；
- [ ] 边界不循环、不越界；
- [ ] 快速连点不会并发多个动画；
- [ ] 动画具有轻微过冲和回落吸附；
- [ ] 左右方向键与按钮行为一致；
- [ ] reduced motion 下没有明显抽顿或大幅位移。

### 19.5 卡片内容与详情

- [ ] 编号、日期、Collection 标签和摘句全部为真实 DOM；
- [ ] 不显示示例图中的固定 `NO.027` 等数据；
- [ ] 卡片中央来自 `recordText`，初始约显示两行，超出后可在卡片内滚动；
- [ ] Hover 卡片只在横梁后方上升；
- [ ] 点击后先产生抽起反馈，再进入稳定 ID 详情路由；
- [ ] 从展示页打开条目只增加一次 `viewCount`；
- [ ] 展示页详情提供“← 返回馆藏”和“擦亮并珍藏”；
- [ ] 首次擦亮同时珍藏，重复擦亮只累加且不会取消珍藏；
- [ ] 擦亮成功播放光粒向卡片汇聚的独立动画；
- [ ] 旧占位详情弹窗已移除。

### 19.6 空状态

- [ ] 整个 archive 为空时显示“这里还没有馆藏”；
- [ ] 全空状态没有月份节点、卡片阴影和箭头；
- [ ] 当前月份无珍藏时保留月份选中态并选中 Favorites；
- [ ] 珍藏空状态使用确认文案；
- [ ] MVP 空状态不显示“开始记录”入口；
- [ ] 空状态提示不是可点击卡片。

### 19.7 视觉与工程

- [ ] 使用 `1440 × 810` 固定比例舞台，桌面窗口等比缩放；
- [ ] `Italianno` 和 `Noto Serif SC` 从本地 WOFF2 成功加载；
- [ ] 页面中文明确优先使用 `Noto Serif SC`，不受系统宋体差异影响；
- [ ] public 素材全部通过 `assetUrl()` 引用；
- [ ] 没有硬编码 `/letter/`；
- [ ] 完整效果图未被用作运行时背景；
- [ ] 1440×810、1920×1080、16:10 和超宽桌面完成截图比对；
- [ ] `npm run lint` 通过；
- [ ] `npm run build` 通过；
- [ ] 控制台无资源 404、字体错误、重复 key 或状态更新警告。
