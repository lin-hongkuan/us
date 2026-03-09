# AGENTS.md

本文件提供给仓库内工作的智能体使用，用于快速理解项目、统一修改方式，并在后续迭代中持续维护更新。

## 1. 项目概览

- 项目名：`us---a-shared-memory-journal`
- 仓库类型：单仓库（Web + Desktop）
- Web：React 19 + Vite 6 + TypeScript + Tailwind CSS
- Desktop：Tauri 2 + Rust
- 数据能力：Supabase（Database / Storage / Realtime）
- 包管理：`pnpm`
- 产品气质：浪漫、细腻、轻盈、柔和动画、情侣共享回忆

## 2. 目录约定

- `apps/web/`：Web 应用
- `apps/web/src/components/`：主要 UI 与交互组件
- `apps/web/src/context/`：全局状态与跨组件能力
- `apps/web/src/services/`：缓存、存储、在线状态等服务
- `apps/web/src/config/`：常量与配置
- `apps/web/src/theme/`：主题配置
- `apps/desktop/src-tauri/`：Tauri 与 Rust 桌面端代码
- `scripts/`：构建、导出、测试等辅助脚本
- `doc/`：项目文档
- `output/`：测试输出或构建输出

## 3. 关键入口文件

优先理解这些文件，再决定改法：

### Web 主入口

- `apps/web/src/App.tsx`
- `apps/web/src/context/AppContext.tsx`
- `apps/web/src/components/MainPhase.tsx`
- `apps/web/src/components/Composer.tsx`
- `apps/web/src/components/MemoryCard.tsx`
- `apps/web/src/components/Header.tsx`

### 服务层重点

- `apps/web/src/services/cacheService.ts`
- `apps/web/src/services/storageService.ts`
- `apps/web/src/services/presenceService.ts`

### Desktop / Tauri 入口

- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src-tauri/tauri.conf.json`

## 4. 常用命令

优先使用 `pnpm`：

- 安装依赖：`pnpm install`
- Web 开发：`pnpm dev`
- Web 构建：`pnpm build`
- Web 预览：`pnpm preview`
- Tauri 开发：`pnpm tauri:dev`
- Tauri 构建：`pnpm tauri:build`
- 生成 Tauri 图标：`pnpm tauri:icon`

## 5. Agent 默认工作方式

### 5.1 修改前

Agent 在实现功能、修复问题、重构前，应该先：

1. 阅读相关文件，而不是只靠文件名猜测。
2. 先判断改动属于 Web、Desktop，还是服务层。
3. 优先复用现有组件、上下文、服务、常量与样式模式。
4. 如果需求较模糊，先根据现有结构收敛方案，优先完成能确定的部分。
5. 如果涉及缓存、存储、在线状态，先检查服务层实现，不要直接从 UI 猜逻辑。

### 5.2 修改时

- 保持小步改动，避免无关重构。
- 保持现有产品气质：柔和、浪漫、精致、适度动画。
- 保持 TypeScript 类型完整，避免随意引入 `any`。
- 非必要不新增依赖；如需新增，应有明显收益。
- 如无必要，不随意改目录结构。
- 大组件继续变复杂时，优先拆分子组件、hooks 或 helpers。
- 新增通用配置优先放 `apps/web/src/config/`。
- 新增通用业务逻辑优先放 `apps/web/src/services/`。

### 5.3 修改后

Agent 完成改动后，默认应尽量做到：

1. 检查受影响文件是否存在明显类型错误或构建错误。
2. 检查调用链是否需要同步更新。
3. 检查是否影响移动端体验、缓存行为或离线兜底。
4. 如果产生长期有效的新规则，更新本文件或 `.github/copilot-instructions.md`。

## 6. Web 端实现约定

适用于 `apps/web/`：

- 使用函数式 React 组件与 TypeScript。
- 优先保持数据流清晰，不做不必要的状态提升。
- 样式与动效延续现有审美，不做突兀、廉价或过重的效果。
- 兼顾桌面端体验与移动端性能，不只优化桌面端。
- 懒加载、缓存、骨架屏、过渡动画等现有体验，除非有明确理由，不要随意删改。
- 涉及交互彩蛋、音效、氛围动画时，要注意不要破坏主流程可用性。

## 7. 数据、缓存与同步规则

涉及以下能力时，先检查现有实现，再决定是否修改：

- `apps/web/src/services/cacheService.ts`
- `apps/web/src/services/storageService.ts`
- `apps/web/src/services/presenceService.ts`

默认规则：

- 不要破坏现有 cache-first 与本地兜底逻辑。
- 不要忽略 IndexedDB / LocalStorage / 内存缓存之间的层级关系。
- 涉及 Supabase 改动时，要同时考虑 Database、Storage、Realtime 的联动。
- 图片上传、回忆读写、presence 更新若失败，应尽量保留已有失败回退能力。
- 修改数据结构时，要检查缓存键、序列化字段、上下游调用是否一起更新。

## 8. Desktop / Tauri 端约定

适用于 `apps/desktop/src-tauri/`：

- 先确认需求是否真的需要进入桌面端。
- 优先保持 Tauri 配置、权限与 Rust 入口清晰、最小化。
- 不将 Web 端临时实验逻辑直接搬进桌面端。
- 涉及桌面端配置时，注意能力声明、构建配置与入口代码是否一致。

## 9. 文档沉淀规则

出现以下情况时，Agent 应考虑更新文档：

- 新增核心目录、核心服务或关键入口文件
- 技术栈变化
- 构建命令变化
- 项目约定变化
- 某次改动沉淀出稳定、长期有效的经验

约定：

- `AGENTS.md`：记录项目背景、结构、关键规则、长期上下文
- `.github/copilot-instructions.md`：记录日常协作方式、实现偏好、工作习惯
- 一次性调试细节不要写进长期文档
- 文档保持短、稳、可复用，避免流水账

## 10. 面向 vibecoding 的维护建议

为了让后续 Agent 更容易延续上下文，建议默认遵循：

- 用户提出新的稳定偏好时，及时补充到文档，而不是只停留在对话里。
- 完成较大功能或重构后，把长期有效的结构结论补进本文件。
- 如果发现某些文件经常成为修改入口，就把它们加入“关键入口文件”。
- 如果某个服务层模块很容易被误改，就在本文件里明确提醒。
- 保持规则精炼，优先记录“以后还会反复用到的信息”。

## 11. 给未来 Agent 的快速提示

如果用户说：

- “先看看项目怎么改” → 先读本文件，再读相关目录文件
- “帮我把经验沉淀下来” → 优先更新本文件
- “更适合 vibecoding” → 优先减少上下文丢失，并把稳定规则写回文档
- “为什么后面的 agent 总接不上上下文” → 优先检查本文件是否缺少关键背景与规则

## 12. 维护原则

保持本文件：

- 短：避免冗长历史记录
- 稳：只记录长期有效信息
- 准：和当前仓库结构保持一致
- 活：仓库演化时及时更新

这份文件应被视为仓库级的 Agent 说明书。