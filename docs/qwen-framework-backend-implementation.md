# Qwen 框架识别后端功能实现

## 1. 后端职责

后端只负责根据用户原始记录识别最适合的认知重构框架，不负责生成或返回具体问题。

允许返回的框架 ID：

```text
framework1  逆境重评与复原力
framework2  内在力量与优势确立
framework3  意义建构与价值对齐
framework4  感恩与联结
framework5  纯粹品味与心流延展
```

问题题库、随机抽取、去重、换题和换框架全部由前端完成。因此：

- 首次提交记录时请求一次后端；
- “换一组问题”不请求后端；
- “换一个深思的角度”不请求后端。

## 2. API 契约

### 2.1 请求

```http
POST /api/v1/reflection/framework
Content-Type: application/json
```

```json
{
  "recordText": "今天终于完成了拖了很久的作品，虽然过程很累，但看到结果时很开心。"
}
```

约束：

- `recordText` 必填；
- 服务端去除首尾空白；
- 推荐限制为 1～5000 个 Unicode 字符；
- 超过限制返回 `400`，不要静默截断造成语义变化。

### 2.2 成功响应

```json
{
  "frameworkId": "framework2",
  "requestId": "01J..."
}
```

前端业务只依赖 `frameworkId`。`requestId` 用于本地调试和日志定位。

### 2.3 错误响应

```json
{
  "error": {
    "code": "MODEL_OUTPUT_INVALID",
    "message": "The model did not return a supported framework id.",
    "requestId": "01J..."
  }
}
```

建议状态码：

| 状态码 | 场景 |
|---|---|
| `400` | 文本为空、格式错误或超过长度限制 |
| `429` | 请求频率过高 |
| `500` | 服务内部异常 |
| `502` | Qwen 无响应或返回无法校验的内容 |
| `503` | 模型尚未加载或正在重启 |

前端遇到任何失败时使用本地随机框架 fallback，继续进入问题选择页。

## 3. 模型输出约束

微调后的 Qwen 只应返回一个裸框架 ID：

```text
framework3
```

不要返回：

```text
我认为应该使用 framework3，因为……
```

即使模型已经微调，后端仍必须做白名单校验：

```python
ALLOWED_FRAMEWORKS = {
    "framework1",
    "framework2",
    "framework3",
    "framework4",
    "framework5",
}
```

只接受去除首尾空白后的完全匹配结果，不通过正则从长段解释中猜测框架 ID，避免模型异常输出被静默接受。

## 4. 推荐推理提示词

如果微调模型仍需要系统提示，可以使用最小约束：

```text
任务：根据用户记录，选择最适合继续反思的一个认知重构框架。

只能输出以下一个值：
framework1
framework2
framework3
framework4
framework5

不要解释，不要输出标点、JSON 或其他文字。
```

用户消息只包含 `recordText`。不要在提示词中要求模型生成问题。

## 5. FastAPI 参考实现

以下示例省略具体 Qwen 推理库调用，`qwen_generate` 应替换为本地模型封装：

```python
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

ALLOWED_FRAMEWORKS = {
    "framework1",
    "framework2",
    "framework3",
    "framework4",
    "framework5",
}


class FrameworkRequest(BaseModel):
    recordText: str


class FrameworkResponse(BaseModel):
    frameworkId: str
    requestId: str


def qwen_generate(record_text: str) -> str:
    # 调用本地微调 Qwen 8B；temperature 建议为 0 或接近 0。
    raise NotImplementedError


def error_response(
    status_code: int,
    code: str,
    message: str,
    request_id: str,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "requestId": request_id,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return error_response(
        400,
        "INVALID_REQUEST",
        "Request body is invalid.",
        str(uuid4()),
    )


@app.post("/api/v1/reflection/framework")
def classify_framework(payload: FrameworkRequest):
    request_id = str(uuid4())
    record_text = payload.recordText.strip()
    if not 1 <= len(record_text) <= 5000:
        return error_response(
            400,
            "INVALID_REQUEST",
            "recordText must contain 1 to 5000 Unicode characters.",
            request_id,
        )

    try:
        raw_output = qwen_generate(record_text)
    except Exception as exc:
        # 生产日志记录 request_id 和异常类型，不记录完整用户正文。
        return error_response(
            502,
            "MODEL_UNAVAILABLE",
            "The model is unavailable.",
            request_id,
        )

    framework_id = raw_output.strip()
    if framework_id not in ALLOWED_FRAMEWORKS:
        return error_response(
            502,
            "MODEL_OUTPUT_INVALID",
            "The model did not return a supported framework id.",
            request_id,
        )

    return FrameworkResponse(
        frameworkId=framework_id,
        requestId=request_id,
    )
```

示例通过自定义 `RequestValidationError` handler 将请求体缺失、类型错误等校验失败统一为 `400 + error` 包装，避免 FastAPI 默认的 `422 + detail` 与本文 API 契约冲突。生产实现可记录异常类型，但不得把完整用户正文写入错误响应或普通日志。

## 6. 推理参数建议

该任务是五分类，不需要创造性：

- `temperature`: `0` 或尽可能低；
- `top_p`: 使用模型默认值或较低值；
- `max_new_tokens`: 8～16；
- 禁止流式响应；
- 单请求只处理一条记录；
- 模型启动时预热一次，避免用户首次请求承担完整冷启动。

## 7. 前端适配点

当前前端适配函数位于：

```text
src/services/llmServices.ts
```

对外契约为：

```ts
interface LlmFrameworkResult {
  frameworkId: string
}

fetchFrameworkFromLLM(text: string): Promise<LlmFrameworkResult>
```

真实接入时只替换该函数内部的本地模拟实现，其他页面、题库和 Zustand 流程不需要修改。

示例：

```ts
export async function fetchFrameworkFromLLM(
  text: string,
): Promise<LlmFrameworkResult> {
  const response = await fetch('/api/v1/reflection/framework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordText: text }),
  })

  if (!response.ok) {
    throw new Error(`Framework request failed: ${response.status}`)
  }

  return response.json()
}
```

前端收到结果后仍执行 `isFrameworkId()` 白名单校验。后端校验不能替代前端边界校验。

## 8. 隐私与日志

- 原始记录属于用户敏感文本，默认不写入普通请求日志。
- 如需排障，记录 `requestId`、文本长度、耗时、模型版本、返回框架和错误类型即可。
- 禁止把完整用户正文拼进异常信息。
- 若必须采样调试数据，需要显式开发开关，并确保生产环境关闭。
- 本地部署时仍建议限制接口只监听受控地址，并配置合理的请求大小和速率限制。

## 9. 后端验收标准

- 合法请求只返回一个白名单框架 ID。
- 空文本和超长文本返回 `400`。
- 模型异常输出不会透传为成功响应。
- 模型不可用时返回明确错误，前端可以触发 fallback。
- 单次响应不包含问题列表和用户记录正文。
- 点击前端两个换题按钮不会产生新的后端请求。
- 日志可通过 `requestId` 定位，但不包含完整用户记录。
