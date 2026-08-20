import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../utils/createId';
import {
  getQuestionCardVariantByIndex,
  isQuestionCardVariant,
  type QuestionCardVariant,
} from '../data/questionCardVariants';

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

export type FrameworkSource = 'qwen' | 'fallback';

export type SeenQuestionIdsByFramework = Partial<Record<FrameworkId, string[]>>;

export interface ReflectionDraft {
  id: string;
  recordText: string;
  frameworkId: FrameworkId | null;
  candidateQuestions: QuestionItem[];
  initialFrameworkSource?: FrameworkSource | null;
  selectedQuestionId: string | null;
  selectedCardVariant: QuestionCardVariant | null;
  answerText: string;
  seenFrameworkIds: FrameworkId[];
  seenQuestionIdsByFramework: SeenQuestionIdsByFramework;
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
  saveRecordText: (recordText: string) => void;
  updateDraft: (patch: Partial<ReflectionDraft>) => void;
  setInitialQuestionSet: (
    frameworkId: FrameworkId,
    questions: QuestionItem[],
    source: FrameworkSource,
    seenQuestionIds: string[],
  ) => void;
  refreshQuestionsInCurrentFramework: (
    questions: QuestionItem[],
    seenQuestionIds: string[],
  ) => void;
  switchQuestionFramework: (
    frameworkId: FrameworkId,
    questions: QuestionItem[],
    seenFrameworkIds: FrameworkId[],
    seenQuestionIds: string[],
  ) => void;
  selectQuestion: (questionId: string, cardVariant: QuestionCardVariant) => void;
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

const unique = <T,>(items: readonly T[]): T[] => [...new Set(items)];

const hasThreeValidQuestions = (questions: readonly QuestionItem[]): boolean => (
  questions.length === 3
  && questions.every((question) => question.id.trim() && question.text.trim())
  && unique(questions.map((question) => question.id)).length === 3
);

const normalizeDraft = (draft: ReflectionDraft | null | undefined): ReflectionDraft | null => {
  if (!draft) return null;

  const legacyDraft = draft as Partial<ReflectionDraft> & {
    questionSource?: 'ai' | 'fallback' | null;
  };
  const { questionSource: legacyQuestionSource, ...draftWithoutLegacySource } = legacyDraft;
  const frameworkId = legacyDraft.frameworkId ?? null;
  const candidateQuestions = legacyDraft.candidateQuestions ?? [];
  const existingFrameworkIds = legacyDraft.seenFrameworkIds ?? [];
  const seenFrameworkIds = frameworkId
    ? unique([...existingFrameworkIds, frameworkId])
    : unique(existingFrameworkIds);
  const seenQuestionIdsByFramework = {
    ...(legacyDraft.seenQuestionIdsByFramework ?? {}),
  };

  if (frameworkId && !seenQuestionIdsByFramework[frameworkId]) {
    seenQuestionIdsByFramework[frameworkId] = candidateQuestions.map((question) => question.id);
  }

  const initialFrameworkSource = legacyDraft.initialFrameworkSource === 'qwen'
    || legacyDraft.initialFrameworkSource === 'fallback'
    ? legacyDraft.initialFrameworkSource
    : legacyQuestionSource === 'ai'
      ? 'qwen'
      : legacyQuestionSource === 'fallback'
        ? 'fallback'
        : null;
  const selectedQuestionIndex = candidateQuestions.findIndex(
    (question) => question.id === legacyDraft.selectedQuestionId,
  );
  const selectedQuestionId = selectedQuestionIndex >= 0
    ? legacyDraft.selectedQuestionId ?? null
    : null;
  const expectedCardVariant = getQuestionCardVariantByIndex(selectedQuestionIndex);
  const selectedCardVariant = isQuestionCardVariant(legacyDraft.selectedCardVariant)
    && legacyDraft.selectedCardVariant === expectedCardVariant
    ? legacyDraft.selectedCardVariant
    : expectedCardVariant;

  return {
    ...draftWithoutLegacySource,
    candidateQuestions,
    initialFrameworkSource,
    selectedQuestionId,
    selectedCardVariant,
    seenFrameworkIds,
    seenQuestionIdsByFramework,
  } as ReflectionDraft;
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
              id: createId(),
              recordText: trimmedRecordText,
              frameworkId: null,
              candidateQuestions: [],
              initialFrameworkSource: null,
              selectedQuestionId: null,
              selectedCardVariant: null,
              answerText: '',
              seenFrameworkIds: [],
              seenQuestionIdsByFramework: {},
              startedAt: Date.now(),
            },
          };
        });
      },

      saveRecordText: (recordText) => {
        set((state) => {
          if (!state.draft) {
            if (!recordText.trim()) return state;
            return {
              draft: {
                id: createId(),
                recordText,
                frameworkId: null,
                candidateQuestions: [],
                initialFrameworkSource: null,
                selectedQuestionId: null,
                selectedCardVariant: null,
                answerText: '',
                seenFrameworkIds: [],
                seenQuestionIdsByFramework: {},
                startedAt: Date.now(),
              },
            };
          }

          const draftHasEnteredReflection = Boolean(
            state.draft.frameworkId
            || state.draft.candidateQuestions.length > 0
            || state.draft.selectedQuestionId
            || state.draft.answerText,
          );
          if (draftHasEnteredReflection) return state;

          return {
            draft: { ...state.draft, recordText },
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

      setInitialQuestionSet: (frameworkId, questions, source, seenQuestionIds) => {
        if (!hasThreeValidQuestions(questions)) return;
        set((state) => {
          if (!state.draft) return state;
          return {
            draft: {
              ...state.draft,
              frameworkId,
              candidateQuestions: questions.map((question) => ({ ...question })),
              initialFrameworkSource: source,
              selectedQuestionId: null,
              selectedCardVariant: null,
              seenFrameworkIds: [frameworkId],
              seenQuestionIdsByFramework: {
                ...state.draft.seenQuestionIdsByFramework,
                [frameworkId]: unique(seenQuestionIds),
              },
            },
          };
        });
      },

      refreshQuestionsInCurrentFramework: (questions, seenQuestionIds) => {
        if (!hasThreeValidQuestions(questions)) return;
        set((state) => {
          const frameworkId = state.draft?.frameworkId;
          if (!state.draft || !frameworkId) return state;
          return {
            draft: {
              ...state.draft,
              candidateQuestions: questions.map((question) => ({ ...question })),
              selectedQuestionId: null,
              selectedCardVariant: null,
              seenQuestionIdsByFramework: {
                ...state.draft.seenQuestionIdsByFramework,
                [frameworkId]: unique(seenQuestionIds),
              },
            },
          };
        });
      },

      switchQuestionFramework: (
        frameworkId,
        questions,
        seenFrameworkIds,
        seenQuestionIds,
      ) => {
        if (!hasThreeValidQuestions(questions)) return;
        set((state) => {
          if (!state.draft || state.draft.frameworkId === frameworkId) return state;
          return {
            draft: {
              ...state.draft,
              frameworkId,
              candidateQuestions: questions.map((question) => ({ ...question })),
              selectedQuestionId: null,
              selectedCardVariant: null,
              seenFrameworkIds: unique(seenFrameworkIds),
              seenQuestionIdsByFramework: {
                ...state.draft.seenQuestionIdsByFramework,
                [frameworkId]: unique(seenQuestionIds),
              },
            },
          };
        });
      },

      selectQuestion: (questionId, cardVariant) => {
        set((state) => {
          const questionIndex = state.draft?.candidateQuestions.findIndex(
            (question) => question.id === questionId,
          ) ?? -1;
          const expectedVariant = getQuestionCardVariantByIndex(questionIndex);
          if (!state.draft || expectedVariant !== cardVariant) {
            return state;
          }
          return {
            draft: {
              ...state.draft,
              selectedQuestionId: questionId,
              selectedCardVariant: cardVariant,
            },
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
          id: createId(),
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
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<Pick<RecordState, 'draft' | 'archive'>>;
        return {
          ...currentState,
          ...persisted,
          draft: normalizeDraft(persisted.draft),
          archive: persisted.archive ?? currentState.archive,
        };
      },
    },
  ),
);
