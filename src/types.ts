// 用户类型枚举：定义应用中的两种用户身份
export enum UserType {
  HER = 'HER',  // 女方用户
  HIM = 'HIM'   // 男方用户
}

// 记忆数据接口：定义单个记忆条目的结构
export interface Memory {
  id: string;           // 记忆的唯一标识符
  content: string;      // 记忆的内容文本
  createdAt: number;    // 创建时间戳（毫秒）
  author: UserType;     // 作者身份（她或他）
  tags?: string[];      // 可选的标签数组，用于分类
  imageUrl?: string;    // 可选的图片URL或Base64数据
}

// 创建记忆的数据传输对象：用于新建记忆时的参数
export interface CreateMemoryDTO {
  content: string;      // 记忆内容
  author: UserType;     // 作者身份
  imageUrl?: string;    // 可选的图片
}