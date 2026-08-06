import { Navigate, useNavigate } from 'react-router-dom';
import { useRecordStore } from '../store/useRecordStore';
import { FRAMEWORKS } from '../services/llmServices';
import './QuestionSelectionPage.css';

export default function QuestionSelectionPage() {
  const navigate = useNavigate();
  const draft = useRecordStore((state) => state.draft);
  const selectQuestion = useRecordStore((state) => state.selectQuestion);

  if (!draft || !draft.frameworkId || draft.candidateQuestions.length !== 3) {
    return <Navigate to="/record" replace />;
  }

  const { frameworkId, candidateQuestions, selectedQuestionId } = draft;
  const isFallback = draft.questionSource === 'fallback';
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
