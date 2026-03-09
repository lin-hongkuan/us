# Copilot Instructions

本文件用于为本工作区内的智能体提供默认协作规范。它与根目录的 [AGENTS.md](../AGENTS.md) 配合使用：

- `AGENTS.md`：沉淀项目背景、结构、长期规则
- `copilot-instructions.md`：约束日常实现方式、改动习惯与协作偏好

## 工作目标

在这个仓库中工作时，默认目标是：

1. 优先做出 **可运行、可维护、风格统一** 的改动
2. 尽量贴合项目现有的浪漫、细腻、轻盈的产品气质
3. 保持小步修改，避免无关重构
4. 在实现功能的同时，顺手维护长期文档

## 基本约定

- 包管理默认使用 `pnpm`
- 修改前先阅读相关文件，避免靠猜测直接改
- 优先复用现有组件、服务、上下文、常量
- 不要轻易引入新依赖，除非收益明显
- 不要随意扩大改动范围
- 如无必要，不要改动项目目录结构

## Web 端实现偏好

适用于 `apps/web/`：

- 使用函数式 React 组件与 TypeScript
- 保持类型完整，避免无意义的 `any`
- 大组件若继续膨胀，优先拆分子组件、hooks 或 helpers
- 样式与动效延续现有审美：柔和、精致、适度动画
- 注意移动端性能，不要只为桌面端体验牺牲流畅度
- 新增通用配置优先放到 `apps/web/src/config/`
- 新增通用业务逻辑优先放到 `apps/web/src/services/`

## 数据、缓存与同步

涉及以下能力时，先检查现有实现，再决定是否修改：

- `apps/web/src/services/cacheService.ts`
- `apps/web/src/services/storageService.ts`
- `apps/web/src/services/presenceService.ts`

约定：

- 不要破坏已有缓存优先级与离线体验
- 不要忽略本地兜底逻辑
- 涉及 Supabase 改动时，要考虑 Realtime、Storage、缓存、失败回退是否受影响

## Desktop / Tauri 端偏好

适用于 `apps/desktop/src-tauri/`：

- 先确认改动是否真的需要进入桌面端
- 优先保持 Tauri 配置与 Rust 入口清晰、最小化
- 不将 Web 端临时实验逻辑直接搬进桌面端

## 修改后检查

完成修改后，默认应尽量做到：

1. 检查受影响文件是否有明显类型错误或构建错误
2. 检查调用链是否需要同步更新
3. 如新增长期有效约定，更新 `AGENTS.md`
4. 如新增的是工作方式/协作偏好，更新本文件

## 对 agent 的额外要求

当用户提出较模糊需求时：

- 先根据现有代码结构收敛实现方案
- 优先直接完成可确定的部分
- 只在确实无法判断时再追问

当用户要求“顺手沉淀经验”时：

- 优先更新 `AGENTS.md`
- 若是通用协作方式，则更新本文件

当用户要求“更适合 vibecoding”时：

- 优先减少上下文丢失
- 在不增加复杂度的前提下保持实现连续性
- 把稳定规则写入文档，而不是只停留在对话里

## 关键文件提示

优先关注这些入口文件：

- `apps/web/src/App.tsx`
- `apps/web/src/context/AppContext.tsx`
- `apps/web/src/components/MainPhase.tsx`
- `apps/web/src/components/Composer.tsx`
- `apps/web/src/components/MemoryCard.tsx`
- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/src-tauri/src/lib.rs`

## 维护原则

保持本文件短、稳、可复用：

- 记录长期有效的协作规则
- 不记录一次性调试细节
- 不写过度具体但很快过时的内容
- 当仓库演化时，及时同步更新
