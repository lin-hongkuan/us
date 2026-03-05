# Tauri 桌面端开发与构建指南

由于本项目是一个结合了 Web 前端（React + Vite）和原生后端（Rust）的 Tauri 桌面应用，开发和构建流程与纯 Web 开发略有不同。

## 1. 快速开发与热更新 (Dev Mode)

**在开发测试时，你绝对不需要每次都完整构建 exe！** 

Tauri 提供了一个非常强大的开发环境，支持**前端热更新 (HMR)**。

### 启动命令：
```bash
npm run tauri:dev
```
*(底层实际执行的是 `npx tauri dev`)*

### 开发模式的特点：
1. **自动启动前端：** 它会自动在后台执行 `npm run dev` 启动 Vite 服务器（默认 `localhost:3000`）。
2. **启动独立 WebView：** 然后它会编译并启动一个包含你前端页面的原生桌面窗口。
3. **前端代码热更新：** 如果你修改了 `apps/web/src/` 目录下的 React 组件或 CSS 样式，**桌面窗口内的画面会瞬间自动刷新**，和在浏览器里开发网页一样丝滑。
4. **后端 Rust 代码热重载：** 如果你修改了 `apps/desktop/src-tauri/src/` 下的 Rust 代码，控制台会自动检测并增量重新编译 Rust 部分，然后重启桌面窗口（耗时通常只有几秒钟，远低于全新构建）。

### 开发调试技巧：
- **打开控制台：** 在开发模式启动的桌面窗口中，你可以像在 Chrome 浏览器里一样，按下 `Ctrl + Shift + I` (Windows) 或右键点击选择**“检查 (Inspect)”** 来打开开发者工具（DevTools），查看 Console 报错、Network 请求或调试 CSS。
- **只启动网页端：** 如果你当前修改的内容完全不涉及系统原生功能（比如只调按钮样式），你可以只运行 `npm run dev` 并在浏览器里调试，这样启动最快。

---

## 2. 构建生产安装包 (Build Mode)

当你完成所有开发，准备把程序发给别人（或者自己日常使用）时，才需要执行生产构建。

### 启动命令：
```bash
npm run tauri:build
```
*(底层实际执行的是 `npx tauri build`)*

### 构建过程说明：
1. 它会先执行 `npm run build`，把你的 React 代码打包压缩成静态文件放入 `apps/web/dist/` 目录。
2. 调用 Rust 编译器（使用之前配置的 GNU 工具链），开启所有的编译期优化（这步最耗时）。
3. 生成单文件 `.exe`。
4. 打包生成安装程序（NSIS `.exe` 安装包和 `.msi` 安装包）。

### 构建产物位置：
所有打包好的文件都在 `C:\tauri-build-cache\release\` 目录下（因为路径带有空格的问题，我们在 `.cargo/config.toml` 中重定向了输出目录）：

- **单文件便携版：** `C:\tauri-build-cache\release\us-shared-memory-journal.exe`（需要和 `WebView2Loader.dll` 放在同一目录运行）
- **傻瓜安装包 (发给别人用这个)：** `C:\tauri-build-cache\release\bundle\nsis\Us - Shared Memory Journal_1.0.0_x64-setup.exe`

---

## 3. 图标生成

如果你设计了新的应用图标（比如设计了一张 `1024x1024` 的 `apps/desktop/app-icon.png`），你需要让 Tauri 将它转换成各种系统所需的大小（`.ico`, `.icns` 等）。

### 启动命令：
```bash
npm run tauri:icon
```
运行后，它会自动替换 `apps/desktop/src-tauri/icons/` 目录下的所有图标文件。下次运行 `npm run tauri:build` 或 `npm run tauri:dev` 时，你的新图标就会生效。

---

## 4. 常见问题排查 (FAQ)

**Q: 运行 `npm run tauri:dev` 报错 `port 3000 is already in use`**
A: 说明你的 Vite 服务可能已经在另一个终端运行了，或者上次没正常关闭。
**解决**：找到占用 3000 端口的进程并关闭它，或者直接在任务管理器中结束所有的 `node.exe` 进程。

**Q: 运行 `tauri:build` 报错 `failed to run custom build command for us-shared-memory-journal` (带 gcc 错误)**
A: 这是因为你在包含空格的目录路径（比如 `F:\Us---A-Shared-Memory-Journal-main 2\...`）下直接使用 Rust 的 MinGW 工具链打包图标资源。
**解决**：这已经在 `apps/desktop/src-tauri/.cargo/config.toml` 中通过强制重定向构建缓存到 `C:\tauri-build-cache` 修复了。如果未来换了电脑，请确保保持这个配置。

**Q: 点击桌面快捷方式没反应，或弹窗提示缺少 `WebView2Loader.dll`**
A: Tauri v2 在 Windows GNU 环境下默认属于动态链接。
**解决**：如果是发给朋友，请直接发给他们 `nsis` 文件夹里的 `xxx-setup.exe` 安装包，安装包会自动处理这些 DLL 依赖。如果是自己拿单文件玩，记得把 `WebView2Loader.dll` 复制到 `Us-SharedMemoryJournal.exe` 同一个文件夹下。