# Zustand 数据流与业务动作笔记

## 这篇笔记解决什么问题

这篇文档用业务语言解释当前项目的数据结构和数据流转，帮助回答以下问题：

- 用户从“写下一件事”到“收藏这份回答”，数据经历了什么？
- `draft`、`MemoryEntry`、`archive`、`commitDraft` 分别是什么？
- 每个 Zustand action 对应哪个用户动作，会修改哪些数据？
- 哪些数据刷新后还在，哪些只是当前页面的临时状态？
- 设计归档展示页之前，现有数据已经支持什么，还缺什么？

本篇是便于理解和记忆的业务笔记；字段和 action 的正式约束以 [`zustand-store-design.md`](zustand-store-design.md) 与当前代码为准。

## 一句话理解整个数据流

> 用户的一次练习先以 `draft` 的形式放在“书桌上”；点击提交后，`commitDraft()` 把它整理成一条 `MemoryEntry` 放进 `archive`，然后清空书桌；Zustand Persist 再自动把 `draft` 和 `archive` 保存到浏览器。

这里的 `commit` 不是 Git commit，`entry` 也不是页面入口：

- `commitDraft`：正式收存当前草稿。
- `MemoryEntry`：一条已经完成的记忆档案。

## 一、应用中有三类状态

### 1. 业务状态：Zustand Store

```text
useRecordStore
├─ draft                         当前唯一一份未完成练习
└─ archive                       所有已完成的记忆档案
   ├─ entriesById                按 ID 保存档案正文
   └─ entryOrder                 档案的时间线顺序
```

这些状态会影响多个页面，也需要在刷新后恢复，所以放在 Zustand。

### 2. 瞬时 UI 状态：React 本地 state / ref / 路由 state

例如：

- 柔焦转场是否正在播放。
- 展示页当前处于“回顾 / 高光 / 偶遇”哪个模式。
- 当前打开了哪条档案的详情弹窗。
- 本次跳转刚刚创建的是哪个 entry。
- 回答页是否正处在提交过程中。

这些状态只服务当前界面，不属于用户的长期业务数据，因此不写进 Zustand Persist，刷新后可以消失。

### 3. 浏览器持久化：Zustand Persist

Persist 是 Zustand 的自动存盘机制，不是第三个数据仓库，也没有一个单独叫 `persist` 的业务对象。

```text
页面调用 action
    ↓
Zustand 中的 draft / archive 改变
    ↓
Persist 自动序列化
    ↓
写入浏览器 localStorage
```

当前 key 是：

```text
zenflow-record-storage-v2
```

只持久化：

```ts
{
  draft,
  archive,
}
```

## 二、三个核心数据结构

### `ReflectionDraft`：一次正在进行的练习

`draft` 不是单纯的“回答草稿”，而是用户从记录页开始的整段练习上下文。同一时间只允许存在一份。

```ts
interface ReflectionDraft {
  id: string;

  // 用户在记录页写下的原始事件
  recordText: string;

  // 当前积极心理学框架
  frameworkId: FrameworkId | null;

  // 当前呈现的三道候选问题
  candidateQuestions: QuestionItem[];

  // 首次框架来自 Qwen 还是本地 fallback
  initialFrameworkSource?: 'qwen' | 'fallback' | null;

  // 用户最终选择的问题
  selectedQuestionId: string | null;

  // 选中问题所在的粉 / 绿 / 蓝卡片槽位
  selectedCardVariant: 'pink' | 'green' | 'blue' | null;

  // 用户正在填写的回答
  answerText: string;

  // 防止换题和换角度时过快重复的浏览历史
  seenFrameworkIds: FrameworkId[];
  seenQuestionIdsByFramework: Partial<Record<FrameworkId, string[]>>;

  // 本次练习开始时间
  startedAt: number;
}
```

示例：

