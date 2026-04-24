// 更新公告配置 - 从 types.ts 迁移，集中管理版本内容
export interface UpdateInfo {
  version: string;
  date: string;
  content: string[];
}

export const APP_UPDATE: UpdateInfo = {
  version: 'v5.3.1',
  date: '2026-04-24',
  content: [
    '双人在线 Presence 告别态修复：对方下线后会继续保留最后一次在线身份，不会再把“她/他刚刚离开”显示错位，告别文案、头像和状态终于对上了 ✨',
    '顶部同步状态点上线：Header 现在会根据 online / offline 自动切换已同步、同步中、离线模式，移动端和桌面端都能更直观看到当前状态 🌤️',
    '全局提示体验统一：原先割裂的 alert 已替换为 Toast，保存失败、更新失败、删除失败等反馈会更轻柔地出现，不再打断操作流 💌',
    '发布回忆流程更完整：Composer 新增 9 张上限、图片计数、上传阶段提示，发布时能清楚知道照片正在上传到第几张 📷',
    'MemoryCard 全屏看图支持移动端 swipe：左右滑动即可切图，并补上全屏下载入口与计数显示，手机查看连续照片更顺手了 💞'
  ]
};
