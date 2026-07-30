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

  // QuestionAnswer 阶段数据
  userAnswer: string;
  setUserAnswer: (answer: string) => void;
  answeredAt: number | null;
  setAnsweredAt: (ts: number) => void;

  // 结晶动画信号（不持久化）
  crystallizing: boolean;
  setCrystallizing: (v: boolean) => void;
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

userAnswer: '',
setUserAnswer: (answer) => set({ userAnswer: answer }),
answeredAt: null,
setAnsweredAt: (ts) => set({ answeredAt: ts }),

crystallizing: false,
setCrystallizing: (v) => set({ crystallizing: v }),
}),
{
name: 'user-record-storage',
partialize: (state) => ({
recordText: state.recordText,
framework: state.framework,
questions: state.questions,
selectedQuestion: state.selectedQuestion,
userAnswer: state.userAnswer,
answeredAt: state.answeredAt,
// crystallizing 不持久化：它是瞬时 UI 信号，刷新后不应恢复
}),
}
)
);
