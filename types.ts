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
}

export interface CreateMemoryDTO {
  content: string;
  author: UserType;
}