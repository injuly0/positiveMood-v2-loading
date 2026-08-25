# 问题回答页前端 Spec

> 状态：当前已确认，作为 `QuestionAnswerPage` 后续视觉改造与功能验收的实现依据。  
> 最终设计稿：`设计中-问题回答页 (2).png`，原始画布 `2880 × 1620`。  
> 前端基准舞台：`1440 × 810`，即设计稿按 `50%` 等比换算。  
> 本文覆盖页面视觉、素材、交互、状态、路由和转场；提交后的今日入馆页以 `today-collection-frontend-spec.md` 为准，归档展示页的视觉不在本文范围内。

## 1. 页面目标与已确认语义

问题回答页位于“写下原始记录”和“收藏为记忆”之间。用户已经完成原始记录、选择了一道反思问题，现在需要沿着问题重新理解刚刚写下的经历，形成一次积极心理学中的顿悟实践。

页面三块核心内容的语义固定为：

- 左上“选择的问题”：展示用户在上一页最终选中的问题。
- 左下“刚刚写下的”：展示用户的原始记录正文 `draft.recordText`，不是回答预览。
- 右侧“写下回答”：编辑针对所选问题的新回答 `draft.answerText`。

问题卡片必须延续问题选择页的视觉槽位颜色：

- 选中粉色卡片，回答页左上问题卡片显示粉色；
- 选中绿色卡片，回答页左上问题卡片显示绿色；
- 选中蓝色卡片，回答页左上问题卡片显示蓝色。

颜色由既有 `draft.selectedCardVariant` 驱动，不能根据问题 ID、框架 ID或进入次数重新推导。这样用户点击的卡片会在新场景中保持连续，而不是变回统一白色卡片。

本页不展示以下旧方案元素：

- 心理框架标签；
- “反思书写”步骤标签；
- 原始记录折叠按钮；
- 可见字数统计；
- 独立保存状态；
- 紫色渐变背景或紫色实心提交按钮。

## 2. 素材清单与资源约定

实施时把用户提供的素材复制到：

```text
public/question-answer/
  background.png
  lace-frame.png
  brass-rack.png
  question-card-base.png
```

素材来源及校验值：

| 目标文件 | 来源文件 | 画布尺寸 | 非透明内容边界 | 用途 |
| --- | --- | ---: | --- | --- |
| `background.png` | `背景图.png` | `1440 × 810` | 全画布 | 完整室内背景与桌面 |
| `lace-frame.png` | `蕾丝包边.png` | `702 × 545` | `(3, 8)–(702, 533)` | 右侧蕾丝包边 |
| `brass-rack.png` | `背景-压暗缩小的黄铜托架.png` | `312 × 253` | `(18, 13)–(296, 250)` | 右后方装饰托架 |
| `question-card-base.png` | `卡片固定样式 (2).png` | `940 × 485` | `(0, 44)–(940, 484)` | 左上问题卡片基础纹理 |

补充约束：

- `question-card-base.png` 已烘焙纸张纹理、分割线、装饰字母和竖排 `Question`，不得用 DOM 重画这些元素。
- 卡片中的具体问题文字必须是 DOM 文本，不能再次烘焙进图片。
- `lace-frame.png` 的最大内部透明开口约为 `(109, 113)–(593, 412)`，对应 `484 × 299`；回答纸张与输入区必须放在蕾丝下方，不能覆盖蕾丝边缘。
- 左下原始记录纸张和蕾丝内部回答纸张使用 CSS 暖白半透明复合底，不复用带有 `Question` 装饰的卡片素材。
- 所有图片在 TSX 中通过 `assetUrl('question-answer/...')` 引用，不得硬编码 `/letter/` 或域名根路径。
- 装饰图片使用空 `alt`、`aria-hidden="true"`、`draggable="false"` 和 `pointer-events: none`。

示意：

```ts
const ASSET_ROOT = assetUrl('question-answer');

const ANSWER_ASSETS = {
  background: `${ASSET_ROOT}/background.png`,
  lace: `${ASSET_ROOT}/lace-frame.png`,
  brassRack: `${ASSET_ROOT}/brass-rack.png`,
  questionCard: `${ASSET_ROOT}/question-card-base.png`,
};
```

## 3. 舞台与响应式策略

### 3.1 固定 16:9 舞台

