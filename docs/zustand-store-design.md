# Zustand 草稿与积极记忆档案设计

## 设计目标

应用只使用 `useRecordStore` 一个 Zustand Store。Store 保存需要在刷新后恢复的用户业务数据：一份未完成草稿 `draft` 和多条已完成记忆 `archive`。页面模式、弹窗、加载、展开状态与动画等瞬时 UI 状态使用 React 本地 state。

## 数据模型

- `ReflectionDraft`：保存记录文本、稳定框架 ID、首次框架来源、当前三道候选题、已看框架与分框架问题历史、选中问题 ID、所选卡片视觉变体、回答和开始时间。同一时间只存在一份。
- `MemoryEntry`：归档时复制用户当时看到的完整问题，并保存查看、擦亮和收藏行为数据。
- `ArchiveState`：`entriesById` 用于按 ID 访问，`entryOrder` 保存新记忆在前的时间线顺序。

`FrameworkId` 只允许 `framework1` 至 `framework5`。本地模型返回值在页面边界通过 `isFrameworkId` 校验，非法值使用本地 fallback。框架元数据和完整题库位于 `src/data/reflectionQuestions.ts`；`src/services/llmServices.ts` 只负责 Qwen 框架识别适配。

`QuestionCardVariant` 只允许 `pink | green | blue`。它表达用户点击时的视觉槽位：候选题数组下标 `0 / 1 / 2` 分别对应粉 / 绿 / 蓝卡片。该下标不是题库编号，稳定问题 ID 与颜色不固定绑定。

## 业务操作

- `beginDraft` 只在没有草稿时创建完整草稿，不静默覆盖。
- `updateDraft` 仅合并指定字段，没有草稿时不创建残缺数据。
- `setInitialQuestionSet` 原子写入首次框架、题组、来源和浏览历史。
- `refreshQuestionsInCurrentFramework` 与 `switchQuestionFramework` 分别处理同框架换题和换角度，并清空旧选择但保留回答。
- `selectQuestion` 校验问题属于当前候选集、卡片变体与当前槽位一致，并在一次 `set` 中原子写入 `selectedQuestionId` 与 `selectedCardVariant`。
- `commitDraft` 验证所有必填数据，在一次 `set` 中写入新记忆、将 ID 放到时间线开头并清空草稿。
- `viewEntry`、`polishEntry` 和 `toggleFavorite` 仅更新各自负责的行为字段。

信封等级由 `getEnvelopeLevel(polishCount)` 动态计算。时间线和高光列表由 selector 计算；高光顺序为收藏、擦亮次数、最近擦亮时间、创建时间。`selectedCardVariant` 只属于未完成草稿的跨页选择上下文；`MemoryEntry` 不归档颜色，也不保存其他派生视觉字段。

## 跨路由动画

`AppLayout` 是回答页和展示页的常驻父级，用本地 `crystallizing` state 挂载 `CrystallizeOverlay`。回答页通过 Outlet Context 调用 `startCrystallizing()` 后跳转，因此动画不会在子路由切换时中断，刷新后也不会恢复播放状态。

## 持久化

Zustand Persist 使用 key `zenflow-record-storage-v2`，`partialize` 仅保留 `draft` 和 `archive`。自定义 `merge` 会补齐旧草稿的浏览历史，把旧 `questionSource: 'ai'` 规范化为 `initialFrameworkSource: 'qwen'`，并在旧草稿已有选中问题时根据其当前候选槽位补出 `selectedCardVariant`。开发阶段不读取更早的 `user-record-storage`。
