import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '../components/AppLayout/AppLayout';
import {
  drawQuestionSet,
  pickNextFrameworkId,
} from '../data/reflectionQuestions';
import {
  QUESTION_CARD_CONFIGS,
  type QuestionCardConfig,
  type QuestionCardNumber,
  type QuestionCardVariant,
} from '../data/questionCardVariants';
import { useRecordStore, type QuestionItem } from '../store/useRecordStore';
import { assetUrl } from '../utils/assetUrl';
import { preloadImages } from '../utils/preloadImages';
import './QuestionSelectionPage.css';

type ShuffleMode = 'questions' | 'framework';
type SwapPhase = 'idle' | 'leaving' | 'entering';

const ASSET_ROOT = assetUrl('question-selection');
const QUESTION_ANSWER_ASSETS = [
  assetUrl('question-answer/background.webp'),
  assetUrl('question-answer/brass-rack.webp'),
  assetUrl('question-answer/lace-frame.webp'),
  assetUrl('question-answer/question-card-base.webp'),
] as const;

interface QuestionCardVisualProps {
  config: QuestionCardConfig;
  question: QuestionItem;
  active: boolean;
  selected: boolean;
  onActivate: (card: QuestionCardNumber | null) => void;
  onOpen: (
    questionId: string,
    cardVariant: QuestionCardVariant,
    trigger: HTMLElement,
  ) => void;
}

function QuestionCardVisual({
  config,
  question,
  active,
  selected,
  onActivate,
  onOpen,
}: QuestionCardVisualProps) {
  const style = {
    '--card-default-z': config.defaultZIndex,
    '--card-upright-rotation': config.uprightRotation,
  } as CSSProperties;

  return (
    <div
      className={`qs-rack-card ${config.frameClassName}`}
      data-active={active || selected}
      style={style}
    >
      <div className="qs-card-motion">
        <img className="qs-card-paper" src={config.paperSrc} alt="" draggable="false" />
        {config.number === 3 ? (
          <svg
            className="qs-card-three-header"
            viewBox="0 0 311 333"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <g transform="rotate(6 0 0)">
              <image href={config.numberSrc} x="60" y="26" width="17" height="26" />
              <image
                href={`${ASSET_ROOT}/divider-short.webp`}
                x="97"
                y="25"
                width="190"
                height="44.11"
                transform="rotate(3 192 47.055)"
              />
            </g>
          </svg>
        ) : (
          <img className="qs-card-number" src={config.numberSrc} alt="" draggable="false" />
        )}
        {config.number === 1 ? (
          <img
            className="qs-card-one-divider"
            src={`${ASSET_ROOT}/card-1-divider.webp`}
            alt=""
            draggable="false"
          />
        ) : config.number === 2 ? (
          <img
            className="qs-card-divider"
            src={`${ASSET_ROOT}/divider-short.webp`}
            alt=""
            draggable="false"
          />
        ) : null}
        <img className="qs-card-texture" src={config.textureSrc} alt="" draggable="false" />
        <button
          type="button"
          className="qs-card-question"
          aria-label={`选择问题 ${config.number}：${question.text}`}
          aria-pressed={selected}
          onPointerEnter={() => onActivate(config.number)}
          onPointerLeave={() => onActivate(null)}
          onFocus={() => onActivate(config.number)}
          onBlur={() => onActivate(null)}
          onClick={(event) => onOpen(question.id, config.variant, event.currentTarget)}
        >
          {question.text}
        </button>
      </div>
      <CardHotspot
        config={config}
        question={question}
        onActivate={onActivate}
        onOpen={onOpen}
      />
    </div>
  );
}

interface CardHotspotProps {
  config: QuestionCardConfig;
  question: QuestionItem;
  onActivate: (card: QuestionCardNumber | null) => void;
  onOpen: (
    questionId: string,
    cardVariant: QuestionCardVariant,
    trigger: HTMLElement,
  ) => void;
}

function CardHotspot({
  config,
  question,
  onActivate,
  onOpen,
}: CardHotspotProps) {
  return (
    <button
      type="button"
      className={`qs-card-hotspot qs-card-hotspot--${config.number}`}
      tabIndex={-1}
      aria-hidden="true"
      onPointerEnter={() => onActivate(config.number)}
      onPointerLeave={() => onActivate(null)}
      onFocus={() => onActivate(config.number)}
      onBlur={() => onActivate(null)}
      onClick={(event) => onOpen(question.id, config.variant, event.currentTarget)}
    />
  );
}

interface OriginalRecordProps {
  recordText: string;
}

function OriginalRecord({ recordText }: OriginalRecordProps) {
  return (
    <section className="qs-record" aria-labelledby="qs-record-title">
      <h2 id="qs-record-title" className="qs-record-title">刚刚写下的</h2>
      <div className="qs-record-paper-wrap">
        <img
          className="qs-record-paper"
          src={`${ASSET_ROOT}/record-paper.webp`}
          alt=""
          draggable="false"
        />
        <img
          className="qs-record-inner"
          src={`${ASSET_ROOT}/record-inner.webp`}
          alt=""
          draggable="false"
        />
        <div className="qs-record-scroll" tabIndex={0} aria-label="刚刚写下的记录正文">
          <p>{recordText}</p>
        </div>
      </div>
    </section>
  );
}

