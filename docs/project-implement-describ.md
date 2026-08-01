# 一、应用拆解的模块(容器)与子组件概述
整个应用基于“私人信件博物馆”的场景化交互与嵌套路由架构。底层依然保留已验证的数据流组件，上层包裹全新的视觉隐喻组件：

## 1. InitializationPage (首页场景容器)
  - **核心机制**：采用“多状态背景图 + 透明交互热区（Hotspot）”的场景驱动模式。
  - **子状态**：
    - State 0 (Idle)：默认全景，展示左侧拱门与右侧书桌双空间。
    - State 1 (Focus Record)：点击书桌热区，触发记录空间流转。
    - State 2 (Focus Archive)：点击拱门热区，触发展厅空间流转。
  - **独立渲染层**：背景墙面文本作为独立 DOM 层绝对定位渲染，不烘焙入图片。

## 2. RecordEntryPage (记录容器)
  - **视觉包装组件**：`InPlaceLetter`（控制信纸原地展开、背景虚化的动画包装层）。
  - **核心功能组件**：
    - `TextInputArea`（文本输入区，样式调整为透明无边框以融入信纸）。
    - `ActionSubmitButton`（提交按钮，承载写入 Zustand 的动作，视觉可隐喻为蜡封或折角）。
  - **核心逻辑**：拦截热区点击后执行展开动效，底层依然稳定捕获表单数据并全局存储。

## 3. QuestionSelectionPage (问题生成与选择容器)
  - **视觉包装组件**：`BackgroundQuote`（原始记录的缩小背板）、`TarotEnvelopeList`（负责控制信封扇形排布与飞入动效的布局容器）。
  - **核心功能组件**：
    - `ThinkingLoader`（AI 思考时的加载态组件）。
    - `QuestionCard`（单条问题卡片，置于信封容器内，依然负责选中/未选中状态的切换与单选逻辑）。
    - `ActionSubmitButton`（确认选择按钮）。
  - **核心逻辑**：请求本地大模型服务；支持无感知降级至本地 Fallback 默认问题集；选中后平滑过渡至回答页。

## 4. QuestionAnswerPage (问题回答容器)
  - **视觉包装组件**：`UnifiedLetterSheet`（提供“左右双面翻开”形态的统一信纸布局容器）。
  - **核心功能组件**：
    - `ContextViewer`（置于信纸左/上半区，展示原始记录与被选中的 AI 提问）。
    - `ResponseEditor`（置于信纸右/下半区，用户最终回答输入区）。
    - `ActionSubmitButton`（提交按钮）。
  - **核心逻辑**：回答直接写入当前草稿。提交时通过一次 `commitDraft()` 原子归档，再调用 Outlet Context 中的 `startCrystallizing()` 并跳转至展示归档页。

## 5. DisplayArchivePage (存储与展示容器)
  - **视图组件（按回味模式划分）**：
    - `TimelineView`（时间线陈列：横向滚动架构）。
    - `FeaturedView`（精选回味：聚光灯展台架构）。
    - `RandomSavorView`（盲盒拾遗：处理长按物理阻尼交互的散落信件架构）。
  - **核心功能组件**：`ResultCard`（结构化展示整个梳理流程的最终结果，作为上述三个视图底层通用的数据渲染卡片）。

# 二、全局状态管理 (Zustand)
应用只使用 `useRecordStore`，且仅存储需要刷新后恢复的业务数据：
- **当前草稿**：`draft`，包含原始记录、稳定框架 ID、候选问题、选中问题和回答。
- **积极记忆档案**：`archive.entriesById` 按 ID 保存多条记忆，`archive.entryOrder` 保存时间线顺序。
- **业务 actions**：草稿创建、更新、选题、重置、原子归档，以及记忆的查看、擦亮和收藏。

页面模式、弹窗、加载、展开、偶遇结果和动画阶段等瞬时 UI 不进入 Zustand。时间线、高光顺序和信封等级由 selector 或纯函数动态计算。

# 三、页面跳转与路由架构
- 使用 `react-router-dom` 框架。
- 采用**嵌套路由架构**：顶级挂载 `<AppLayout />`。`<AppLayout />` 内部包含用于页面切换的 `<Outlet />` 以及全局常驻的 `<CrystallizeOverlay />` 动画覆盖层，以保证跨页面跳转时动画的独立与连贯。

# 四、数据持久化的方式
- **开发阶段 V2**：使用 Zustand Persist 与 `zenflow-record-storage-v2`，`partialize` 仅持久化 `draft` 和 `archive`。
- **旧数据**：旧 key `user-record-storage` 不再读取，本阶段不提供 `version`、`migrate` 或旧数据转换。
- **动画**：`crystallizing` 改为常驻 `AppLayout` 的本地 state，回答页通过 Outlet Context 启动，既能跨子路由继续播放，又不会被持久化。