```ts
draft = {
  id: 'draft-001',
  recordText: '今天完成这件事时，我一直觉得很烦。',
  frameworkId: 'framework2',
  candidateQuestions: [questionA, questionB, questionC],
  initialFrameworkSource: 'qwen',
  selectedQuestionId: 'framework2-q05',
  selectedCardVariant: 'blue',
  answerText: '虽然很烦，但我还是完成了最困难的部分。',
  seenFrameworkIds: ['framework2'],
  seenQuestionIdsByFramework: {
    framework2: ['framework2-q01', 'framework2-q02', 'framework2-q05'],
  },
  startedAt: 1787120000000,
};
```

### `MemoryEntry`：一条已经完成的记忆档案

`MemoryEntry` 是“完成态”的数据结构。它只保存未来回顾这份记忆需要的核心结果，不保存完整选择过程。

```ts
interface MemoryEntry {
  id: string;
  recordText: string;
  frameworkId: FrameworkId;
  question: QuestionItem;
  answerText: string;
  createdAt: number;

  // 展示页行为数据
  viewCount: number;
  lastViewedAt: number | null;
  polishCount: number;
  lastPolishedAt: number | null;
  favoritedAt: number | null;
}
```

归档时的数据取舍：

| Draft 中的数据 | 是否进入 MemoryEntry | 原因 |
| --- | --- | --- |
| `recordText` | 是 | 保留事情本身 |
| `frameworkId` | 是 | 支持框架标签和后续分类 |
| 三道 `candidateQuestions` | 否 | 它们只是选择过程 |
| 最终选中的完整 `question` | 是 | 保存用户实际回答的问题快照 |
| `answerText` | 是 | 保存顿悟回答 |
| `selectedCardVariant` | 当前否 | 目前被视为草稿阶段视觉信息 |
| 浏览历史 | 否 | 只用于换题去重 |
| `startedAt` | 否 | 档案只记录完成时间 `createdAt` |

注意：因为 `selectedCardVariant` 当前没有归档，提交并清空 draft 后，展示页无法知道这道问题原来位于粉、绿还是蓝色卡片上。

### `ArchiveState`：档案柜

```ts
interface ArchiveState {
  entriesById: Record<string, MemoryEntry>;
  entryOrder: string[];
}
```

示例：

```ts
archive = {
  entriesById: {
    'entry-b': { /* 最新档案 */ },
    'entry-a': { /* 较早档案 */ },
  },
  entryOrder: ['entry-b', 'entry-a'],
};
```

- `entriesById` 负责快速按 ID 找到完整内容。
- `entryOrder` 负责规定时间线顺序。
- 新 entry 会放在 `entryOrder` 最前面，所以“回顾”默认最新在前。

## 三、完整业务数据流

```text
记录页：写下原始事件
    ↓ saveRecordText
创建或更新 draft.recordText
    ↓
识别积极心理学框架，并准备三道问题
    ↓ setInitialQuestionSet
写入 frameworkId、candidateQuestions 和浏览历史
    ↓
问题选择页：换一组 / 换角度（可选）
    ↓ refreshQuestionsInCurrentFramework / switchQuestionFramework
替换候选问题并清空旧选择
    ↓
用户点击一道问题
    ↓ selectQuestion
写入 selectedQuestionId 和 selectedCardVariant
    ↓
问题回答页：用户输入回答
    ↓ updateDraft
持续更新 draft.answerText
    ↓
用户点击“收藏这份回答”
    ↓ commitDraft
生成 MemoryEntry + 写入 archive + 清空 draft
    ↓
Persist 自动把新状态写入 localStorage
    ↓
统一柔焦覆盖后归档，并跳转今日入馆页
```

## 四、每个业务 action 在做什么

### 记录阶段

#### `saveRecordText(recordText)`

当前记录页实际使用的自动保存 action。

业务含义：保存用户在记录页写下的原始事件。

