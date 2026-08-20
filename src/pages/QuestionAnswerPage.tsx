import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '../components/AppLayout/AppLayout';
import type { QuestionCardVariant } from '../data/questionCardVariants';
import { useRecordStore } from '../store/useRecordStore';
import { assetUrl } from '../utils/assetUrl';
import './QuestionAnswerPage.css';

const ASSET_ROOT = assetUrl('question-answer');

const ANSWER_ASSETS = {
  background: `${ASSET_ROOT}/background.png`,
  brassRack: `${ASSET_ROOT}/brass-rack.png`,
  laceFrame: `${ASSET_ROOT}/lace-frame.png`,
  questionCard: `${ASSET_ROOT}/question-card-base.png`,
};

const CARD_TINTS: Record<QuestionCardVariant, string> = {
  // 底色会与 38% 的暖白基础素材合成，因此使用补偿色匹配选题页最终观感。
  pink: '#d9bfc0',
  green: '#beccaf',
  blue: '#b6ccd3',
};

const ANSWER_PLACEHOLDER =
  '顺着这个问题，再回头看一眼刚刚写下的事。\n'
  + '留意此刻新出现的感受、联系或理解，\n'
  + '从最先浮现的那句话开始写';

export default function QuestionAnswerPage() {
  const navigate = useNavigate();
  const { startCrystallizing, startSoftFocusTransition } =
    useOutletContext<AppLayoutContext>();
  const draft = useRecordStore((state) => state.draft);
  const updateDraft = useRecordStore((state) => state.updateDraft);
  const commitDraft = useRecordStore((state) => state.commitDraft);

  // commitDraft 会同步清空草稿；该标记避免守卫覆盖成功提交后的目标路由。
  const isSubmittingRef = useRef(false);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  const selectedQuestion = draft?.candidateQuestions.find(
    (question) => question.id === draft.selectedQuestionId,
  );
  const canRenderPage = Boolean(
    draft?.recordText.trim()
    && draft.frameworkId
    && selectedQuestion
    && draft.selectedCardVariant,
  );

  useEffect(() => {
    if (isSubmittingRef.current) return;

    if (!draft?.recordText.trim()) {
      navigate('/record', { replace: true });
    } else if (!draft.frameworkId || !selectedQuestion || !draft.selectedCardVariant) {
      navigate('/question-selection', { replace: true });
    }
  }, [draft, navigate, selectedQuestion]);

  useEffect(() => {
    if (!canRenderPage) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const input = answerInputRef.current;
      if (!input) return;

      input.focus({ preventScroll: true });
      const caretPosition = input.value.length;
      input.setSelectionRange(caretPosition, caretPosition);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [canRenderPage, selectedQuestion?.id]);

  if (
    !draft?.recordText.trim()
    || !draft.frameworkId
    || !selectedQuestion
    || !draft.selectedCardVariant
  ) {
    return null;
  }

  const questionCardStyle = {
    '--qa-card-tint': CARD_TINTS[draft.selectedCardVariant],
  } as CSSProperties;

  const handleReselect = (event: MouseEvent<HTMLButtonElement>) => {
    startSoftFocusTransition({
      trigger: event.currentTarget,
      to: '/question-selection',
    });
  };

  const handleSubmit = () => {
    if (!draft.answerText.trim() || isSubmittingRef.current) return;

    // 必须在 commitDraft 之前设置；归档会同步触发当前页面重新渲染。
    isSubmittingRef.current = true;
    const entryId = commitDraft();
    if (!entryId) {
      isSubmittingRef.current = false;
      return;
    }

    startCrystallizing();
    navigate('/display-archive', { state: { createdEntryId: entryId } });
  };

  return (
    <main className="qa-page">
      <div className="qa-stage">
        <img
          className="qa-background"
          src={ANSWER_ASSETS.background}
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <img
          className="qa-brass-rack"
          src={ANSWER_ASSETS.brassRack}
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <section className="qa-question-section" aria-labelledby="qa-question-heading">
          <h2 id="qa-question-heading" className="qa-section-title qa-question-title">
            选择的问题
          </h2>
          <button type="button" className="qa-reselect-button" onClick={handleReselect}>
            <span aria-hidden="true">←</span>
            重新选择
          </button>

          <div
            className="qa-selected-question-card"
            data-variant={draft.selectedCardVariant}
            style={questionCardStyle}
          >
            <span className="qa-question-card-tint" aria-hidden="true" />
            <img
              className="qa-question-card-image"
              src={ANSWER_ASSETS.questionCard}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <p
              id="qa-selected-question"
              className="qa-selected-question-text"
              tabIndex={0}
              aria-label={`选择的问题：${selectedQuestion.text}`}
            >
              {selectedQuestion.text}
            </p>
          </div>
        </section>

        <section className="qa-record-section" aria-labelledby="qa-record-heading">
          <h2 id="qa-record-heading" className="qa-section-title qa-record-title">
            刚刚写下的
          </h2>
          <div className="qa-record-paper">
            <div className="qa-record-paper-inner">
              <div
                className="qa-record-scroll"
                role="region"
                tabIndex={0}
                aria-label="刚刚写下的原始记录"
              >
                <p>{draft.recordText}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="qa-answer-section" aria-labelledby="qa-answer-heading">
          <h1 id="qa-answer-heading" className="qa-section-title qa-answer-title">
            写下回答
          </h1>
          <span className="qa-answer-title-rule" aria-hidden="true" />

          <div className="qa-answer-paper" aria-hidden="true" />
          <div className="qa-answer-editor-surface" aria-hidden="true" />
          <img
            className="qa-lace-frame"
            src={ANSWER_ASSETS.laceFrame}
            alt=""
            aria-hidden="true"
            draggable="false"
          />

          <label className="qa-sr-only" htmlFor="qa-answer-input">
            写下回答
          </label>
          <textarea
            id="qa-answer-input"
            ref={answerInputRef}
            className="qa-answer-input"
            value={draft.answerText}
            onChange={(event) => updateDraft({ answerText: event.target.value })}
            placeholder={ANSWER_PLACEHOLDER}
            aria-describedby="qa-selected-question"
          />

          <button
            type="button"
            className="qa-submit-button"
            disabled={!draft.answerText.trim()}
            onClick={handleSubmit}
          >
            <span aria-hidden="true">→</span>
            收藏这份回答
          </button>
        </section>
      </div>
    </main>
  );
}
