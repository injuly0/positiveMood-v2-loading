# 问题选择页前端功能 Spec

## 1. 目标与范围

问题选择页围绕用户刚刚记录的内容，展示一个认知重构框架下的三道深思问题，并提供两种探索操作：

- **换一组问题**：框架不变，从当前框架本地题库中重新抽取三道题。
- **换一个深思的角度**：前端选择本轮尚未看过的新框架，再从该框架本地题库中抽取三道题。

两个按钮均不请求 Qwen。Qwen 只在用户首次提交记录时调用一次，并只返回 `framework1` 至 `framework5` 中的一个框架 ID。

## 2. 数据来源

题库位于 `src/data/reflectionQuestions.ts`，共包含：

- 5 个框架；
- 每个框架 9 道问题；
- 共 45 道问题；
- 每道问题具有稳定 ID，例如 `framework1-q01`。

题库文字中的 `[这件事]` 是内容占位符。当前 MVP 没有事件摘要能力，抽题时统一展示为“这件事”，不把用户整段原始记录直接插入问题。

## 3. 状态边界

### 3.1 Zustand 持久业务状态

`ReflectionDraft` 保存：

```ts
interface ReflectionDraft {
  id: string
  recordText: string
  frameworkId: FrameworkId | null
  candidateQuestions: QuestionItem[]
  initialFrameworkSource?: 'qwen' | 'fallback' | null
  selectedQuestionId: string | null
  selectedCardVariant: 'pink' | 'green' | 'blue' | null
  answerText: string
  seenFrameworkIds: FrameworkId[]
  seenQuestionIdsByFramework: Partial<Record<FrameworkId, string[]>>
  startedAt: number
}
```

其中：

- `frameworkId` 和 `candidateQuestions` 表示当前页面正在展示的内容，而不是用户最终选中后才保存的内容。
- `initialFrameworkSource` 只记录首次框架来自 Qwen 还是前端 fallback；两个换题按钮不会修改它。
- `selectedQuestionId` 与 `selectedCardVariant` 共同描述用户当前选择，并作为跨页面上下文持久化。
- `seenFrameworkIds` 记录当前框架轮次已经看过的框架。
- `seenQuestionIdsByFramework` 分框架记录当前问题轮次已经展示过的问题。
- `answerText` 在选择不同问题、换一组问题或换框架时均保留。

Store 继续通过 `zenflow-record-storage-v2` 持久化 `draft` 和 `archive`。自定义 `merge` 会为旧缓存规范化来源并补齐浏览历史与卡片变体：

- 旧草稿已有框架时，将该框架加入 `seenFrameworkIds`；
- 旧草稿已有候选题时，将候选题 ID 写入对应框架历史；
- 旧 `questionSource: 'ai'` 转换为 `initialFrameworkSource: 'qwen'`；
- 旧草稿已有选中问题但没有颜色时，按该问题在当前候选数组中的槽位推导卡片变体；
- 没有旧草稿时维持 `draft: null`。

### 3.2 视觉槽位映射

`candidateQuestions` 的数组下标表示本次渲染的卡片槽位，而不是固定问题编号：

| 当前候选题下标 | 页面卡片序号 | 卡片变体 |
|---|---:|---|
| `0` | 1 | `pink`（粉色） |
| `1` | 2 | `green`（绿色） |
| `2` | 3 | `blue`（蓝色） |

稳定问题 ID（例如 `framework2-q03`）每次抽题后都可能出现在任一槽位，因此问题 ID 与颜色不存在永久绑定。粉、绿、蓝的素材、纹理透明度、层级和旋转信息统一由 `src/data/questionCardVariants.ts` 的 `QUESTION_CARD_CONFIGS` 提供，问题选择页与后续页面复用同一配置。

### 3.3 React 页面瞬时状态

问题选择页本地保存：

```ts
activeCard: 1 | 2 | 3 | null
shuffleMode: 'questions' | 'framework' | null
swapPhase: 'idle' | 'leaving' | 'entering'
```

这些状态只控制 hover、按钮锁定和换卡动画，不写入 localStorage，也不在刷新后恢复。

## 4. 首次进入数据流

```text
用户提交原始记录
  → 前端调用 Qwen 框架识别接口
  → 校验返回值必须是 framework1～framework5
  → 非法返回或请求失败时随机选择 fallback 框架
  → 从对应本地题库随机抽取三道题
  → setInitialQuestionSet 原子写入 Zustand
  → 完成柔光转场并进入问题选择页
```

