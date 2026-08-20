# QuestionAnswerPage 设计方案

> 状态：历史稿，已由 [`question-answer-frontend-spec.md`](question-answer-frontend-spec.md) 取代，不再作为当前实现依据。

## 一、架构决策

| 决策点 | 方案 |
|---|---|
| 展示方式 | **原始记录在上、选中问题在下**，对照着看 |
| 返回机制 | 提供"返回重新选问题"链接，跳回 `/question-selection` |
| 引导文案 | 按框架提供默认 placeholder，后期可配置 |
| 提交后动画 | 结晶动画提升到 **父 Layout 覆盖层**，跨路由平滑过渡 |
| 动画策略 | 动画在 Layout 中，提交后立即 navigate，覆盖层独立播放 |
| 空数据守卫 | `selectedQuestion === null` 时重定向回 `/question-selection` |

---

## 二、组件树

```
QuestionAnswerPage
├── StepIndicator                  ← 步骤指示（"2. 反思" 阶段提示）
├── ContextViewer
│   ├── FrameworkTag               ← 框架标签（如 "逆境重评与复原力"）
│   ├── RecordQuote                ← 展示用户原始记录文本（带折叠/展开）
│   └── SelectedQuestionCard       ← 放大展示用户选中的问题
├── ResponseEditor
│   ├── PromptHint                 ← 引导文案（按框架不同）
│   ├── TextArea                   ← 用户书写区
│   └── CharCounter                ← 字数提示（非强制，仅感知引导）
└── ActionArea
    ├── BackLink                   ← "← 重新选一个问题" 跳回 /question-selection
    └── SubmitButton               ← "生成我的反思" → 触发结晶动画

Layout（父级，常驻）
└── CrystallizeOverlay             ← 结晶粒子动画覆盖层（应用级，跨路由）
```

### 子组件职责边界

| 组件 | 职责 | Props |
|---|---|---|
| `ContextViewer` | 展示原始记录 + 选中问题 | `recordText`, `framework`, `selectedQuestion` |
| `ResponseEditor` | 文本输入区 + 引导文案 | `value`, `onChange`, `placeholder` |
| `ActionArea` | 提交 / 返回按钮 | `onSubmit`, `onBack`, `disabled` |
| `CrystallizeOverlay` | 粒子结晶动画（Layout 层） | `onDone: () => void` |

---

## 三、数据流

### 页面挂载

```
挂载
├─ 从 store 读取：recordText, framework, selectedQuestion
├─ 守卫：selectedQuestion === null → redirect /question-selection
├─ 拒绝：recordText === '' → redirect /record（没有原始记录）
│
├─ 展示 ContextViewer
│   ├─ 框架标签（如 "逆境重评与复原力"）
│   ├─ 原始记录（默认展开/可折叠）
│   └─ 选中问题（大字展示）
│
└─ ResponseEditor 等待用户输入
```

### 用户交互

```
用户输入回答
├─ 点击 "← 重新选一个问题"
│   └─ navigate('/question-selection')
│       （QuestionSelectionPage 从 store 恢复状态）
│
└─ 点击 "生成我的反思"
    ├─ 写入 store：userAnswer, answeredAt
    ├─ store.setCrystallizing(true)       ← 开启 Layout 覆盖层动画
    ├─ navigate('/display-archive')       ← 立即跳转，不等动画
    └─ 覆盖层动画（Layout 中独立播放，总时长 2s）
        ├─ Phase 1 (0.2s)：回答页面内容淡出
        ├─ Phase 2 (1.2s)：粒子汇聚成光球
        ├─ Phase 3 (0.3s)：光球扩散为白屏
        └─ Phase 4 (0.3s)：白屏渐隐，信念之树浮现
             └─ onDone → store.setCrystallizing(false)
```

### 状态机

```
[writing] ──输入文字──▶ 文本编辑中
    │
    ├── 点击返回 ──▶ navigate /question-selection
    │
    └── 点击提交 ──▶ [submitting]
                      │
                      ├── 写入 store（userAnswer）
                      ├── 触发 Layout 结晶动画
                      └── navigate /display-archive
```

---

## 四、Zustand Store 扩展

