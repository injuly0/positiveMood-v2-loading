整个应用可以初步拆解为以下核心模块：
# 1. InitializationPage (加载容器)1. 初始化页面 （加载容器）
  - 子组件：DynamicNote（处理背景色和字体变换的动画组件）。
  - 核心逻辑：生命周期管理，加载完成后触发路由跳转。
# 2. RecordEntryPage (记录容器)
  - 子组件：TextInputArea（文本输入区）、ActionSubmitButton（提交按钮）。
  - 核心逻辑：捕获用户输入的表单数据，并将其存储到应用的全局状态中。
# 3. QuestionSelectionPage (问题生成与选择容器)
  - 子组件：QuestionCard（单条问题的展示卡片，包含选中/未选中状态）。
  - 核心逻辑：接收上一步的数据，展示 AI 生成的框架问题列表，支持用户多选或单选。
# 4. QuestionAnswerePage (问题回答容器)
  - 子组件：ContextViewer（展示原始问题）、ResponseEditor（用户回答输入区）。
# 5. DisplayArchivePage (存储与展示容器)
  - 子组件：ResultCard（结构化展示整个梳理流程的最终结果）。