- 没有 draft 且文本非空：创建一份新 draft。
- 已有 draft、但尚未进入选题反思阶段：更新 `draft.recordText`。
- 已经有框架、问题、选择或回答：拒绝从记录页静默覆盖这份 draft。

最后一条保护避免用户回到记录页时，不小心把已经进入反思阶段的练习正文覆盖掉。

#### `beginDraft(recordText)`

业务含义：显式开始一份新草稿。

- 文本为空时不创建。
- 已有 draft 时不覆盖。
- 当前页面流程没有直接调用它，属于 Store 暴露的基础能力；记录页目前主要使用 `saveRecordText`。

#### `resetDraft()`

业务含义：放弃当前未完成练习，清空书桌。

```ts
draft = null;
```

这是有数据损失意义的动作，页面应在需要覆盖已有草稿时先征得用户确认。

### 首次问题准备

#### `setInitialQuestionSet(frameworkId, questions, source, seenQuestionIds)`

业务含义：原始记录提交后，保存第一次识别出的框架和三道问题。

它会：

- 校验必须恰好有三道合法且 ID 不重复的问题。
- 写入 `frameworkId`。
- 写入三道 `candidateQuestions`。
- 记录来源是 `qwen` 还是 `fallback`。
- 初始化已看框架和已看问题历史。
- 清空旧的 `selectedQuestionId` 与 `selectedCardVariant`。

### 选题阶段

#### `refreshQuestionsInCurrentFramework(questions, seenQuestionIds)`

对应用户动作：“换一组问题”。

- 框架不变。
- 替换当前三道问题。
- 更新当前框架下的已看问题历史。
- 清空旧问题选择和旧卡片颜色。
- 当前实现不会清空 `answerText`。

#### `switchQuestionFramework(frameworkId, questions, seenFrameworkIds, seenQuestionIds)`

对应用户动作：“换一个深思角度”。

- 切换到另一个积极心理学框架。
- 替换当前三道问题。
- 更新已看框架和问题历史。
- 清空旧问题选择和旧卡片颜色。
- 当前实现不会清空 `answerText`。

#### `selectQuestion(questionId, cardVariant)`

对应用户动作：点击粉、绿或蓝色问题卡片。

它不是无条件写入，而是先校验：

- `questionId` 必须属于当前三道候选问题。
- 第一、第二、第三个问题必须分别对应 `pink / green / blue`。
- 传入颜色与问题所在槽位不一致时拒绝写入。

校验通过后，一次性写入：

```ts
{
  selectedQuestionId: questionId,
  selectedCardVariant: cardVariant,
}
```

这样问题和颜色不会出现只更新了一半的状态。

### 回答阶段

#### `updateDraft(patch)`

通用的草稿局部更新 action。回答页目前用它保存输入：

```ts
updateDraft({ answerText: event.target.value });
```

- 有 draft：把 patch 合并进去。
- 没有 draft：不创建残缺草稿。

因为 draft 在 Persist 范围内，所以回答输入变化后也会自动保存到 localStorage。

### 归档阶段

#### `commitDraft()`

对应用户动作：回答页点击“收藏这份回答”。

业务含义：把当前未完成练习正式转换成一条完成档案。

执行步骤：

1. 读取当前 draft。
2. 根据 `selectedQuestionId` 找出完整问题。
3. 检查原始记录、框架、问题和回答都有效。
4. 创建新 `MemoryEntry`，生成独立 ID 和完成时间。
5. 初始化查看、擦亮和收藏行为字段。
6. 在同一次 Zustand `set` 中写入 archive，并把 draft 设为 `null`。
7. 返回新 entry 的 ID；失败时返回 `null`。

核心转换关系：

```text
draft.recordText          → entry.recordText
draft.frameworkId         → entry.frameworkId
选中的完整问题             → entry.question
draft.answerText          → entry.answerText
当前时间                   → entry.createdAt
```

提交前：

