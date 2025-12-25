export enum UserType {
  HER = 'HER',
  HIM = 'HIM'
}

export interface Memory {
  id: string;
  content: string;
  createdAt: number; // timestamp
  author: UserType;
  tags?: string[];
  imageUrl?: string; // 照片URL或Base64数据
}

export interface CreateMemoryDTO {
  content: string;
  author: UserType;
  imageUrl?: string;
}