回答页沿用问题选择页的舞台策略：

```css
.qa-page {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #251911;
}

.qa-stage {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  overflow: hidden;
  isolation: isolate;
  container-type: inline-size;
  color-scheme: only light;
}
```

- 设计和验收坐标统一使用 `1440 × 810`。
- 实现建议像问题选择页一样使用 `cqw`；换算公式为 `1px = 0.069444cqw`。
- 背景、图片和 DOM 交互层基于同一舞台整体缩放，不能各自使用 viewport 坐标导致漂移。
- 背景图固定在舞台 `(0, 0)`，尺寸 `1440 × 810`，使用 `object-fit: fill`；因为素材比例与舞台一致，不会发生拉伸失真。
- 非 16:9 视口中完整舞台居中显示，剩余区域使用深棕色留边。
- 本轮不设计手机竖屏重排；竖屏仍等比缩放完整舞台，不改变左右叙事关系。

### 3.2 基准坐标

下表中的坐标来自最终设计稿按 `50%` 换算；允许在实现截图对照时进行 `±3px` 的光学校正，但不得改变整体构图。

| 元素 | x | y | width | height | 说明 |
| --- | ---: | ---: | ---: | ---: | --- |
| 背景图 | 0 | 0 | 1440 | 810 | 全舞台 |
| 左侧标题“选择的问题” | 91 | 93 | 240 | 48 | DOM 标题 |
| “← 重新选择” | 410 | 127 | 106 | 28 | DOM 按钮 |
| 问题卡片素材画布 | 91 | 143 | 424 | 219 | 包含顶部透明区 |
| 问题卡片可见纸面 | 91 | 163 | 424 | 198 | 颜色层作用范围 |
| 问题正文视口 | 204 | 207 | 276 | 130 | DOM 文本，可滚动 |
| 左侧标题“刚刚写下的” | 91 | 421 | 260 | 48 | DOM 标题 |
| 原始记录外层纸张 | 91 | 500 | 422 | 197 | CSS 复合底 |
| 原始记录内层纸面 | 113 | 518 | 378 | 159 | CSS 低对比内层 |
| 原始记录滚动视口 | 133 | 543 | 338 | 119 | 只读正文 |
| 右侧标题“写下回答” | 738 | 92 | 230 | 48 | DOM 标题 |
| 标题下分隔线 | 738 | 163 | 450 | 1 | CSS 线条 |
| 黄铜托架素材 | 1210 | 350 | 312 | 253 | 允许超出舞台右边并裁切 |
| 蕾丝素材 | 633 | 191 | 702 | 545 | 按素材原尺寸使用 |
| 蕾丝内部纸面 | 742 | 304 | 484 | 299 | 位于蕾丝下层 |
| 回答编辑器视觉面板 | 759 | 322 | 445 | 250 | 位于透明开口内 |
| “→ 收藏这份回答” | 1166 | 718 | 154 | 30 | 文本型提交按钮 |

## 4. 图层与组件结构

### 4.1 图层顺序

从后向前：

```text
QuestionAnswerPage
└── AnswerStage
    ├── BackgroundImage
    ├── BrassRackDecoration
    ├── SelectedQuestionSection
    │   ├── SectionTitle
    │   ├── ReselectButton
    │   └── SelectedQuestionCard
    │       ├── CardTintLayer
    │       ├── CardBaseImage
    │       └── QuestionText
    ├── OriginalRecordSection
    │   ├── SectionTitle
    │   └── RecordPaper
    │       └── RecordScrollViewport
    └── AnswerSection
        ├── SectionTitle
        ├── TitleRule
        ├── AnswerPaperBacking
        ├── LaceFrameImage
        ├── AnswerTextarea
        └── SubmitButton
```

推荐层级：

| 层级 | 内容 |
| ---: | --- |
| `0` | 背景图 |
| `10` | 黄铜托架 |
| `20` | 左侧纸张、卡片颜色底层、蕾丝内部纸面 |
| `30` | 问题卡片基础素材、蕾丝素材 |
| `40` | 问题、原始记录和回答文字 |
| `50` | 标题、重新选择和提交按钮 |

黄铜托架必须位于蕾丝后方；蕾丝必须覆盖回答纸张边缘；输入区不能盖住缝线和褶边。

### 4.2 组件职责

