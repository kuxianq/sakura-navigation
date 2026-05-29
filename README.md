# Sakura Navigation

一个适合部署在 Cloudflare Pages 上的轻量个人导航页。

项目包含公开首页和后台控制台，可管理站点入口、分类、外观设置、访问保护，以及本地 AI Key 命令模拟能力。

## 技术栈

- React
- Vite
- TypeScript
- Tailwind CSS
- Cloudflare Pages
- Cloudflare D1

## 本地开发

```bash
npm ci
npm run dev
```

## 构建检查

```bash
npm run build
npm run lint
```

## Cloudflare Pages 部署

推荐配置：

```text
Framework preset: Vite
Build command: npm ci && npm run build
Build output directory: dist
Node version: 20
```

必需绑定和变量：

```text
D1 binding: DB
ADMIN_PASSWORD: 后台初始登录密码
ADMIN_SESSION_SECRET: 后台会话签名密钥
```

首次使用后台前，需要先在 D1 数据库执行：

```text
migrations/0001_initial.sql
```