```typescript
interface RecordState {
  // ... 现有字段 ...

  // QuestionAnswer 阶段新增
  userAnswer: string;
  setUserAnswer: (answer: string) => void;
  answeredAt: number | null;
  setAnsweredAt: (ts: number) => void;

  // 结晶动画信号（Layout 消费）
  crystallizing: boolean;
  setCrystallizing: (v: boolean) => void;
}
```

---

## 五、结晶动画：Layout 覆盖层方案

### 为什么放在 Layout

- 动画需要跨路由平滑过渡（QA → DA），放在父组件避免 navigate 时动画被截断
- Layout 常驻，覆盖层独立管理自己的生命周期
- 无需 setTimeout 精确协调路由切换时机

### 时序

```
QA提交 ──navigate──▶ DA挂载（白屏覆盖层还在）
                        │
    覆盖层动画（2.0s 总时长）
    ├─ 0.0s  粒子开始
    ├─ 0.2s  内容淡出完成（QA已卸载）
    ├─ 1.4s  粒子汇聚成球
    ├─ 1.7s  白屏扩散，覆盖全场
    └─ 2.0s  白屏渐隐，树浮现 → onDone → 关闭覆盖层
```

### 实现骨架

```tsx
// AppLayout.tsx
function AppLayout() {
  const crystallizing = useRecordStore(s => s.crystallizing);
  const setCrystallizing = useRecordStore(s => s.setCrystallizing);

  return (
    <div className="app-layout">
      <Outlet />
      {crystallizing && (
        <CrystallizeOverlay onDone={() => setCrystallizing(false)} />
      )}
    </div>
  );
}
```

```tsx
// QuestionAnswerPage.tsx — 提交
const handleSubmit = () => {
  store.setUserAnswer(text);
  store.setAnsweredAt(Date.now());
  store.setCrystallizing(true);
  navigate('/display-archive');
};
```

### DisplayArchivePage 挂载时的衔接

```css
.da-page {
  background: #fff;  /* 与覆盖层白屏终点一致 */
}
.da-content {
  opacity: 0;
  animation: fadeInTree 0.8s 0.15s forwards;
}
@keyframes fadeInTree {
  to { opacity: 1; }
}
```

---

## 六、引导文案（按框架）

```typescript
const FRAMEWORK_PLACEHOLDERS: Record<string, string> = {
  resilience: "回顾那个最想放弃的瞬间，写下你想对自己说的话…",
  strength:   "用一个画面或一段对话，描述你展现出的那份力量…",
  meaning:    "那个瞬间，你内心真正被满足的是什么…",
  gratitude:  "这份温暖从哪里来，带你去到了哪里…",
  savoring:   "闭上眼睛，让那个画面再次浮现，写下你的感受…",
};
```

> **待定**：具体文案内容需进一步斟酌，但结构已预留，基于 framework 名称做映射，后期可轻易替换。

---

## 七、路由结构变更

在引入父 Layout 后，路由改为嵌套结构：

```
/ (Layout)
  ├── /                 → InitializationPage
  ├── /record           → RecordEntryPage
  ├── /question-selection → QuestionSelectionPage
  ├── /question-answer   → QuestionAnswerPage
  └── /display-archive   → DisplayArchivePage
```

---

## 八、涉及的文件

```
改动：
  src/store/useRecordStore.ts            ← 新增 userAnswer, answeredAt, crystallizing
  src/App.tsx                            ← 路由改为嵌套 Layout 结构
  src/pages/QuestionAnswerPage.tsx       ← 核心实现
  src/pages/QuestionAnswerPage.css       ← 新增

新建：
  src/components/AppLayout/              ← 父 Layout + CrystallizeOverlay
  src/pages/DisplayArchivePage.tsx       ← 占位（后续实现）
  docs/question-answer-page-design/      ← 本设计文档
```

---

## 九、边界情况处理

| 场景 | 处理 |
|---|---|
| 直接访问 `/question-answer`，无 `selectedQuestion` | 重定向 `/question-selection` |
| 直接访问 `/question-answer`，无 `recordText` | 重定向 `/record` |
| 用户刷新页面（store 有 persist） | 正常恢复，可继续回答 |
| 提交时网络中断 | 不影响，提交是纯本地操作（已存 store） |
| 动画进行中用户关闭页面 | 无副作用，下次打开 store 中已有 answer |