| 组件 | 输入 | 职责 |
| --- | --- | --- |
| `SelectedQuestionCard` | `question`, `variant` | 卡片颜色、基础素材和问题文字 |
| `OriginalRecordViewer` | `recordText` | 只读展示原始记录并处理内部滚动 |
| `AnswerEditor` | `value`, `onChange`, `placeholder` | 编辑回答、内部滚动和空白引导 |
| `AnswerActions` | `canSubmit`, `onReselect`, `onSubmit` | 返回选题与提交归档 |

可以先写在一个页面文件中，但 DOM 职责和类名应保持上述边界，避免把卡片颜色、业务提交和输入框滚动混在同一个元素上。

## 5. 所选问题卡片与三色延续

### 5.1 数据来源

```ts
const selectedQuestion = draft?.candidateQuestions.find(
  (question) => question.id === draft.selectedQuestionId,
);

const variant = draft?.selectedCardVariant;
```

`variant` 只允许：

```ts
type QuestionCardVariant = 'pink' | 'green' | 'blue';
```

回答页不得按候选题当前数组下标再次计算颜色。页面刷新后也必须使用持久化的 `selectedCardVariant` 恢复同一颜色。

### 5.2 颜色值

以现有问题选择页三张纸张素材的中位色作为回答页颜色基准：

| variant | 颜色 | 选题页目标观感 | 回答页底层补偿色 |
| --- | --- | --- | --- |
| `pink` | 低饱和粉棕 | `#dcc4c1` | `#d9bfc0` |
| `green` | 低饱和灰绿 | `#c7ceb4` | `#beccaf` |
| `blue` | 低饱和灰蓝 | `#c1ced0` | `#b6ccd3` |

底层补偿色不是新的视觉规范。它用于抵消上层暖白基础素材在 `opacity: 0.38` 下带来的偏暖与提亮，使浏览器合成后的纸张中心色接近“选题页目标观感”列。

### 5.3 叠色方式

`question-card-base.png` 自身带半透明纸张纹理。如果原图保持 `opacity: 1`，暖白纸面会再次把底色洗浅，因此实现时使用同一个隔离 wrapper，并按以下顺序合成：

1. 最底层放不透明的纯色 `CardTintLayer`；
2. 颜色层只覆盖源素材非透明纸面对应区域，即缩放后的 `y ≈ 20px` 至底部；
3. 其上覆盖原始 `question-card-base.png`，元素级 `opacity` 固定约为 `0.38`；
4. 该透明度让底色成为主色，同时保留原图中的纹理、分割线和装饰字母；
5. 最上层放 DOM 问题文字。

不要使用 `hue-rotate()` 或混合模式临时猜色，不要保持基础素材 `opacity: 1`，不要替换或重画素材中已烘焙的 `Question`、分割线与装饰字母，也不要让颜色层延伸到素材顶部透明区。

三种颜色只改变色相，不改变卡片尺寸、位置、旋转或问题排版。

### 5.4 问题文字

- 使用 `Noto Serif SC` Regular。
- 参考字号 `18px`、行高 `34px`、颜色 `rgb(75 64 56 / 62%)`。
- 保留题库原文，不插入框架名或序号。
- 使用 `white-space: pre-wrap; overflow-wrap: anywhere; text-wrap: pretty`。
- 超出固定视口时在问题文字区域内部纵向滚动，不能撑大卡片或裁切为省略号。
- 卡片素材中的装饰文字属于图片；读屏只读取一次 DOM 问题正文。

## 6. 原始记录区

“刚刚写下的”固定读取：

```ts
draft.recordText
```

规则：

- 只读，不允许在回答页修改原始记录。
- 默认从正文顶部开始显示。
- 保留用户换行，使用 `white-space: pre-wrap`。
- 长内容只在 `RecordScrollViewport` 内纵向滚动。
- 不折叠、不使用省略号、不自动截取摘要。
- 用户返回问题选择页再回来时，正文内容不变；滚动位置属于页面瞬时状态，无需持久化。
- 外层纸张使用暖白半透明复合底、轻微圆角和低对比内层，不增加高对比描边或明显投影。

建议文字样式：

```text
Font family: Noto Serif SC
Weight: 400
Font size: 16px
Line height: 34px
Color: #4b4038
```

## 7. 回答编辑器

