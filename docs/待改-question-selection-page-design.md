# QuestionSelectionPage 设计方案

## 一、架构决策

| 决策点 | 方案 |
|---|---|
| 选择模式 | **单选**，一次选一个问题进行深度反思 |
| 数据存放 | **Zustand store** 扩展，下游页面可复用 |
| 后续路由 | 选完后跳转到 `/question-answer` |
| 回退 | 暂不允许回退，路径单向 |
| 加载态 | "思考中"动画（呼应禅意/呼吸感 UI 理念） |
| AI 失败降级 | 展示**随机框架的默认问题集**，用户无感知降级 |

---

## 二、组件树

```
QuestionSelectionPage
├── ThinkingLoader                ← AI 调用期间展示，加载完成后卸载
├── FrameworkBanner               ← 展示 AI 识别出的分类框架
├── QuestionCardList
│   └── QuestionCard × N          ← 每个卡片：问题文本 + 选中/未选中状态切换
└── ActionArea
    └── 确认按钮                   ← 至少选中一个问题后才可点击
```

### 子组件职责

| 组件 | 职责 | 边界 |
|---|---|---|
| `ThinkingLoader` | 纯展示组件，优雅的加载动画 | 无业务逻辑，通过 `visible` prop 控制显隐 |
| `FrameworkBanner` | 展示框架名称 + 简短心理学说明 | 接收 `framework` 字符串 |
| `QuestionCard` | 单条问题卡片 + 选中态切换 | 接收 `question: { id, text }` + `selected: boolean` + `onSelect` |
| `ActionArea` | 确认按钮 | 接收 `disabled` + `onConfirm` |

---

## 三、数据流

```
页面挂载
  ├─ 从 store 读取 recordText
  ├─ 调用 fetchQuestionFromLLM(text)
  │    ├─ 成功 → 获取 { framework, questions[] }
  │    └─ 失败 → 降级：随机返回一个框架的默认问题集
  ├─ loading 态展示 ThinkingLoader 动画
  └─ 数据就绪 → 展示 FrameworkBanner + QuestionCard 列表

用户交互
  ├─ 点击 QuestionCard → 单选高亮（取消上一个、选中当前）
  └─ 点击"确认"按钮
       ├─ 将 framework + 选中问题 写入 Zustand
       └─ navigate('/question-answer')
```

---

## 四、状态机

```
[loading] ──(AI 返回)──▶ [loaded: 展示框架 + 问题卡片]
                      └──(AI 失败)──▶ [loaded + 降级: 展示默认问题]
                                         │
                                    [选中问题] ──▶ button enabled
                                         │
                                    [点击确认] ──▶ 存入 store → 跳转
```

---

## 五、Zustand Store 扩展

```typescript
interface QuestionItem {
  id: string;
  text: string;
}

// 在现有 RecordState 基础上新增：
framework: string | null;          // AI 识别的框架名
questions: QuestionItem[];         // 返回的所有问题
selectedQuestion: QuestionItem | null;  // 用户选中的问题（单选）
```

```typescript
// 新增 actions：
setFramework: (framework: string) => void;
setQuestions: (questions: QuestionItem[]) => void;
setSelectedQuestion: (question: QuestionItem) => void;
```

---

## 六、Fallback 默认问题集

AI 调用失败时，从五个框架中随机抽取一个框架的完整问题列表。

### 框架一：逆境重评与复原力 (Resilience & Overcoming)
- 为了达成这件事，你支付了极大的精力成本。现在回头看，在这个过程中你"赚"到了什么以前没有的经验或力量？
- 在处理这件事的过程中，哪一个瞬间你最想放弃，但最后是什么微小的念头让你咬牙挺过来了？
- 搞定这件事绝不仅仅是运气好。如果必须归功于你自身的一个特质，你觉得是什么在起作用？

### 框架二：内在力量与优势确立 (Strength Spotting)
- 如果用一个词来命名你今天在这件事中展现出来的超能力，你会叫它什么？
- 如果你的好朋友做到了这件事，你会怎么真诚地夸奖他/她？现在，请把这句话送给自己。
- 在做这件事的时候，你做对了哪一个极其关键、但别人可能注意不到的决定？

### 框架三：意义建构与价值对齐 (Meaning-Making)
- 抛开外界的眼光，这件事发生时，它恰好满足了你内心深处的哪一种渴望？
- 如果五年后的你回看今天这件事的这个瞬间，你觉得它在你的人生拼图里代表着哪一种颜色或哪一块？
- 在看似寻常的一天里，这件事是如何让你感觉到"我还活着，而且活得还不错"的？

### 框架四：感恩与联结 (Gratitude & Relational)
- 在这件事背后，这个世界（或者某个具体的人）为你提供了怎样隐秘而温柔的支撑？
- 面对这份来自外界的馈赠，你身体的哪个部分感觉到了最直接的放松或温暖？
- 这份美好如果可以分享给一个人，你脑海中第一个浮现的是谁？为什么？

### 框架五：纯粹品味与心流延展 (Savoring)
- 如果要把这件事发生的瞬间拍成一张照片，你觉得画面里最亮眼的地方是什么？
- 这个瞬间让你的身体产生了怎样的感觉？试着用三个身体感受的词语来描述它。
- 如果这种感觉是一种颜色、一种声音或一种气味，它会是什么？

---

## 七、涉及的文件

```
改动：
  src/store/useRecordStore.ts          ← 扩展：framework、questions、selectedQuestion
  src/services/llmServices.ts          ← 扩展：失败降级 + 每个框架的默认问题集
  src/pages/QuestionSelectionPage.tsx  ← 核心实现
  src/App.tsx                          ← 追加 /question-answer 路由占位

新建：
  src/pages/QuestionSelectionPage.css  ← 页面样式
  src/components/ThinkingLoader/       ← 加载动画组件 + 样式
```

---

## 八、关键交互规则

1. **单选**：同一时间仅高亮一个问题卡片，点击另一个时自动取消上一个
2. **确认按钮**：未选中任何问题时置灰禁用，选中后启用
3. **降级无感知**：AI 失败时用户看到的是正常的框架+问题列表，仅在最低处有一行小字提示"已为你准备通用反思问题"
4. **loading 动效**：不低于 1.5s（即使 API 秒回也要展示完整动画，保证"思考中"的仪式感）
