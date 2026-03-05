# 项目结构规划（一仓库）

本项目采用 **一个仓库**，同时维护 Web 端与桌面端：

- Web 端代码在 `apps/web/`
- 桌面端（Tauri/Rust）代码在 `apps/desktop/src-tauri/`

## 目录约定

- `apps/web/src/`：Web 前端页面与业务逻辑
- `apps/web/public/`：Web 静态资源
- `apps/web/vite.config.ts`：Web 构建配置
- `apps/desktop/src-tauri/`：桌面端 Rust 与 Tauri 配置
- `apps/desktop/TAURI_DEV_GUIDE.md`：桌面端开发/打包文档
- `apps/desktop/scripts/`：桌面端辅助脚本（如图标生成）

- 根目录其它文件说明：
  - `.env` / `.env.example`：Supabase 环境变量配置（仅 `.env.example` 提交到仓库，`.env` 本地填写）
  - `supabase_setup.sql`：初始化 Supabase 数据库的建表与策略脚本
  - `scripts/`：导出记忆、构建 Android、浏览器自动化测试等开发辅助脚本
  - `scripts/test-browser.js`：Puppeteer 登录流程测试（需单独安装 `puppeteer` 后运行）
  - `signing.properties.example`：Android 签名配置样例（真实的 `signing.properties` 已在 `.gitignore` 中忽略）

## 常用命令

- Web 开发：`npm run dev`
- Web 构建：`npm run build`
- 桌面开发：`npm run tauri:dev`
- 桌面打包：`npm run tauri:build`

## Cloudflare Pages 配置

- 推荐将 Pages 的构建根目录设置为仓库根目录
- 构建命令：`npm run build`
- 输出目录：`apps/web/dist`
- 环境变量请在 Pages 中配置：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_KEY`

## Git 管理原则

- 提交源码：`apps/web/`、`apps/desktop/src-tauri/`、配置文件、文档
- 忽略产物：`*.exe`、`*.msi`、`apps/desktop/src-tauri/target/`、`webview2-sdk/` 等