```ts
{
  draft: { /* 当前练习 */ },
  archive: { /* 旧档案 */ },
}
```

提交后：

```ts
{
  draft: null,
  archive: {
    entriesById: {
      [newEntryId]: newEntry,
      // 旧档案继续保留
    },
    entryOrder: [newEntryId, /* 旧 ID */],
  },
}
```

“写入档案”和“清空草稿”被放在同一次状态提交中，避免只完成其中一半。

### 展示阶段

#### `viewEntry(id)`

对应用户动作：打开一条档案详情。

```text
viewCount + 1
lastViewedAt = 当前时间
```

当前刚提交并跳转展示页时不会自动调用；只有用户点击档案卡片才增加查看次数。

#### `polishEntry(id)`

对应用户动作：点击“擦亮”。

```text
polishCount + 1
lastPolishedAt = 当前时间
```

当前“擦亮”只记录行为次数，不会编辑 `recordText`、问题或回答正文。

信封等级由次数动态计算：

| 擦亮次数 | 信封等级 |
| --- | --- |
| 0 | 0 |
| 1 | 1 |
| 2–4 | 2 |
| 5–9 | 3 |
| 10+ | 4 |

#### `toggleFavorite(id)`

对应用户动作：收藏或取消收藏一条已归档记忆。

- 未收藏：`favoritedAt = 当前时间`。
- 已收藏：`favoritedAt = null`。

这和回答页按钮文案存在一个当前语义差异：回答页虽然写着“收藏这份回答”，但 `commitDraft` 创建 entry 时把 `favoritedAt` 初始化为 `null`。所以提交动作在数据意义上是“归档”，不是“标记为高光收藏”。

## 五、Selector：不修改数据，只负责整理展示结果

Selector 可以理解为“从 Store 取数据并按照展示需求重新排列”，它不写入 Zustand。

### `selectTimelineEntries`

按照 `archive.entryOrder` 返回档案，新档案在前。

### `selectHighlightEntries`

当前高光排序依次比较：

1. 已收藏优先。
2. 擦亮次数更多优先。
3. 最近擦亮时间更近优先。
4. 创建时间更新优先。

## 六、回答提交后的页面流转

回答页点击提交后，视觉转场包住业务提交和路由切换：

```text
点击收藏按钮
    ↓
柔焦光斑从按钮中心扩张
    ↓ 覆盖峰值
commitDraft() 将 entry 写入 archive，Persist 自动保存
    ↓
replace 到 /today-collection/:entryId，柔光淡出
```

新条目 ID 放在稳定 URL 参数中，今日入馆页直接从 `archive.entriesById` 读取；刷新或复制链接后仍能恢复同一件馆藏。

展示页自身的 `mode`、`selectedEntryId`、`surpriseEntryId` 也都是本地 UI state，刷新后重置。

## 七、Persist 中最终会看到什么

提交完成后，localStorage 中的数据形态大致为：

```ts
{
  state: {
    draft: null,
    archive: {
      entriesById: {
        '<entry-id>': {
          id: '<entry-id>',
          recordText: '用户原始记录',
          frameworkId: 'framework2',
          question: {
            id: 'framework2-q05',
            text: '用户回答的完整问题',
          },
          answerText: '用户的顿悟回答',
          createdAt: 1787121000000,
          viewCount: 0,
          lastViewedAt: null,
          polishCount: 0,
          lastPolishedAt: null,
          favoritedAt: null,
        },
      },
      entryOrder: ['<entry-id>'],
    },
  },
  version: 0,
}
```

开发时可以在浏览器控制台查看原始字符串：

```js
localStorage.getItem('zenflow-record-storage-v2')
```

或者查看解析后的对象：

```js
JSON.parse(localStorage.getItem('zenflow-record-storage-v2'))
```

## 八、设计展示页前需要确定的业务决策

### 1. 提交到底叫“归档”还是“收藏”

当前代码把两件事区分开了：

