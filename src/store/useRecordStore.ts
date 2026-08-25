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
  collectionNumber: number;
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
  nextCollectionNumber: number;
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
  nextCollectionNumber: 1,
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

type LegacyMemoryEntry = Omit<MemoryEntry, 'collectionNumber'> & {
  collectionNumber?: number;
};

type PersistedArchiveState = {
  entriesById?: Record<string, LegacyMemoryEntry>;
  entryOrder?: string[];
  nextCollectionNumber?: number;
};

const isValidCollectionNumber = (value: unknown): value is number => (
  typeof value === 'number'
  && Number.isInteger(value)
  && value > 0
);

const normalizeArchive = (
  archive: ArchiveState | PersistedArchiveState | null | undefined,
): ArchiveState => {
  if (!archive) return initialArchive;

  const rawEntries = archive.entriesById ?? {};
  const entryIds = Object.keys(rawEntries).filter((id) => Boolean(rawEntries[id]));
  const orderedNewestFirst = unique(archive.entryOrder ?? [])
    .filter((id) => Boolean(rawEntries[id]));
  const orderedIds = new Set(orderedNewestFirst);
  const orphanIds = entryIds
    .filter((id) => !orderedIds.has(id))
    .sort((leftId, rightId) => (
      (rawEntries[leftId]?.createdAt ?? 0) - (rawEntries[rightId]?.createdAt ?? 0)
    ));
  const oldestFirstIds = [...orderedNewestFirst].reverse().concat(orphanIds);

  // 合法旧编号优先保留；缺失、重复或非法编号再按旧到新补齐。
  const collectionNumbersById = new Map<string, number>();
  const usedNumbers = new Set<number>();
  oldestFirstIds.forEach((id) => {
    const collectionNumber = rawEntries[id]?.collectionNumber;
    if (isValidCollectionNumber(collectionNumber) && !usedNumbers.has(collectionNumber)) {
      collectionNumbersById.set(id, collectionNumber);
      usedNumbers.add(collectionNumber);
    }
  });

  let nextAvailableNumber = 1;
  oldestFirstIds.forEach((id) => {
    if (collectionNumbersById.has(id)) return;
    while (usedNumbers.has(nextAvailableNumber)) nextAvailableNumber += 1;
    collectionNumbersById.set(id, nextAvailableNumber);
    usedNumbers.add(nextAvailableNumber);
    nextAvailableNumber += 1;
  });

  const entriesById = oldestFirstIds.reduce<Record<string, MemoryEntry>>((entries, id) => {
    const entry = rawEntries[id];
    if (!entry) return entries;
    entries[id] = {
      ...entry,
      collectionNumber: collectionNumbersById.get(id) ?? 1,
    };
    return entries;
  }, {});
  const maxAssignedNumber = usedNumbers.size > 0 ? Math.max(...usedNumbers) : 0;
  const persistedNextNumber = isValidCollectionNumber(archive.nextCollectionNumber)
    ? archive.nextCollectionNumber
    : 1;

  return {
    entriesById,
    entryOrder: [...oldestFirstIds].reverse(),
    // 保留比当前最大值更大的持久计数器，避免删除最高编号后发生复用。
    nextCollectionNumber: Math.max(persistedNextNumber, maxAssignedNumber + 1),
  };
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
    (set) => ({
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
        let createdEntryId: string | null = null;

        // 校验、编号分配、档案写入与草稿清空保持为同一次状态提交。
        set((state) => {
          const { draft } = state;
          if (!draft) return state;

          const selectedQuestion = draft.candidateQuestions.find(
            (question) => question.id === draft.selectedQuestionId,
          );
          const recordText = draft.recordText.trim();
          const answerText = draft.answerText.trim();
          if (!recordText || !draft.frameworkId || !selectedQuestion || !answerText) {
            return state;
          }

          const archive = normalizeArchive(state.archive);
          const entryId = createId();
          const entry: MemoryEntry = {
            id: entryId,
            collectionNumber: archive.nextCollectionNumber,
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
          createdEntryId = entryId;

          return {
            draft: null,
            archive: {
              entriesById: {
                ...archive.entriesById,
                [entryId]: entry,
              },
              entryOrder: [entryId, ...archive.entryOrder],
              nextCollectionNumber: archive.nextCollectionNumber + 1,
            },
          };
        });

        return createdEntryId;
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
      version: 3,
      migrate: (persistedState) => persistedState,
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
          archive: normalizeArchive(persisted.archive ?? currentState.archive),
        };
      },
    },
  ),
);
