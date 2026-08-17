# 项目文档索引

本目录保存项目的产品概念、页面设计、前端架构、状态模型、后端契约、动效和部署规范。

进行较大的功能开发或代码生成前，应先阅读本索引，再根据任务范围阅读对应文档。新增、删除、重命名文档，或者改变文档职责与状态时，必须在同一次修改中维护本索引。

## 阅读与优先级约定

- 用户当前明确确认的需求优先于历史文档。
- 同一主题存在多个版本时，以版本号更高且状态已确认的文档为准。
- 文件名包含“待改”的文档属于草案或历史方案，只用于理解背景，不应直接作为当前实现的唯一依据。
- 文档与当前代码不一致时，应先确认差异来自文档过期还是实现缺失，再决定修改方向。
- 涉及路由、静态资源、Vite 构建或服务器部署时，必须遵守 [`deployment-path-convention.md`](deployment-path-convention.md)。

## 1. 项目概念与整体架构

### [`project-concept-describ.md`](project-concept-describ.md)

项目总体概念与业务流转。介绍“私人信件博物馆”的产品叙事、用户流程、五个积极心理学框架、AI 框架识别，以及归档和展示阶段的规划。

### [`project-implement-describ.md`](project-implement-describ.md)

应用整体实现结构。描述五个页面容器、视觉包装组件与核心功能组件的职责边界、Zustand 全局状态、嵌套路由、动画覆盖层和持久化方向。

### [`project-visual-metaphor.md`](project-visual-metaphor.md)

全页面视觉外观、动效思路与叙事隐喻汇总。涵盖首页、记录页、问题选择页、问题回答页和归档展示页的整体视觉语言。

## 2. 心理学内容与业务状态

### [`reflection-question-bank.md`](reflection-question-bank.md)

当前认知重构题库规范。定义 `framework1` 至 `framework5`、稳定题目 ID、五个框架下的 45 道问题，以及题库维护约束。

### [`zustand-store-design.md`](zustand-store-design.md)

当前 Zustand 数据模型与持久化设计。定义草稿、记忆档案、业务 action、selector、跨路由瞬时动画边界和持久化 key。

## 3. 页面设计与功能规范

### [`InitializationPage (首页场景容器)-具体实现文档.md`](<InitializationPage (首页场景容器)-具体实现文档.md>)

首页场景的具体前端实现方案。描述三张背景图状态、透明交互热区、文字层、Hover 与触屏交互，以及位置和尺寸约束。

### [`record-page-spec-v6.md`](record-page-spec-v6.md)

状态：当前记录页视觉与排版规范。

定义记录页的画布、素材、布局、引导问题、正文输入、自动保存状态、字数统计、Footer 和响应式实现。业务数据规则沿用既有实现约定。

### [`record-page-spec-v5-补充-异步柔光转场.md`](record-page-spec-v5-补充-异步柔光转场.md)

状态：已确认并实施的转场补充规范。

定义记录页提交后，问题准备过程与柔光覆盖层合并的异步转场流程、等待文案、时间规则和职责边界。涉及记录页到问题选择页的异步转场时应与统一转场规范一起阅读。

### [`question-selection-frontend-spec.md`](question-selection-frontend-spec.md)

状态：当前问题选择页功能规范。

定义三道问题的展示、“换一组问题”和“换一个深思角度”的行为、前端题库来源、Zustand 与页面瞬时状态边界，以及 Qwen 的调用边界。

### [`待改-question-selection-page-design.md`](待改-question-selection-page-design.md)

状态：待改的早期设计方案。

记录问题选择页早期的单选架构、组件树、数据流、状态机和 AI fallback 思路。当前功能以 `question-selection-frontend-spec.md` 和实际代码为准；使用本文前必须检查是否仍然适用。

### [`待改-question-answer-page-design.md`](待改-question-answer-page-design.md)

状态：待改的设计方案。

描述问题回答页的组件树、数据流、返回路径、空数据守卫，以及由父级 Layout 承担的结晶动画。实现前需要结合当前代码核对。

## 4. 跨页面动效

### [`柔光聚焦页面转场规范.md`](柔光聚焦页面转场规范.md)

项目统一的页面转场规范。定义从点击触发点扩散的柔光、四个转场状态、时间线、视觉参数、可访问性和跨路由实现边界。

## 5. AI 与后端契约

### [`qwen-framework-backend-implementation.md`](qwen-framework-backend-implementation.md)

Qwen 框架识别后端实现规范。定义后端职责、允许返回的框架 ID、API 请求与响应契约、错误处理、安全边界，以及前后端职责划分。

## 6. 构建与部署

### [`deployment-path-convention.md`](deployment-path-convention.md)

状态：强制规范。

定义应用固定部署在 `/letter/`，以及 Vite `base`、React Router `basename`、`assetUrl()`、Nginx location、SPA fallback、服务器目录和代码生成检查清单。

## 按任务选择文档

| 任务 | 必须优先阅读 |
| --- | --- |
| 理解产品目标或完整用户流程 | `project-concept-describ.md`、`project-implement-describ.md` |
| 修改首页 | `InitializationPage (首页场景容器)-具体实现文档.md`、`project-visual-metaphor.md` |
| 修改记录页 | `record-page-spec-v6.md`；涉及提交转场时再读 v5 转场补充与统一转场规范 |
| 修改问题选择页 | `question-selection-frontend-spec.md`、`reflection-question-bank.md`、`zustand-store-design.md` |
| 修改问题回答页 | `待改-question-answer-page-design.md`、`zustand-store-design.md`，并核对当前代码 |
| 修改页面转场 | `柔光聚焦页面转场规范.md`；异步提交场景再读 v5 转场补充 |
| 接入或修改 Qwen 后端 | `qwen-framework-backend-implementation.md`、`reflection-question-bank.md` |
| 修改路由、资源、构建或部署 | `deployment-path-convention.md` |
