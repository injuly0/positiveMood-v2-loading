import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../store/useRecordStore';
import {
  fetchQuestionFromLLM,
  FRAMEWORKS,
  getFallbackQuestions,
  isFrameworkId,
} from '../services/llmServices';
import ThinkingLoader from '../components/ThinkingLoader/ThinkingLoader';
import './QuestionSelectionPage.css';

export default function QuestionSelectionPage() {
  const navigate = useNavigate();
  const draft = useRecordStore((state) => state.draft);
  const updateDraft = useRecordStore((state) => state.updateDraft);
  const selectQuestion = useRecordStore((state) => state.selectQuestion);

  // 请求期间的展示状态无需跨页面或刷新恢复。
  const [loading, setLoading] = useState(
    Boolean(draft && (!draft.frameworkId || draft.candidateQuestions.length === 0)),
  );
  // 仅用于提示本次请求是否进入 fallback，不属于用户档案。
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    if (!draft) {
      navigate('/record', { replace: true });
      return;
    }
    if (draft.frameworkId && draft.candidateQuestions.length > 0) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      let usedFallback = false;
      let result;
      try {
        result = await fetchQuestionFromLLM(draft.recordText);
        if (!isFrameworkId(result.frameworkId)) {
          result = getFallbackQuestions();
          usedFallback = true;
        }
      } catch {
        result = getFallbackQuestions();
        usedFallback = true;
      }

      if (cancelled) return;
      // fallback 自身只会产生受支持的稳定框架 ID。
      if (isFrameworkId(result.frameworkId)) {
        updateDraft({
          frameworkId: result.frameworkId,
          candidateQuestions: result.questions,
          selectedQuestionId: null,
        });
      }
      setIsFallback(usedFallback);
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [draft, navigate, updateDraft]);

  if (!draft) return null;
  if (loading) return <ThinkingLoader />;

  const { frameworkId, candidateQuestions, selectedQuestionId } = draft;
  const handleConfirm = () => {
    if (!selectedQuestionId) return;
    navigate('/question-answer');
  };

  return (
    <div className="qs-page">
      <div className="qs-banner">
        <span className="qs-banner-label">AI 识别框架</span>
        <h2 className="qs-banner-title">
          {frameworkId ? FRAMEWORKS[frameworkId].name : '通用反思'}
        </h2>
      </div>

      <div className="qs-card-list">
        <p className="qs-card-list-hint">选择最触动你的一个问题</p>
        {candidateQuestions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            className={`qs-card ${selectedQuestionId === question.id ? 'qs-card--selected' : ''}`}
            onClick={() => selectQuestion(question.id)}
          >
            <span className="qs-card-index">{index + 1}</span>
            <span className="qs-card-text">{question.text}</span>
            <span className="qs-card-check" aria-hidden="true">
              {selectedQuestionId === question.id ? '✓' : '○'}
            </span>
          </button>
        ))}
      </div>

      {isFallback && <p className="qs-fallback-hint">已为你准备通用反思问题</p>}
      <div className="qs-actions">
        <button
          type="button"
          className="qs-btn"
          disabled={!selectedQuestionId}
          onClick={handleConfirm}
        >
          确认选择，开始反思
        </button>
      </div>
    </div>
  );
}
