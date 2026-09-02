# 邀请制后端、馆藏持久化与埋点分析 MVP 规范

> 状态：已确认，作为后续后端、认证、服务端馆藏和埋点实现的依据。  
> 适用阶段：邀请制小规模 MVP。  
> 前置约束：前端固定部署在 `/letter/`；题库继续由前端静态维护；现有浏览器测试馆藏不迁移到服务端。

## 1. 目标与范围

本轮后端建设解决四件事：

1. 只有获得有效邀请码的用户才能激活账号并继续使用首页核心功能；
2. 已完成的馆藏由服务端持久化，登录后可稳定读取；
3. Qwen 继续只负责首次框架识别；
4. 建立围绕“记录 → 推荐 → 回答 → 入馆 → 重访”的里程碑埋点。

本轮不实现：

- 未完成草稿跨设备同步；
- 现有 localStorage 测试馆藏迁移；
- 后台动态编辑题库；
- 推荐题组关系表或推荐算法实验平台；
- 数据仓库、消息队列、微服务拆分；
- 邮箱注册、邮件找回密码或第三方登录；
- 在数据库中保存页面动画、弹窗、当前馆藏模式等瞬时 UI 状态。

## 2. 已确认架构决策

### 2.1 技术选型

- API：FastAPI；
- 应用服务器：Uvicorn，MVP 默认单 worker；
- 数据访问：SQLAlchemy；
- 数据库迁移：Alembic；
- 数据库：服务器本地磁盘上的 SQLite；
- SQLite：启用 WAL、外键约束和合理的 busy timeout；
- 反向代理与 HTTPS：Nginx 或 Caddy；
- 密码哈希：Argon2id，不保存明文密码；
- 登录态：服务端会话 + `HttpOnly`、`Secure`、`SameSite` Cookie；
- 管理操作：MVP 通过 SSH 登录服务器后运行管理命令，不开放公网管理员页面或邀请码生成 API；
- 部署：单机 2 核 2G，后端与 SQLite 同机；
- Qwen 推理位置另行确认。若模型运行在同一台服务器，必须单独评估内存，不能因增加 Uvicorn worker 重复加载模型。

API 对外路径沿用现有 Qwen 契约的 `/api/v1/...`。前端页面和静态资源仍固定在 `/letter/`，应用内 React Router 路由不得手写 `/letter` 前缀。

### 2.2 数据归属

| 数据 | 权威来源 | 是否浏览器持久化 | 是否服务端持久化 |
| --- | --- | --- | --- |
| `ReflectionDraft` | 浏览器 | 是，Zustand Persist | 否 |
| 已完成 `MemoryEntry` | 服务端 | 仅可作为运行时缓存，不作为权威数据 | 是 |
| `ArchiveState.entriesById` | 前端派生缓存 | 否 | 不直接存，来自馆藏查询结果 |
| `ArchiveState.entryOrder` | 前端派生缓存 | 否 | 不直接存，按完成时间排序 |
| `ArchiveState.nextCollectionNumber` | 服务端 | 否 | 由服务端维护与分配 |
| 推荐题组与浏览历史 | 当前草稿 + 埋点 | 草稿阶段保留 | 不建业务关系表 |
| 瞬时 UI/动画状态 | React 本地状态 | 否 | 否 |
| 尚未发送的埋点队列 | 浏览器临时缓冲 | 可短期保留 | 成功接收后写事件表 |
| 登录凭证 | 安全 Cookie | 不进入 localStorage | 会话表保存哈希后的会话标识 |

核心原则：同一份已完成馆藏不能同时以 localStorage 和服务端数据库作为两套权威数据。

## 3. 前端状态调整原则

### 3.1 `ReflectionDraft` 继续本地优先

草稿沿用 Zustand Persist，输入与 1 秒自动保存不请求后端。至少保留：