### 7.1 空白引导语

正式 placeholder 固定为：

```text
顺着这个问题，再回头看一眼刚刚写下的事。
留意此刻新出现的感受、联系或理解，
从最先浮现的那句话开始写
```

代码中保留明确换行：

```ts
const ANSWER_PLACEHOLDER =
  '顺着这个问题，再回头看一眼刚刚写下的事。\n'
  + '留意此刻新出现的感受、联系或理解，\n'
  + '从最先浮现的那句话开始写';
```

规则：

- placeholder 只在 `answerText === ''` 时出现，不作为输入框初始值，也不写入 Store。
- 用户输入第一个字符后自然消失；清空回答后重新出现。
- placeholder 和真实回答使用相同排版，placeholder 仅降低颜色不透明度。
- 不追加“请回答”“开始输入”等功能性文案。

### 7.2 输入行为

- 使用受控 `<textarea>`，值为 `draft.answerText`。
- 页面有效挂载后自动聚焦 textarea；若已有回答，把光标放在现有回答末尾，并使用 `preventScroll` 保持舞台位置不变。
- `onChange` 调用 `updateDraft({ answerText: event.target.value })`，继续由 Zustand Persist 恢复草稿。
- 不设置产品层面的字符上限。
- 保留换行；长内容仅在编辑器内部纵向滚动。
- 禁止用户拖拽改变尺寸：`resize: none`。
- 隐藏浏览器默认边框和背景，焦点态使用低对比暖色内描边或光晕。
- 自动聚焦后必须立即显示可辨识的暖色内描边、轻微亮底和输入光标，使右侧区域明确区别于问题卡片与原始记录卡片。
- 不显示可见字数统计和保存状态。
- 用户从回答页返回选题页后，当前 `answerText` 必须保留；选择另一道题再次进入时仍保留，由用户自行继续修改。

建议文字样式：

```text
Font family: Noto Serif SC
Weight: 400
Font size: 20px
Line height: 34px
Text color: #4b4038
Placeholder color: rgb(75 64 56 / 52%)
Horizontal padding: 24px
Vertical padding: 20px
```

输入区必须有不可见但可访问的标签，例如：

```tsx
<label className="sr-only" htmlFor="qa-answer">写下回答</label>
```

## 8. 页面交互

### 8.1 重新选择

点击“← 重新选择”时：

1. 不清空 `answerText`；
2. 不清空当前 `selectedQuestionId` 和 `selectedCardVariant`；
3. 使用现有 `startSoftFocusTransition`，从按钮中心发出柔光；
4. 在覆盖峰值切换到 `/question-selection`；
5. 问题选择页恢复当前三张卡片和已选状态。

用户在问题选择页改选另一张卡片后，`selectQuestion(questionId, cardVariant)` 必须原子更新问题与颜色；再次进入回答页时，左上卡片同时更新问题正文和颜色，已有回答继续保留。

### 8.2 收藏回答

提交按钮文案固定为：

```text
→ 收藏这份回答
```

启用条件：

```ts
const canSubmit = Boolean(draft.answerText.trim());
```

空白或只有空格时按钮处于禁用状态。禁用状态仍保留原位置和文字，但降低不透明度，不显示额外错误。

有效提交顺序：

```text
点击收藏
  → 设置本次提交运行锁
  → 从“收藏这份回答”按钮中心启动统一柔焦转场
  → 柔光完全覆盖旧页
  → commitDraft() 原子创建 MemoryEntry、分配编号并清空 draft
  → replace 到 `/today-collection/${createdEntryId}`
  → 柔光淡出，揭示今日入馆页
```

约束：

- `commitDraft()` 返回 `null` 时不导航，释放提交锁，并让已覆盖的柔光原地淡出。
- 提交运行中忽略连续点击，不能创建重复档案。
- 必须在启动转场前设置 `isSubmittingRef`；`commitDraft()` 只在覆盖峰值执行，避免旧页在柔光扩张期间因 draft 清空而消失。
- 提交成功后复用项目统一柔焦转场，不再播放紫色结晶覆盖层。
- 归档仍保存问题正文和回答正文，但不归档 `selectedCardVariant`；颜色只属于未完成草稿的跨页选择上下文。
- `commitDraft()` 同时按 `today-collection-frontend-spec.md` 原子分配永久 `collectionNumber`；今日入馆页通过路由 ID 读取已创建条目，不从已清空的 draft 取值。

