import { create } from 'zustand';

// 定义状态的类型
interface RecordState {
  recordText: string;
  setRecordText: (text: string) => void;
}

// 创建 Zustand Store
export const useRecordStore = create<RecordState>()(
persist(
(set) => ({
recordText: '', // 初始值为空

// 更新文本的方法
setRecordText: (text) => set({ recordText: text }),
}),
{
name: 'user-record-storage', // 这是存储在浏览器 localStorage 里的 key 名称
}
)
);