```ts
interface ReflectionDraft {
  id: string;
  recordText: string;
  initialFrameworkId: FrameworkId | null;
  frameworkId: FrameworkId | null;
  candidateQuestions: QuestionItem[];
  initialFrameworkSource: 'qwen' | 'fallback' | null;
  selectedQuestionId: string | null;
  selectedCardVariant: 'pink' | 'green' | 'blue' | null;
  answerText: string;
  seenFrameworkIds: FrameworkId[];
  seenQuestionIdsByFramework: Partial<Record<FrameworkId, string[]>>;
  startedAt: number;
}
```

其中：

- `initialFrameworkId` 固定保存 Qwen/fallback 首次给出的框架；
- `frameworkId` 表示当前框架，完成时作为 `finalFrameworkId` 上传；
- `selectedCardVariant` 只服务跨页视觉连续性，不进入馆藏业务表；
- 草稿 ID 在开始记录时生成，并贯穿埋点和最终馆藏提交，用于幂等与链路关联。

登录后 Persist 必须按用户隔离。实现可使用用户级 key 或在状态中保存并验证 owner ID；退出登录时必须清空当前运行时馆藏，不能让下一位登录用户看到上一位用户的数据。

### 3.2 `ArchiveState` 退化为运行时缓存

后端接入后：

- 打开馆藏页时从 API 获取馆藏；
- 前端可将数组转换为 `entriesById` 以便页面访问；
- 时间线顺序由 `completedAt` 和稳定 ID 排序派生；
- 刷新页面后重新获取，不依赖 Persist 中的 archive；
- 馆藏详情、擦亮和珍藏成功后以服务端响应更新缓存；
- `nextCollectionNumber` 不再出现在前端权威状态中。

现有 localStorage 测试馆藏不迁移。上线新后端时可以清除或忽略旧 archive。没有用户归属信息的旧草稿也不能自动挂到第一个登录账号，应在认证版本首次运行时明确忽略或清理。

## 4. 账号与邀请流程

### 4.1 用户生命周期

```text
管理员通过 SSH 管理命令生成邀请码并预留用户 ID
  → 用户在首页输入邀请码
  → 用户设置唯一用户名和密码
  → 前端一次提交邀请码、用户名和密码
  → 后端在同一事务中验证并激活
  → 用户状态变为 active，写入 activated_at
  → 邀请码作废
  → 设置安全会话 Cookie
  → 首页核心功能解锁
```

邀请码只用于一次性激活，不作为日常登录密码。后续用户使用用户名和密码登录。

首页固定展示低干扰内测说明：

```text
当前为邀请内测，首次使用需凭邀请码激活
邀请码请前往小红书 @xxx 获取
```

同时提供“已有账号？登录”入口。这里不能写成“每次需凭邀请码登录”，否则会让用户误以为邀请码是永久密码。未来开放真实账号注册时，只替换激活入口和说明文案，已经创建的用户 ID、账号、馆藏和会话模型不推倒重做。

### 4.2 无邮箱时的密码重置

MVP 不具备用户自助找回密码能力。忘记密码时由管理员通过 SSH 管理命令为指定用户生成一次性密码重置码；重置成功后旧重置码和已有会话应失效。

### 4.3 首页门禁

- 未激活或未登录用户可以看到首页外观和邀请码/登录入口；
- 首页现有背景、标题、两个热区和聚焦效果保持不变，只新增内测说明与认证浮层/弹层；
- 未登录用户点击“开始写信”或“进入回味展厅”时打开认证入口，不启动原页面转场；
- 进入记录、馆藏和其他受保护页面前必须由后端认证；
- 前端路由守卫只改善体验，后端每个私有 API 仍必须独立校验会话；
- 邀请码、登录和密码重置接口必须限制请求频率；
- 错误信息不能用于枚举有效用户名或邀请码。

## 5. SQLite 数据模型

所有时间在 API 中使用 UTC；SQLite 可统一保存 Unix 毫秒整数。正文长度、用户名长度和 JSON 大小应在 Pydantic 与数据库约束两侧校验。