### 8.3 按钮视觉

两个操作都是无底色文字按钮：

- `重新选择`：`Noto Sans SC 500 18/28`，暖白色；
- `收藏这份回答`：`Noto Sans SC 500 18/30`，白色；
- 不增加胶囊背景、实心色块或高对比边框；
- hover / focus 时使用轻微暖色提亮和柔和文字阴影；
- focus-visible 必须有可辨识轮廓，不能只靠颜色变化；
- active 只允许 `1–2px` 的轻微位移，不改变布局。

## 9. 数据流与守卫

本功能不新增 Zustand 持久字段，继续使用现有 `ReflectionDraft`：

| 页面内容 | 数据来源 |
| --- | --- |
| 左下原始记录 | `draft.recordText` |
| 当前框架 | `draft.frameworkId`，只用于校验与归档，不显示 |
| 所选问题 | `candidateQuestions` 中匹配 `selectedQuestionId` 的项 |
| 卡片颜色 | `draft.selectedCardVariant` |
| 右侧回答 | `draft.answerText` |

页面挂载守卫：

```text
没有 draft 或 recordText 为空
  → replace 到 /record

有原始记录，但 frameworkId、selectedQuestion 或 selectedCardVariant 缺失
  → replace 到 /question-selection

全部存在
  → 渲染回答页
```

守卫未通过时返回 `null`，避免残缺页面闪现。成功提交后的同一渲染周期必须由 `isSubmittingRef` 跳过守卫。

旧缓存的颜色补齐继续由 Store 的 `normalizeDraft()` 负责；页面不自行修复不一致数据。

## 10. Typography 与视觉样式

| 元素 | Font | Weight | Size / line-height | Color |
| --- | --- | ---: | --- | --- |
| “选择的问题” | Noto Serif SC | 700 | `32 / 48px` | `#f2e4e4` |
| “写下回答” | Noto Serif SC | 700 | `32 / 48px` | `#f2e4e4` |
| “刚刚写下的” | Noto Serif SC | 700 | `32 / 48px` | `rgb(242 228 228 / 70%)` |
| 重新选择 | Noto Sans SC | 500 | `18 / 28px` | `#ffffff` |
| 所选问题 | Noto Serif SC | 400 | `18 / 34px` | `rgb(75 64 56 / 62%)` |
| 原始记录 | Noto Serif SC | 400 | `16 / 34px` | `#4b4038` |
| 回答正文 | Noto Serif SC | 400 | `20 / 34px` | `#4b4038` |
| 回答 placeholder | Noto Serif SC | 400 | `20 / 34px` | `rgb(75 64 56 / 52%)` |
| 收藏按钮 | Noto Sans SC | 500 | `18 / 30px` | `#ffffff` |

其他样式：

- 右侧标题分隔线使用 `rgb(242 228 228 / 82%)`，高度 `1px`。
- 原始记录纸张和回答纸张使用暖白、低透明度、低对比圆角；不使用冷灰或纯白表单底。
- 滚动条使用细暖棕色 thumb 和透明 track。
- 所有页面文字禁止受系统深色模式自动反色。
- 标题和功能文字必须是 DOM，不得合并进背景图。

## 11. 动画与可访问性

### 11.1 动画

- 问题选择页进入回答页：复用统一柔光聚焦转场。
- 回答页返回问题选择页：复用统一柔光聚焦转场，光源为“重新选择”按钮中心。
- 回答页提交到今日入馆页：复用统一柔焦转场，光源为“收藏这份回答”按钮中心。
- `prefers-reduced-motion: reduce` 下，所有上述柔光转场均使用统一规范的缩短时间线。

### 11.2 可访问性

- DOM 顺序建议为：重新选择按钮 → 所选问题 → 原始记录 → 回答输入 → 收藏按钮。
- 页面主标题可由“写下回答”担任唯一 `h1`；“选择的问题”“刚刚写下的”使用 `h2`。
- 问题正文与原始记录使用语义文本，不把图片中的装饰文字作为内容。
- 原始记录滚动区可获得键盘焦点，并提供 `aria-label="刚刚写下的原始记录"`。
- textarea 提供真实 label，不依赖 placeholder 充当标签。
- 禁用提交按钮使用原生 `disabled`。
- 装饰图片不进入读屏顺序。
- 转场期间通过现有运行锁阻止底层重复交互；覆盖层不接收焦点。

