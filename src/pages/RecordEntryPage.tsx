import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '../components/AppLayout/AppLayout';
import {
  DraftConflictDialog,
  LetterArtworkImage,
  LetterContentOverlay,
  LetterEditor,
  LetterFooter,
  RecordPageBackground,
  ShufflePromptButton,
  type SaveState,
} from '../components/RecordPage/RecordPageParts';
import { pickCapturePrompt } from '../data/capturePrompts';
import {
  drawQuestionSet,
  isFrameworkId,
} from '../data/reflectionQuestions';
import {
  fetchFrameworkFromLLM,
  getFallbackFramework,
} from '../services/llmServices';
import {
  useRecordStore,
  type FrameworkId,
  type ReflectionDraft,
} from '../store/useRecordStore';
import './RecordEntryPage.css';
import { assetUrl } from '../utils/assetUrl';
import { preloadImages } from '../utils/preloadImages';

const QUESTION_SELECTION_ASSETS = [
  assetUrl('question-selection/background.webp'),
  assetUrl('question-selection/record-paper.webp'),
  assetUrl('question-selection/record-inner.webp'),
  assetUrl('question-selection/rack-back.webp'),
  assetUrl('question-selection/rack-middle.webp'),
  assetUrl('question-selection/rack-front.webp'),
  assetUrl('question-selection/number-1.webp'),
  assetUrl('question-selection/number-2.webp'),
  assetUrl('question-selection/number-3.webp'),
  assetUrl('question-selection/card-1-pink.webp'),
  assetUrl('question-selection/card-1-texture.webp'),
  assetUrl('question-selection/card-1-divider.webp'),
  assetUrl('question-selection/card-2-green.webp'),
  assetUrl('question-selection/card-2-texture.webp'),
  assetUrl('question-selection/card-3-blue.webp'),
  assetUrl('question-selection/card-3-texture.webp'),
  assetUrl('question-selection/divider-short.webp'),
] as const;

const hasEnteredReflection = (draft: ReflectionDraft): boolean => Boolean(
  draft.frameworkId
  || draft.candidateQuestions.length > 0
  || draft.selectedQuestionId
  || draft.answerText,
);

const getDraftContinuationRoute = (draft: ReflectionDraft): string =>
  draft.selectedQuestionId ? '/question-answer' : '/question-selection';

const mockSaveDraft = (shouldFail: boolean): Promise<void> =>
  new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Mock draft save failed'));
      } else {
        resolve();
      }
    }, 520);
  });