### 5.1 `users`

| 字段 | 类型 | 约束与含义 |
| --- | --- | --- |
| `id` | TEXT | 主键，使用预先确定的用户唯一 ID |
| `username` | TEXT NULL | 激活后必填；大小写不敏感唯一 |
| `password_hash` | TEXT NULL | 激活后必填；Argon2id 哈希 |
| `status` | TEXT | `invited / active / disabled` |
| `activated_at_ms` | INTEGER NULL | 首次完成账号设置的服务端时间 |
| `next_collection_number` | INTEGER | 默认 `1`，只增不减 |

MVP 不要求 `email`、`created_at` 或 `deleted_at`。禁用账号使用 `status = disabled`，不通过删除用户行实现。

约束：

- `username` 使用 trim 后的规范值；
- 数据库唯一性必须大小写不敏感；
- 不能保存名为 `password` 的明文字段；
- `next_collection_number >= 1`。

### 5.2 `invite_codes`

| 字段 | 类型 | 约束与含义 |
| --- | --- | --- |
| `id` | TEXT | 主键 |
| `user_id` | TEXT | 外键指向 `users.id` |
| `purpose` | TEXT | `activation / password_reset` |
| `code_hash` | TEXT | 唯一；只保存邀请码哈希 |
| `issued_at_ms` | INTEGER | 服务端发放时间 |
| `expires_at_ms` | INTEGER NULL | 可配置失效时间 |
| `redeemed_at_ms` | INTEGER NULL | 成功使用时间 |
| `revoked_at_ms` | INTEGER NULL | 管理员作废时间 |

邀请码明文只在生成成功时返回一次。激活时，验证邀请码、写用户账号、标记邀请码已使用必须处于同一个事务。

### 5.3 `sessions`

| 字段 | 类型 | 约束与含义 |
| --- | --- | --- |
| `id` | TEXT | 主键 |
| `session_token_hash` | TEXT | 唯一；Cookie 中只放随机明文 token，数据库保存其哈希 |
| `user_id` | TEXT | 外键指向 `users.id` |
| `issued_at_ms` | INTEGER | 服务端时间 |
| `expires_at_ms` | INTEGER | 过期时间 |
| `revoked_at_ms` | INTEGER NULL | 退出登录、改密或管理员禁用时写入 |

普通 API 请求不必更新 `last_seen_at`，避免无意义的高频写入。Cookie 至少设置 `HttpOnly`、`Secure`、`SameSite=Lax/Strict`、明确的有效期和合适的 Path；认证 token 不进入 localStorage。所有改变服务端状态的 Cookie 认证请求还必须校验同源 `Origin`，并采用 CSRF token 或等效防护，不能只依赖 SameSite。

### 5.4 `memory_entries`

该表只保存完成后的馆藏，不保存 draft 或 discarded，因此不需要 `status`。

| 字段 | 类型 | 约束与含义 |
| --- | --- | --- |
| `id` | TEXT | 主键；沿用草稿阶段生成的链路 ID，重复提交可幂等返回 |
| `user_id` | TEXT | 外键指向 `users.id` |
| `collection_number` | INTEGER | 用户范围内永久编号 |
| `record_text` | TEXT | 用户原始记录 |
| `initial_framework_id` | TEXT | 首次 Qwen/fallback 框架 |
| `final_framework_id` | TEXT | 用户最终采用的框架 |
| `initial_framework_source` | TEXT | `qwen / fallback` |
| `selected_question_id` | TEXT | 稳定题目 ID |
| `selected_question_text_snapshot` | TEXT | 完成时用户看到的题目全文快照 |
| `answer_text` | TEXT | 用户回答 |
| `started_at_ms` | INTEGER | 客户端草稿首次开始时间 |
| `completed_at_ms` | INTEGER | 服务端完成时间 |
| `view_count` | INTEGER | 默认 `0` |
| `last_viewed_at_ms` | INTEGER NULL | 最近主动重访时间 |
| `polish_count` | INTEGER | 默认 `0` |
| `last_polished_at_ms` | INTEGER NULL | 最近擦亮时间 |
| `favorited_at_ms` | INTEGER NULL | 首次珍藏时间 |