export default function QuestionSelectionPage() {
  const { startSoftFocusTransition } = useOutletContext<AppLayoutContext>();
  const draft = useRecordStore((state) => state.draft);
  const selectQuestion = useRecordStore((state) => state.selectQuestion);
  const refreshQuestions = useRecordStore(
    (state) => state.refreshQuestionsInCurrentFramework,
  );
  const switchFramework = useRecordStore((state) => state.switchQuestionFramework);
  const [activeCard, setActiveCard] = useState<QuestionCardNumber | null>(null);
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode | null>(null);
  const [swapPhase, setSwapPhase] = useState<SwapPhase>('idle');
  const swapTimersRef = useRef<number[]>([]);

  useEffect(() => () => {
    swapTimersRef.current.forEach(window.clearTimeout);
  }, []);

  if (!draft || !draft.frameworkId || draft.candidateQuestions.length !== 3) {
    return <Navigate to="/record" replace />;
  }

  const openQuestion = (
    questionId: string,
    cardVariant: QuestionCardVariant,
    trigger: HTMLElement,
  ) => {
    if (swapPhase !== 'idle') return;
    selectQuestion(questionId, cardVariant);
    startSoftFocusTransition({
      trigger,
      to: '/question-answer',
      beforeNavigate: () => { void preloadImages(QUESTION_ANSWER_ASSETS); },
      waitFor: () => preloadImages(QUESTION_ANSWER_ASSETS),
    });
  };

  const runQuestionSwap = (mode: ShuffleMode) => {
    if (swapPhase !== 'idle') return;

    setActiveCard(null);
    setShuffleMode(mode);
    setSwapPhase('leaving');

    const leaveTimer = window.setTimeout(() => {
      const currentDraft = useRecordStore.getState().draft;
      if (
        !currentDraft
        || !currentDraft.frameworkId
        || currentDraft.candidateQuestions.length !== 3
      ) {
        setShuffleMode(null);
        setSwapPhase('idle');
        return;
      }

      if (mode === 'questions') {
        const frameworkId = currentDraft.frameworkId;
        const questionSet = drawQuestionSet(
          frameworkId,
          currentDraft.seenQuestionIdsByFramework[frameworkId] ?? [],
          currentDraft.candidateQuestions.map((question) => question.id),
        );
        refreshQuestions(questionSet.questions, questionSet.seenQuestionIds);
      } else {
        const frameworkSet = pickNextFrameworkId(
          currentDraft.frameworkId,
          currentDraft.seenFrameworkIds,
        );
        const questionSet = drawQuestionSet(
          frameworkSet.frameworkId,
          currentDraft.seenQuestionIdsByFramework[frameworkSet.frameworkId] ?? [],
        );
        switchFramework(
          frameworkSet.frameworkId,
          questionSet.questions,
          frameworkSet.seenFrameworkIds,
          questionSet.seenQuestionIds,
        );
      }

      setSwapPhase('entering');
      const enterTimer = window.setTimeout(() => {
        setShuffleMode(null);
        setSwapPhase('idle');
      }, 360);
      swapTimersRef.current.push(enterTimer);
    }, 180);
    swapTimersRef.current.push(leaveTimer);
  };

  return (
    <main className="qs-page">
      <section className="qs-stage" aria-labelledby="qs-page-title">
        <img
          className="qs-background"
          src={`${ASSET_ROOT}/background.webp`}
          alt=""
          draggable="false"
        />

        <h1 id="qs-page-title" className="qs-title">
          选一个问题，<br />
          探索这段经历里还有什么力量
        </h1>
        <span className="qs-title-rule" aria-hidden="true" />

        <OriginalRecord recordText={draft.recordText} />

        <section
          className="qs-rack"
          aria-label="请选择一个继续深思的问题"
          data-swap-phase={swapPhase}
        >
          <img className="qs-rack-back" src={`${ASSET_ROOT}/rack-back.webp`} alt="" draggable="false" />

          {QUESTION_CARD_CONFIGS.map((config, index) => {
            const question = draft.candidateQuestions[index];
            return (
              <QuestionCardVisual
                key={question.id}
                config={config}
                question={question}
                active={activeCard === config.number}
                selected={draft.selectedQuestionId === question.id}
                onActivate={setActiveCard}
                onOpen={openQuestion}
              />
            );
          })}

          <img
            className="qs-rack-middle"
            src={`${ASSET_ROOT}/rack-middle.webp`}
            alt=""
            draggable="false"
          />
          <img
            className="qs-rack-front"
            src={`${ASSET_ROOT}/rack-front.webp`}
            alt=""
            draggable="false"
          />

        </section>

        <nav className="qs-shuffle-actions" aria-label="更换问题">
          <button
            type="button"
            className="qs-shuffle-button"
            disabled={swapPhase !== 'idle'}
            onClick={() => runQuestionSwap('framework')}
          >
            <span aria-hidden="true">↻</span> 换一个深思的角度
          </button>
          <button
            type="button"
            className="qs-shuffle-button"
            disabled={swapPhase !== 'idle'}
            onClick={() => runQuestionSwap('questions')}
          >
            <span aria-hidden="true">↻</span> 换一组问题
          </button>
        </nav>
        <p className="qs-shuffle-status" role="status" aria-live="polite">
          {swapPhase === 'idle'
            ? ''
            : shuffleMode === 'framework'
              ? '正在换一个深思的角度'
              : '正在换一组问题'}
        </p>
      </section>
    </main>
  );
}
