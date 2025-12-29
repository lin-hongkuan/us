/**
 * ==========================================
 * 记忆导出脚本
 * ==========================================
 *
 * 此脚本用于从Supabase数据库导出所有记忆数据到本地JSON文件。
 * 用于备份、迁移或分析目的。
 *
 * 使用方法：
 * node scripts/export_memories.js
 *
 * 输出：
 * - memories_backup.json 文件保存在项目根目录
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 配置
const SUPABASE_URL = 'https://uiczraluplwdupdigkar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pyYWx1cGx3ZHVwZGlna2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjQzNDMsImV4cCI6MjA4MDg0MDM0M30.xS-mEzW1i1sPrhfAOgQNb6pux7bZjqKQiVe3LU0TbVo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * 导出记忆数据的主函数
 * 从Supabase获取所有记忆并保存到本地JSON文件
 */
async function exportMemories() {
  console.log('开始导出...');

  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('数据库中未找到记忆。');
      return;
    }

    console.log(`找到 ${data.length} 条记忆。`);

    // 获取当前目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 保存到根目录
    const outputPath = path.join(__dirname, '..', 'memories_backup.json');

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`成功导出记忆到: ${outputPath}`);

  } catch (err) {
    console.error('导出失败:', err.message);
  }
}

exportMemories();