约束和索引：

- `UNIQUE(user_id, collection_number)`；
- `collection_number >= 1`；
- `view_count >= 0`、`polish_count >= 0`；
- 五种框架 ID 使用白名单校验；
- 索引 `(user_id, completed_at_ms DESC)`；
- 索引 `(user_id, favorited_at_ms)`；
- 任何按 ID 查询或修改都必须同时限制 `user_id`，不能只按 entry ID 操作。

`selected_card_variant` 不进入该表。题目位置和卡片颜色只写入选择埋点。

### 5.5 `analytics_events`

事件表只追加，不通过 UPDATE 改写历史事件。

| 字段 | 类型 | 约束与含义 |
| --- | --- | --- |
| `event_id` | TEXT | 主键，客户端或服务端生成；用于去重 |
| `event_name` | TEXT | 白名单事件名 |
| `user_id` | TEXT | 当前认证用户 |
| `session_id` | TEXT | 当前产品分析 session ID |
| `reflection_id` | TEXT NULL | 草稿/馆藏链路 ID；不强制外键，因为草稿可能永不完成 |
| `occurred_at_ms` | INTEGER | 客户端事件发生时间 |
| `received_at_ms` | INTEGER | 服务端接收时间 |
| `page_path` | TEXT NULL | 应用内部页面路径 |
| `app_version` | TEXT NULL | 前端构建版本 |
| `properties_json` | TEXT | JSON 对象；禁止正文和回答全文 |

推荐索引：

- `(event_name, received_at_ms)`；
- `(user_id, received_at_ms)`；
- `(reflection_id, received_at_ms)`；
- `(session_id, received_at_ms)`。

SQLite 支持通过 JSON 函数查询 `properties_json`。MVP 不建立 `recommendation_sets` 和 `recommendation_set_items`，推荐题组通过事件属性保存。

## 6. 馆藏写入与编号事务

完成收藏时必须由服务端执行短事务：

```text
认证当前用户
  → 校验正文、首次/最终框架、问题与回答
  → 检查同一 entry ID 是否已经提交
  → 读取 users.next_collection_number
  → 插入 memory_entries
  → users.next_collection_number + 1
  → 插入服务端 entry_completed 事件
  → 提交事务
  → 返回完整 MemoryEntry
```

规则：

- 同一 `user_id + entry id` 的重试不能重复创建馆藏或消耗编号；
- 失败事务不能消耗编号；
- 删除馆藏后不能回收编号；
- `entry_completed` 由服务端在业务事务中写入，不依赖浏览器批量埋点；
- 自动进入“今日入馆页”不增加 `view_count`；
- 从馆藏页主动打开旧条目时，在一次事务中增加 `view_count` 并写 `entry_revisited`；
- 擦亮并珍藏时，在一次事务中更新计数/时间并写 `entry_polished`。

## 7. 埋点事件规范

### 7.1 通用规则

- 不记录每次输入、每个字符或动画帧；
- 事件名和属性使用稳定的英文 `snake_case`；
- 产品分析 session 与认证会话不是同一概念：前端生成分析 `session_id`，连续无操作超过 30 分钟后创建新 session；`app_opened` 在每个分析 session 中只写一次；
- 客户端为每个事件生成唯一 `event_id`，服务端按主键幂等接收；
- 非关键事件进入浏览器队列，通过批量接口写入；
- 埋点失败不能阻止记录、选题、回答和收藏；
- `record_text`、`answer_text`、题目之外的用户正文摘要不得写入事件；
- 服务端使用 `received_at_ms` 作为可靠接收时间，同时保留客户端 `occurred_at_ms`；
- 所有属性先经过事件级白名单校验，不能接受任意无限大小 JSON。

