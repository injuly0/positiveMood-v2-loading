import { create } from 'zustand';

// 定义状态的类型
interface RecordState {
  recordText: string;
  setRecordText: (text: string) => void;
}

// 创建 Zustand Store
export const useRecordStore = create<RecordState>((set) => ({
  recordText: '', // 初始值为空
  setRecordText: (text) => set({ recordText: text }),
}));