- `commitDraft`：把回答收入档案。
- `toggleFavorite`：把档案标记为收藏 / 高光。

如果产品也要区分，回答页按钮更适合叫“收存这份回答”或“收入记忆档案”。如果提交就代表收藏，则需要让新 entry 的 `favoritedAt` 在创建时直接有值。

### 2. 是否延续问题卡片颜色

如果展示页还要显示粉、绿、蓝色视觉线索，需要在 `MemoryEntry` 增加并归档：

```ts
cardVariant: QuestionCardVariant;
```

否则 draft 清空后，颜色无法从现有 entry 恢复。

### 3. 刚提交后展示什么

当前实现只跳到档案列表，并用边框标记新记录。更完整的产品流程可以拆为：

```text
提交回答
  → 新结晶成果展示
  → 确认已收入档案
  → 进入档案浏览
```

“新结晶成果展示”可以直接呈现原始事件、选中问题和回答，而不是要求用户再点击一次列表项。

### 4. 新 entry ID 是否进入 URL

当前 `createdEntryId` 只在路由 state 中，刷新后丢失。如果展示页需要稳定打开指定档案，可考虑使用：

```text
/display-archive/:entryId
```

或 query 参数。档案内容仍以 Zustand archive 为数据源，URL 只负责指出要展示哪一条。

### 5. “查看”和“擦亮”的业务含义

需要明确：

- 刚提交后的首次成果展示是否算一次查看。
- “擦亮”只是成长计数，还是允许用户补写、修改回答。
- 如果允许编辑，需要新增更新 MemoryEntry 正文的 action；现有 `polishEntry` 不修改正文。

### 6. 本地档案是否足够

当前 Persist 只保存到本机浏览器：

- 刷新和关闭浏览器后通常仍在。
- 清理网站数据、更换设备或浏览器后不会自动恢复。
- 当前没有账号同步、服务端备份或导出机制。

展示页如果要成为长期“私人信件博物馆”，后续需要决定是否增加导出或服务端同步。

## 九、最容易混淆的几个点

| 容易误解的说法 | 更准确的理解 |
| --- | --- |
| “Persist 里写入 entry” | action 先修改 Zustand，Persist 再自动保存新的 Store 状态 |
| “commitDraft 是提交 draft” | 它会创建 MemoryEntry、写入 archive，并清空 draft |
| “entry 是页面入口” | entry 是一条完成档案 |
| “回答页点击收藏就是 favorited” | 当前只是归档，新 entry 的 `favoritedAt` 仍为 `null` |
| “展示页刷新后高亮没了，数据也没了” | 丢失的是路由临时 ID，archive 中的 entry 仍在 |
| “卡片颜色可以从档案恢复” | 当前颜色没有进入 MemoryEntry，提交后无法恢复 |

## 十、代码位置速查

| 内容 | 文件 |
| --- | --- |
| Draft、MemoryEntry、ArchiveState、所有 action 和 selector | `src/store/useRecordStore.ts` |
| 记录页自动保存与首次题组写入 | `src/pages/RecordEntryPage.tsx` |
| 换题、换框架、选择问题 | `src/pages/QuestionSelectionPage.tsx` |
| 回答输入与 `commitDraft` 调用 | `src/pages/QuestionAnswerPage.tsx` |
| 档案列表、详情、查看、擦亮和收藏 | `src/pages/DisplayArchivePage.tsx` |
| 跨路由柔焦转场状态 | `src/App.tsx` |
| Persist 的正式设计规范 | `docs/zustand-store-design.md` |

## 最后用一句话复习

```text
saveRecordText 创建练习
→ setInitialQuestionSet 准备问题
→ selectQuestion 选择问题
→ updateDraft 写回答
→ commitDraft 把 Draft 变成 MemoryEntry
→ Archive 收存完成记录
→ Persist 自动保存到浏览器
→ 展示页通过 selector 读取并排列这些记录
```