### 7.2 MVP 事件

| 事件 | 触发定义 | 关键属性 |
| --- | --- | --- |
| `account_activated` | 邀请用户首次成功设置用户名和密码 | `invite_id` |
| `app_opened` | 一个产品 session 首次成功加载 | `entry_page` |
| `record_started` | 某 reflection 第一次从空变为非空 | `prompt_id` |
| `record_submitted` | 原始记录通过校验并开始框架识别 | `record_length` |
| `framework_resolved` | Qwen/fallback 得到合法框架 | `initial_framework_id`, `source`, `ai_latency_ms`, `request_id` |
| `question_group_shown` | 一组三题已成功显示 | `group_id`, `sequence`, `reason`, `framework_id`, `question_ids` |
| `question_selected` | 用户选中题目并进入回答阶段 | `group_id`, `question_id`, `question_position`, `card_variant`, `group_sequence` |
| `answer_started` | 回答第一次从空变为非空 | `question_id` |
| `draft_discarded` | 用户显式确认放弃未完成草稿 | `stage` |
| `entry_completed` | 服务端成功创建馆藏 | `collection_number`, `initial_framework_id`, `final_framework_id`, `duration_ms`, `source` |
| `archive_opened` | 用户打开馆藏展示页 | `entry_count`, `mode` |
| `entry_revisited` | 用户从馆藏主动打开旧馆藏 | `entry_age_days`, `from_mode` |
| `entry_polished` | 擦亮并珍藏事务成功 | `polish_count`, `first_favorite` |
| `ai_error` | Qwen 超时、异常或输出非法并触发 fallback | `error_code`, `ai_latency_ms`, `fallback_used`, `request_id` |

`question_group_shown.reason` 只允许：

```text
initial
question_refresh
framework_change
```

因此不再额外建立推荐题组表，也不必为了成功换题重复写一条纯点击事件。只要新题组实际展示，就能从 `reason` 推导换题或换框架行为。如果未来需要分析“点击后展示失败”，再新增按钮点击事件。

示例：

```json
{
  "event_name": "question_group_shown",
  "reflection_id": "reflection-uuid",
  "properties": {
    "group_id": "group-uuid",
    "sequence": 1,
    "reason": "initial",
    "framework_id": "framework2",
    "question_ids": [
      "framework2-q01",
      "framework2-q05",
      "framework2-q08"
    ]
  }
}
```

## 8. 核心指标口径

### 8.1 North Star

**Weekly Completed Collections Users**：自然周内至少完成一次 `entry_completed` 的去重用户数。

### 8.2 MVP 五个核心指标

1. **首次完成率**  
   首次产品 session 中至少完成一条馆藏的用户数 ÷ 首次访问用户数。

2. **首次完成耗时**  
   用户第一条馆藏的 `completed_at_ms - started_at_ms`，展示 P50、P75、P90。

3. **第一次问题推荐接受率**  
   初始题组展示后，用户未看过 `sequence > 1` 的题组便直接选择其中一道题的 reflection 数 ÷ 初始题组展示数。

4. **D7 再次完成率**  
   首次完成用户中，在首次完成后的第 2～7 天再次完成至少一条馆藏的用户占比。

5. **旧馆藏重访率**  
   完成过馆藏的用户中，在随后 7 天内从馆藏页主动打开旧馆藏的用户占比；自动进入今日入馆页不计入。

### 8.3 AI 推荐分析

通过 `question_group_shown`、`question_selected` 和 `entry_completed` 计算：

- 框架首次曝光量与最终采用率；
- 初始框架与最终框架一致率；
- 每道问题曝光量、选择量和选择率；
- 选择某道问题后的完成率；
- 直接接受初始推荐、换题、换框架三组用户的完成率差异；
- Qwen 与 fallback 的完成率、耗时和后续行为差异。

