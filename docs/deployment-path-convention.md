# `/letter/` 部署路径与 URL 规范

## 规范状态

本文档是本项目关于前端路由、静态资源 URL、Vite 构建和 Nginx 部署路径的强制规范。

后续新增或修改页面、组件、路由、静态资源引用、构建配置和部署配置时，必须遵守本文档。

## 固定部署约定

- 应用的 URL path prefix（application mount point）固定为 `/letter/`。
- 生产入口固定为 `https://<domain>/letter/`。
- `/letter` 应规范化重定向到 `/letter/`。
- 域名根路径 `/` 不属于本应用，由 Nginx 决定返回其他站点、重定向或 404。
- 服务器只部署 Vite 的 `dist` 构建产物，不部署 `src`、`public` 或 `node_modules`。
- 推荐把 `dist` 目录中的内容发布到 `/var/www/letter/`。

## Vite public base path

`vite.config.ts` 必须保留以下配置：

```ts
export default defineConfig({
  base: '/letter/',
  plugins: [react()],
})
```

`base` 是应用静态资源的 public base path。构建后的入口脚本、样式、字体和其他由 Vite 分析的资源必须位于 `/letter/...` 下。

不要使用 `baseUrl`、`/` 或相对路径替代该配置，除非部署架构已经明确变更并同步更新本文档。

## React Router basename

React Router 必须使用从 `import.meta.env.BASE_URL` 派生的 `basename`：

```tsx
<BrowserRouter basename={APP_BASE_PATH}>
  <AppRoutes />
</BrowserRouter>
```

业务路由使用应用内部的逻辑路径，不得重复写入 `/letter` 前缀：

```tsx
// 正确
<Route path="/record" element={<RecordEntryPage />} />
navigate('/question-selection')

// 错误
<Route path="/letter/record" element={<RecordEntryPage />} />
navigate('/letter/question-selection')
```

配置 `basename` 后，内部 `/record` 对外对应 `/letter/record`。

## `public` 静态资源 URL

在 TS/TSX 运行时代码中引用 `public` 目录资源时，必须使用 `src/utils/assetUrl.ts` 提供的 `assetUrl()`，不得直接写域名根绝对路径，也不得硬编码 `/letter`：

```tsx
// 正确
import { assetUrl } from '../utils/assetUrl';

<img src={assetUrl('home/initial-background.png')} alt="" />

// 错误：会绕过 application base path
<img src="/home/initial-background.png" alt="" />

// 错误：重复维护部署前缀
<img src="/letter/home/initial-background.png" alt="" />
```

动态资源目录也应先通过 `assetUrl()` 构造：

```ts
const ASSET_ROOT = assetUrl('question-selection');
const background = `${ASSET_ROOT}/background.png`;
```

通过 ES module `import` 引入的 `src/assets` 资源由 Vite 管理。HTML 资源属性和 CSS `url()` 中可被 Vite 分析的资源也由 Vite 根据 `base` 重写，不要再次手工添加 `/letter`。

## Nginx 与 SPA fallback

当构建产物位于 `/var/www/letter/` 时，可使用以下映射方式：

```nginx
server {
    server_name <domain>;
    root /var/www;

    location = /letter {
        return 308 /letter/;
    }

    location /letter/ {
        try_files $uri $uri/ /letter/index.html;
    }
}
```

`try_files` 的 `/letter/index.html` 是 BrowserRouter 的 SPA fallback。它保证直接访问或刷新 `/letter/record` 等深层路由时仍由 React Router 接管，而不是返回 Nginx 404。

## 代码生成检查清单

生成或修改代码前后必须检查：

1. `vite.config.ts` 的 `base` 仍为 `/letter/`。
2. BrowserRouter 仍通过 `APP_BASE_PATH` 使用 `/letter` basename。
3. 新增的内部路由和 `navigate()` 没有手工添加 `/letter`。
4. 新增的 `public` 资源在 TS/TSX 中通过 `assetUrl()` 引用。
5. 构建产物中的脚本、样式、字体和图片 URL 均位于 `/letter/...`。
6. 深层路由在生产服务器上可以直接访问和刷新。

如果未来需要修改部署前缀，应同时修改 Vite `base`、Router basename 派生逻辑、Nginx location、部署目录和本文档，并重新执行生产构建验证。