## 12. 文件改造范围

实施本 Spec 时预计涉及：

```text
新增素材：
  public/question-answer/background.png
  public/question-answer/lace-frame.png
  public/question-answer/brass-rack.png
  public/question-answer/question-card-base.png

重构：
  src/pages/QuestionAnswerPage.tsx
  src/pages/QuestionAnswerPage.css

复用：
  src/components/WarmLightTransition/WarmLightTransitionLayer.tsx
  src/components/WarmLightTransition/WarmLightTransitionLayer.css
```

不应修改：

- `/letter/` 部署前缀；
- 当前路由逻辑路径；
- 题库内容与 Qwen 调用边界；
- `ReflectionDraft` 和 `MemoryEntry` 的持久字段；
- 问题选择页粉 / 绿 / 蓝槽位映射。

## 13. 验收标准

### 13.1 素材与构图

- [ ] 页面使用 `1440 × 810` 16:9 舞台并整体等比缩放。
- [ ] 背景图完整铺满舞台，无拉伸、裁切或白边。
- [ ] 蕾丝按 `702 × 545` 原尺寸位于约 `(633, 191)`。
- [ ] 黄铜托架位于蕾丝后方，超出舞台右边的部分自然裁切。
- [ ] 卡片基础素材未被裁掉顶部透明区，纸面约从 `y=163` 开始可见。
- [ ] 标题、问题、原始记录、回答和操作按钮均为 DOM。
- [ ] 左下原始记录纸张和蕾丝内部纸张未误用带 `Question` 装饰的素材。

### 13.2 内容语义

- [ ] 左上显示当前选中的问题。
- [ ] 左下显示原始记录 `recordText`，不是 `answerText`。
- [ ] 右侧编辑和显示 `answerText`。
- [ ] 页面不显示框架标签、步骤标签、字数统计或保存状态。
- [ ] placeholder 与本文确认文案逐字一致，并保留三行换行。
- [ ] placeholder 不会被写入 Store 或归档。

### 13.3 卡片连续性

- [ ] 从粉色卡片进入时，回答页卡片为粉色。
- [ ] 从绿色卡片进入时，回答页卡片为绿色。
- [ ] 从蓝色卡片进入时，回答页卡片为蓝色。
- [ ] 刷新回答页后颜色保持不变。
- [ ] 返回并改选另一张卡片后，问题正文和颜色一起更新。
- [ ] 三色只改变颜色，不改变回答页卡片的固定尺寸、纹理和装饰。

### 13.4 文本与滚动

- [ ] 长问题只在问题正文视口内部滚动，不撑大卡片。
- [ ] 长原始记录只在左下纸张内部滚动，不溢出页面。
- [ ] 长回答只在蕾丝内部编辑区滚动，不覆盖缝线、标题或按钮。
- [ ] 三处正文均保留换行，并可通过键盘滚动。
- [ ] textarea 不可拖拽改变尺寸。
- [ ] 页面进入后 textarea 自动获得焦点，已有回答时光标位于末尾。
- [ ] 聚焦状态有明确但克制的暖色描边和光晕，可以一眼识别为输入区。

### 13.5 返回、提交与守卫

- [ ] 点击“重新选择”使用柔光转场返回问题选择页。
- [ ] 返回、换题、换框架或重新选择均不清空已有回答。
- [ ] 空回答和纯空格回答不能提交。
- [ ] 有效提交只创建一个档案并只导航一次。
- [ ] 提交从按钮中心启动统一柔焦转场，不再出现紫色结晶。
- [ ] 直接访问且无原始记录时重定向到 `/record`。
- [ ] 有原始记录但缺少有效问题或颜色时重定向到 `/question-selection`。
- [ ] 成功提交清空草稿时不会被守卫错误重定向。

### 13.6 工程检查

- [ ] 新素材在 TSX 中全部通过 `assetUrl()` 引用。
- [ ] 未硬编码 `/letter/`、域名或根路径静态资源 URL。
- [ ] `npm run lint` 通过。
- [ ] `npm run build` 通过。
- [ ] 生产构建后 `/letter/question-answer` 可直接访问和刷新。