问题选择率不能直接等同于问题质量。分析时至少同时观察题目所在位置、卡片颜色、框架和题组序号，避免把第一张卡片的位置优势误判为题目内容优势。

## 9. API 边界

以下为 MVP 资源边界，具体请求/响应模型在实施时补充，但不得改变数据职责。

### 9.1 管理与认证

```text
POST /api/v1/auth/activate              使用邀请码设置用户名和密码
POST /api/v1/auth/login                 用户名/密码登录
POST /api/v1/auth/logout                撤销当前会话
GET  /api/v1/auth/me                    获取当前用户
POST /api/v1/auth/reset-password        使用重置码设置新密码
```

MVP 管理操作不开放 HTTP 接口，改由服务器 SSH 管理命令承担：

```text
letter-admin create-invite              生成激活邀请码并预留用户 ID
letter-admin create-password-reset      为指定用户生成一次性重置码
letter-admin disable-user               禁用指定用户并撤销会话
```

SSH 密钥和服务器操作系统账号就是本阶段的管理员认证。未来只有在需要远程管理页面或多人运营时，才增加管理员角色、管理员登录和受保护的 `/api/v1/admin/...`；不能直接把管理命令包装成无认证公网接口。

### 9.2 馆藏

```text
POST /api/v1/memory-entries
GET  /api/v1/memory-entries
GET  /api/v1/memory-entries/{entry_id}
POST /api/v1/memory-entries/{entry_id}/view
POST /api/v1/memory-entries/{entry_id}/polish-and-treasure
```

MVP 列表接口返回当前用户的完整馆藏并提供稳定排序，使月份、随机和珍藏模式能够基于完整数据派生。数据量上升后，再同时引入分页以及服务端月份/模式筛选，不能只分页却继续让前端把已加载的一页误当成完整馆藏。

### 9.3 埋点

```text
POST /api/v1/events/batch
```

单批事件数量和请求体大小必须设上限。重复 `event_id` 视为幂等成功，不能导致整批重试无限失败。

### 9.4 Qwen

继续沿用：

```text
POST /api/v1/reflection/framework
```

具体输入、输出、fallback 和隐私要求以 `qwen-framework-backend-implementation.md` 为准。

该接口属于登录后的核心功能，生产环境也必须验证当前用户会话；现有文档中的公开请求示例不代表允许匿名调用。

## 10. 隐私、安全与日志

- 密码和邀请码只保存安全哈希；
- 登录与所有私有 API 只通过 HTTPS；
- 登录态不进入 localStorage；
- Cookie 认证的状态修改请求校验同源 `Origin` 并使用 CSRF 防护；
- 原始记录和回答属于敏感正文，不写普通访问日志、异常信息或埋点；
- AI 日志只记录 `request_id`、文本长度、耗时、模型版本、框架结果和错误类型；
- 所有馆藏查询和修改都以当前会话的 `user_id` 作为边界；
- 登录、邀请码、重置码接口启用速率限制；
- 密码修改、用户禁用后撤销该用户全部会话；
- 数据库文件、备份文件和环境变量只允许服务账号读取；
- API 错误响应不返回堆栈、SQL、密码哈希、邀请码哈希或正文。

## 11. SQLite 运行约束与备份

- SQLite 文件必须位于服务器本地可靠磁盘，不放 NFS/网络共享目录；
- 启动时确认 WAL 和外键约束生效；
- 写事务中禁止执行模型推理、网络请求或长时间计算；
- 为锁等待配置 busy timeout；
- Uvicorn 默认单 worker，确认性能不足后再基于真实监控调整；
- 每日使用 SQLite 在线备份能力或 `VACUUM INTO` 生成一致性备份，不能在数据库活跃时只复制主 `.db` 文件而忽略 WAL；
- 定期执行备份恢复演练，只有能够恢复的备份才算有效；
- 日志与备份设置保留周期，避免 2 核 2G 服务器磁盘被无限增长的数据占满。

