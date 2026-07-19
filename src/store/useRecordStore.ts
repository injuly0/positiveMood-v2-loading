import { create } from 'zustand';
import { persist } from 'zustand/middleware'

// 问题项类型
export interface QuestionItem {
  id: string;
  text: string;
}

// 定义状态的类型
interface RecordState {
  recordText: string;
  setRecordText: (text: string) => void;

  // QuestionSelection 阶段数据
  framework: string | null;
  setFramework: (framework: string) => void;
  questions: QuestionItem[];
  setQuestions: (questions: QuestionItem[]) => void;
  selectedQuestion: QuestionItem | null;
  setSelectedQuestion: (question: QuestionItem) => void;
}

// 创建 Zustand Store
export const useRecordStore = create<RecordState>()(
persist(
(set) => ({
recordText: '',
setRecordText: (text) => set({ recordText: text }),

framework: null,
setFramework: (framework) => set({ framework }),
questions: [],
setQuestions: (questions) => set({ questions }),
selectedQuestion: null,
setSelectedQuestion: (question) => set({ selectedQuestion: question }),
}),
{
name: 'user-record-storage',
}
)
);
