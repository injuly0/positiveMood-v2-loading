import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FrameworkId =
  | 'framework1'
  | 'framework2'
  | 'framework3'
  | 'framework4'
  | 'framework5';

export interface QuestionItem {
  id: string;
  text: string;
}

export interface ReflectionDraft {
  id: string;
  recordText: string;
  frameworkId: FrameworkId | null;
  candidateQuestions: QuestionItem[];
  selectedQuestionId: string | null;
  answerText: string;
  startedAt: number;
}

export interface MemoryEntry {
  id: string;
  recordText: string;
  frameworkId: FrameworkId;
  question: QuestionItem;
  answerText: string;
  createdAt: number;
  viewCount: number;
  lastViewedAt: number | null;
  polishCount: number;
  lastPolishedAt: number | null;
  favoritedAt: number | null;
}

export interface ArchiveState {
  entriesById: Record<string, MemoryEntry>;
  entryOrder: string[];
}

export interface RecordState {
  draft: ReflectionDraft | null;
  archive: ArchiveState;
  beginDraft: (recordText: string) => void;
  updateDraft: (patch: Partial<ReflectionDraft>) => void;
  selectQuestion: (questionId: string) => void;
  resetDraft: () => void;
  commitDraft: () => string | null;
  viewEntry: (id: string) => void;
  polishEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
}

export const initialArchive: ArchiveState = {
  entriesById: {},
  entryOrder: [],
};

export const getEnvelopeLevel = (polishCount: number): number => {
  if (polishCount >= 10) return 4;
  if (polishCount >= 5) return 3;
  if (polishCount >= 2) return 2;
  if (polishCount >= 1) return 1;
  return 0;
};

export const selectTimelineEntries = (state: RecordState): MemoryEntry[] =>
  state.archive.entryOrder
    .map((id) => state.archive.entriesById[id])
    .filter((entry): entry is MemoryEntry => Boolean(entry));

export const selectHighlightEntries = (state: RecordState): MemoryEntry[] =>
  [...selectTimelineEntries(state)].sort((a, b) => {
    const favoriteDifference = Number(b.favoritedAt !== null) - Number(a.favoritedAt !== null);
    if (favoriteDifference !== 0) return favoriteDifference;
    if (b.polishCount !== a.polishCount) return b.polishCount - a.polishCount;
    if (b.lastPolishedAt !== a.lastPolishedAt) {
      return (b.lastPolishedAt ?? 0) - (a.lastPolishedAt ?? 0);
    }
    return b.createdAt - a.createdAt;
  });

export const useRecordStore = create<RecordState>()(
  persist(
    (set, get) => ({
      draft: null,
      archive: initialArchive,

      beginDraft: (recordText) => {
        const trimmedRecordText = recordText.trim();
        if (!trimmedRecordText) return;

        // 覆盖已有草稿需要由页面先征得用户确认并调用 resetDraft。
        set((state) => {
          if (state.draft) return state;
          return {
            draft: {
              id: crypto.randomUUID(),
              recordText: trimmedRecordText,
              frameworkId: null,
              candidateQuestions: [],
              selectedQuestionId: null,
              answerText: '',
              startedAt: Date.now(),
            },
          };
        });
      },

      updateDraft: (patch) => {
        set((state) =>
          state.draft
            ? { draft: { ...state.draft, ...patch } }
            : state,
        );
      },

      selectQuestion: (questionId) => {
        set((state) => {
          if (!state.draft?.candidateQuestions.some((question) => question.id === questionId)) {
            return state;
          }
          return {
            draft: { ...state.draft, selectedQuestionId: questionId },
          };
        });
      },

      resetDraft: () => set({ draft: null }),

      commitDraft: () => {
        const { draft } = get();
        if (!draft) return null;

        const selectedQuestion = draft.candidateQuestions.find(
          (question) => question.id === draft.selectedQuestionId,
        );
        const recordText = draft.recordText.trim();
        const answerText = draft.answerText.trim();
        if (!recordText || !draft.frameworkId || !selectedQuestion || !answerText) {
          return null;
        }

        const entry: MemoryEntry = {
          id: crypto.randomUUID(),
          recordText,
          frameworkId: draft.frameworkId,
          question: { ...selectedQuestion },
          answerText,
          createdAt: Date.now(),
          viewCount: 0,
          lastViewedAt: null,
          polishCount: 0,
          lastPolishedAt: null,
          favoritedAt: null,
        };

        // 档案写入与草稿清空必须保持为同一次状态提交。
        set((state) => ({
          draft: null,
          archive: {
            entriesById: {
              ...state.archive.entriesById,
              [entry.id]: entry,
            },
            entryOrder: [entry.id, ...state.archive.entryOrder],
          },
        }));
        return entry.id;
      },

      viewEntry: (id) => {
        set((state) => {
          const entry = state.archive.entriesById[id];
          if (!entry) return state;
          return {
            archive: {
              ...state.archive,
              entriesById: {
                ...state.archive.entriesById,
                [id]: {
                  ...entry,
                  viewCount: entry.viewCount + 1,
                  lastViewedAt: Date.now(),
                },
              },
            },
          };
        });
      },

      polishEntry: (id) => {
        set((state) => {
          const entry = state.archive.entriesById[id];
          if (!entry) return state;
          return {
            archive: {
              ...state.archive,
              entriesById: {
                ...state.archive.entriesById,
                [id]: {
                  ...entry,
                  polishCount: entry.polishCount + 1,
                  lastPolishedAt: Date.now(),
                },
              },
            },
          };
        });
      },

      toggleFavorite: (id) => {
        set((state) => {
          const entry = state.archive.entriesById[id];
          if (!entry) return state;
          return {
            archive: {
              ...state.archive,
              entriesById: {
                ...state.archive.entriesById,
                [id]: {
                  ...entry,
                  favoritedAt: entry.favoritedAt === null ? Date.now() : null,
                },
              },
            },
          };
        });
      },
    }),
    {
      name: 'zenflow-record-storage-v2',
      partialize: (state) => ({
        draft: state.draft,
        archive: state.archive,
      }),
    },
  ),
);