当出现以下情况时再评估迁移 PostgreSQL：

- 持续出现明显的并发写锁等待；
- 需要多个应用实例同时写数据库；
- 引入高频实时行为流或复杂分析任务；
- 单机已经无法满足可用性要求；
- 需要成熟的行级权限、复制或在线扩容能力。

## 12. 推荐实施顺序

1. 建立 FastAPI 项目、配置管理、错误结构与健康检查；
2. 接入 SQLAlchemy、Alembic 和 SQLite 运行参数；
3. 建立 `users`、`invite_codes`、`sessions`，完成邀请激活和登录；
4. 为首页和私有 API 增加认证边界；
5. 建立 `memory_entries`，实现服务端编号与幂等收藏事务；
6. 调整 Zustand：Persist 只保留用户隔离的草稿，archive 改为 API 运行时缓存；
7. 接入馆藏列表、详情、重访、擦亮与珍藏 API；
8. 建立 `analytics_events` 和批量接收接口；
9. 在前端逐个接入里程碑事件，不接入逐字符事件；
10. 接入真实 Qwen 框架识别并写 AI 结果/错误事件；
11. 建立核心指标查询、备份、恢复和基础运行监控；
12. 完成小规模邀请测试，再根据实际锁等待和内存数据决定是否扩容或更换数据库。

## 13. 验收标准

### 13.1 邀请与账号

- [ ] 无效、过期、已使用或已撤销邀请码不能激活账号；
- [ ] 有效邀请码只能成功使用一次；
- [ ] 首次激活可设置唯一用户名和密码；
- [ ] 密码和邀请码明文不进入数据库或日志；
- [ ] 未登录用户不能调用私有馆藏 API；
- [ ] 退出登录、改密和禁用账号后相关会话失效；
- [ ] 同一浏览器切换账号不会暴露上一用户草稿或馆藏。

### 13.2 草稿与馆藏

- [ ] 草稿输入和自动保存不请求后端；
- [ ] 草稿刷新后可在同一用户、同一浏览器继续；
- [ ] `initialFrameworkId` 与当前 `frameworkId` 分开保存；
- [ ] 只有完成收藏时才创建 `memory_entries`；
- [ ] 重复提交同一 entry ID 不重复创建、不重复编号；
- [ ] 馆藏编号由服务端用户级计数器分配，删除后不复用；
- [ ] archive 不再作为 Zustand Persist 的权威数据；
- [ ] 登录后馆藏来自服务端，刷新和重新登录结果一致；
- [ ] 现有浏览器测试馆藏不会被自动上传。

### 13.3 埋点与指标

- [ ] 没有逐字符、每次 textarea change 或动画帧埋点；
- [ ] 重复 `event_id` 不生成重复事件；
- [ ] `entry_completed` 与馆藏创建处于同一服务端事务；
- [ ] `question_group_shown` 包含题组原因、框架和三个题目 ID；
- [ ] `question_selected` 包含题目位置与卡片颜色；
- [ ] 事件和普通日志均不包含用户正文与回答全文；
- [ ] 可以计算首次完成率、首次完成耗时、第一次推荐接受率、D7 再次完成率和旧馆藏重访率；
- [ ] 可以对比初始框架与最终框架，并分析 Qwen/fallback 差异。

### 13.4 运行与恢复

- [ ] 生产环境只通过 HTTPS 访问认证和私有 API；
- [ ] SQLite WAL、外键和 busy timeout 已验证；
- [ ] 模型推理不占用数据库写事务；
- [ ] 2 核 2G 环境下默认单 Uvicorn worker；
- [ ] 数据库、WAL、日志和备份空间受到监控；
- [ ] 自动备份成功，并至少完成一次从备份恢复到独立环境的演练；
- [ ] Qwen 部署方式和内存预算在上线真实推理前单独验收。
