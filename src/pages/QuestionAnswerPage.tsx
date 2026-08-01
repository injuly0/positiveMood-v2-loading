import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '../components/AppLayout/AppLayout';
import { FRAMEWORKS } from '../services/llmServices';
import { useRecordStore, type FrameworkId } from '../store/useRecordStore';
import './QuestionAnswerPage.css';

const PLACEHOLDERS: Record<FrameworkId, string> = {
  framework1: '回顾那个最想放弃的瞬间，写下你想对自己说的话…',
  framework2: '用一个画面或一段对话，描述你展现出的那份力量…',
  framework3: '那个瞬间，你内心真正被满足的是什么…',
  framework4: '这份温暖从哪里来，带你去到了哪里…',
  framework5: '闭上眼睛，让那个画面再次浮现，写下你的感受…',
};

export default function QuestionAnswerPage() {
  const navigate = useNavigate();
  const { startCrystallizing } = useOutletContext<AppLayoutContext>();
  const draft = useRecordStore((state) => state.draft);
  const updateDraft = useRecordStore((state) => state.updateDraft);
  const commitDraft = useRecordStore((state) => state.commitDraft);
  // commitDraft 会同步清空草稿；该标记避免空数据守卫覆盖成功提交后的目标路由。
  const isSubmittingRef = useRef(false);

  // 仅控制原始记录区域在当前页面是否展开。
  const [recordExpanded, setRecordExpanded] = useState(false);

  const selectedQuestion = draft?.candidateQuestions.find(
    (question) => question.id === draft.selectedQuestionId,
  );

  useEffect(() => {
    if (isSubmittingRef.current) return;

    if (!draft?.recordText.trim()) {
      navigate('/record', { replace: true });
    } else if (!draft.frameworkId || !selectedQuestion) {
      navigate('/question-selection', { replace: true });
    }
  }, [draft, navigate, selectedQuestion]);

  // 守卫未通过时不渲染，避免重定向生效前短暂显示残缺页面。
  if (!draft?.recordText.trim() || !draft.frameworkId || !selectedQuestion) return null;

  const handleSubmit = () => {
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
    <div className="qa-page">
      <div className="qa-step">
        <span className="qa-step-label">反思书写</span>
      </div>

      <div className="qa-context">
        <span className="qa-framework-tag">{FRAMEWORKS[draft.frameworkId].name}</span>
        <div className="qa-record-section">
          <button
            type="button"
            className="qa-record-toggle"
            onClick={() => setRecordExpanded((value) => !value)}
          >
            你的记录 <span className="qa-chevron">{recordExpanded ? '▾' : '▸'}</span>
          </button>
          {recordExpanded && <p className="qa-record-text">{draft.recordText}</p>}
        </div>

        <div className="qa-question-card">
          <span className="qa-question-badge">此刻，请回答</span>
          <p className="qa-question-text">{selectedQuestion.text}</p>
        </div>
      </div>

      <div className="qa-editor">
        <p className="qa-editor-hint">{PLACEHOLDERS[draft.frameworkId]}</p>
        <textarea
          className="qa-textarea"
          value={draft.answerText}
          onChange={(event) => updateDraft({ answerText: event.target.value })}
          placeholder={PLACEHOLDERS[draft.frameworkId]}
          rows={6}
        />
        <span className="qa-charcount">{draft.answerText.length} 字</span>
      </div>

      <div className="qa-actions">
        <button
          type="button"
          className="qa-btn qa-btn--primary"
          disabled={!draft.answerText.trim()}
          onClick={handleSubmit}
        >
          生成我的反思
        </button>
        <button
          type="button"
          className="qa-btn qa-btn--ghost"
          onClick={() => navigate('/question-selection')}
        >
          ← 重新选一个问题
        </button>
      </div>
    </div>
  );
}