export default function RecordEntryPage() {
  const navigate = useNavigate();
  const { startSoftFocusTransition } = useOutletContext<AppLayoutContext>();
  const draft = useRecordStore((state) => state.draft);
  const saveRecordText = useRecordStore((state) => state.saveRecordText);
  const setInitialQuestionSet = useRecordStore((state) => state.setInitialQuestionSet);
  const resetDraft = useRecordStore((state) => state.resetDraft);
  const initialDraftRef = useRef(draft);
  const [inputText, setInputText] = useState(() => (
    draft && !hasEnteredReflection(draft) ? draft.recordText : ''
  ));
  const [prompt, setPrompt] = useState(() => pickCapturePrompt());
  const [saveState, setSaveState] = useState<SaveState>('default');
  const [showDraftConflict, setShowDraftConflict] = useState(() => (
    Boolean(draft && hasEnteredReflection(draft))
  ));
  const [transitioning, setTransitioning] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const saveVersionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    // React StrictMode 会在开发环境额外执行一次 setup/cleanup。
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      saveVersionRef.current += 1;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const dateLabel = useMemo(() => {
    const today = new Date();
    return `${today.getMonth() + 1}月${today.getDate()}日`;
  }, []);

  const wordCount = useMemo(() => Array.from(inputText.trim()).length, [inputText]);

  const queueDraftSave = (nextValue: string) => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    const version = saveVersionRef.current + 1;
    saveVersionRef.current = version;
    setSaveState('default');
    if (!nextValue.trim()) return;

    saveTimerRef.current = window.setTimeout(async () => {
      if (!mountedRef.current || version !== saveVersionRef.current) return;
      setSaveState('saving');

      try {
        const shouldFail = new URLSearchParams(window.location.search)
          .get('draftSave') === 'error';
        await mockSaveDraft(shouldFail);
        if (mountedRef.current && version === saveVersionRef.current) {
          setSaveState('saved');
        }
      } catch {
        if (mountedRef.current && version === saveVersionRef.current) {
          setSaveState('error');
        }
      }
    }, 1000);
  };

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setInputText(nextValue);

    if (nextValue.trim()) {
      saveRecordText(nextValue);
    } else {
      const currentDraft = useRecordStore.getState().draft;
      if (currentDraft && !hasEnteredReflection(currentDraft)) {
        resetDraft();
      }
    }

    queueDraftSave(nextValue);
  };

  const handleCollect = (trigger: HTMLButtonElement) => {
    const recordText = inputText.trim();
    if (!recordText) return;

    const currentDraft = useRecordStore.getState().draft;
    if (currentDraft && hasEnteredReflection(currentDraft)) {
      setShowDraftConflict(true);
      return;
    }

    saveRecordText(inputText);
    const started = startSoftFocusTransition({
      trigger,
      to: '/question-selection',
      beforeNavigate: () => { void preloadImages(QUESTION_SELECTION_ASSETS); },
      minimumDurationMs: 1200,
      content: {
        message: '正在读这封信，并为你寻找三个问题',
        delayedMessage: '还在整理，可能需要一点时间',
        delayedAfterMs: 3000,
      },
      waitFor: async () => {
        const questionSelectionReady = preloadImages(QUESTION_SELECTION_ASSETS);
        let frameworkId: FrameworkId;
        let usedFallback = false;

        try {
          const [result] = await Promise.all([
            fetchFrameworkFromLLM(recordText),
            questionSelectionReady,
          ]);
          if (!isFrameworkId(result.frameworkId)) {
            frameworkId = getFallbackFramework().frameworkId;
            usedFallback = true;
          } else {
            frameworkId = result.frameworkId;
          }
        } catch {
          await questionSelectionReady;
          frameworkId = getFallbackFramework().frameworkId;
          usedFallback = true;
        }

        const questionSet = drawQuestionSet(frameworkId);
        setInitialQuestionSet(
          frameworkId,
          questionSet.questions,
          usedFallback ? 'fallback' : 'qwen',
          questionSet.seenQuestionIds,
        );
      },
      onError: () => setTransitioning(false),
    });
    if (started) setTransitioning(true);
  };

  const handleContinueDraft = () => {
    const currentDraft = useRecordStore.getState().draft ?? initialDraftRef.current;
    if (!currentDraft) {
      setShowDraftConflict(false);
      return;
    }
    navigate(getDraftContinuationRoute(currentDraft));
  };

  const handleDiscardDraft = () => {
    resetDraft();
    setInputText('');
    setSaveState('default');
    setShowDraftConflict(false);
  };

  return (
    <main className="record-page">
      <section className="record-page-stage" aria-label="写下今天想留住的记忆">
        <RecordPageBackground />
        <LetterArtworkImage />

        <LetterContentOverlay>
          <header className="letter-top-area">
            <div className="letter-meta-row">
              <div className="letter-meta-info">
                <time className="letter-date">{dateLabel}</time>
                <span className="letter-theme">宜 · {prompt.themeLabel}</span>
              </div>
              <ShufflePromptButton
                onClick={() => setPrompt(pickCapturePrompt(prompt.groupId))}
              />
            </div>
            <p className="letter-prompt" aria-live="polite">{prompt.question}</p>
          </header>

          <LetterEditor value={inputText} onChange={handleTextChange} />
          <LetterFooter
            saveState={saveState}
            wordCount={wordCount}
            collectDisabled={!inputText.trim() || transitioning}
            onCollect={handleCollect}
          />
        </LetterContentOverlay>
      </section>

      {showDraftConflict && (
        <DraftConflictDialog
          onContinue={handleContinueDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
    </main>
  );
}