`setInitialQuestionSet` 同时写入：

- 当前框架；
- 当前三道题；
- 框架来源；
- 初始框架历史；
- 初始问题历史；
- `selectedQuestionId: null`；
- `selectedCardVariant: null`。

## 5. 换一组问题

### 5.1 行为

1. 当前三张卡片开始离场动画。
2. 从 `seenQuestionIdsByFramework[currentFrameworkId]` 读取本轮历史。
3. 优先从当前框架未看过的问题中随机抽取三道。
4. 通过 `refreshQuestionsInCurrentFramework` 原子写入新题组。
5. 同时清空 `selectedQuestionId` 与 `selectedCardVariant`，保留 `answerText`。
6. 新卡片执行入场动画。

### 5.2 问题轮次耗尽

当当前框架剩余未看问题不足三道时：

- 开启该框架的新一轮问题浏览；
- 优先排除当前屏幕上的三道题；
- 随机抽取新的三道题；
- 将新题组作为新一轮 `seenQuestionIds` 的起点。

在每框架 9 道题的情况下，一轮内可连续展示三组互不重复的问题。

## 6. 换一个深思的角度

### 6.1 行为

1. 当前三张卡片开始离场动画。
2. 从五个框架中排除当前框架和本轮已看框架。
3. 从剩余框架中随机选择一个。
4. 从新框架题库中抽取三道题。
5. 通过 `switchQuestionFramework` 同时写入新框架、新题组和浏览历史。
6. 同时清空 `selectedQuestionId` 与 `selectedCardVariant`，保留 `answerText`。
7. 新卡片执行入场动画。

### 6.2 框架轮次耗尽

五个框架全部看过以后：

- 开启新一轮；
- 将当前框架作为新一轮起点；
- 从另外四个框架中随机选择，避免立即重复当前框架。

## 7. 选择问题与回答保留

用户点击问题卡片时：

- 根据当前候选题槽位取得卡片变体；
- 在同一次 `selectQuestion(questionId, cardVariant)` 写入中更新 `selectedQuestionId` 与 `selectedCardVariant`；
- 不改变 `answerText`；
- 通过现有柔光转场进入回答页。

例如，`framework2-q03` 当前位于下标 `0` 的粉色槽位时：

```text
点击粉色卡片
  → selectedQuestionId = framework2-q03
  → selectedCardVariant = pink
  → 进入回答页
```

用户从回答页返回后，无论选择另一道当前问题、换题组还是换框架，已经填写的回答都保留。归档时，最终保存的是“最后选中的问题 + 当前回答”。

## 8. 换卡动画与可访问性

换卡阶段为：

```text
idle → leaving（180ms）→ 写入 Zustand → entering（360ms）→ idle
```

- 非 `idle` 阶段禁用两个换题按钮，避免并发操作。
- 非 `idle` 阶段禁止打开问题卡片。
- `role="status"` 向读屏器播报正在换角度或换问题。
- `prefers-reduced-motion: reduce` 下缩短动画并取消错峰延迟。

## 9. 原子 Store action

本功能使用四个语义 action：

```ts
setInitialQuestionSet(...)
refreshQuestionsInCurrentFramework(...)
switchQuestionFramework(...)
selectQuestion(questionId, cardVariant)
```

页面不得通过多次通用 `updateDraft()` 分步修改框架和问题，避免出现“新框架 + 旧问题”的中间状态。

## 10. 验收标准

- 首次进入时，当前框架和三道问题已存在于 Zustand，刷新页面可恢复。
- 当前三道题 ID 唯一，且全部属于当前框架。
- 连续点击“换一组问题”，框架 ID 不变。
- 同一问题轮次内不重复问题；耗尽后不立即重复当前三题。
- 连续点击“换一个深思的角度”，一轮内不重复框架。
- 五个框架耗尽后开启新一轮，且不会立即返回当前框架。
- 每个候选槽位始终映射到正确的粉、绿、蓝卡片，但稳定问题 ID 不与颜色固定绑定。
- 点击卡片后，问题 ID 与该槽位对应的卡片变体在一次 store 写入中同时保存，刷新后可恢复。
- 换题和换框架后 `selectedQuestionId`、`selectedCardVariant` 均为空。
- 换题、换框架、重新选择问题均不清空 `answerText`。
- 换卡动画期间按钮不可重复触发。
- Qwen 请求次数不因两个换题按钮增加。
