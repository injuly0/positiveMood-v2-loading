import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore, type QuestionItem } from '../store/useRecordStore';
import { fetchQuestionFromLLM, getFallbackQuestions } from '../services/llmServices';
import ThinkingLoader from '../components/ThinkingLoader/ThinkingLoader';
import './QuestionSelectionPage.css';

export default function QuestionSelectionPage() {
  const navigate = useNavigate();
  const recordText = useRecordStore((s) => s.recordText);
  const setFramework = useRecordStore((s) => s.setFramework);
  const setQuestions = useRecordStore((s) => s.setQuestions);
  const setSelectedQuestion = useRecordStore((s) => s.setSelectedQuestion);

  const [framework, setLocalFramework] = useState<string | null>(null);
  const [questions, setLocalQuestions] = useState<QuestionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  // ---- 数据加载 ----
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let result: { framework: string; questions: QuestionItem[]; isFallback?: boolean };
      try {
        result = await fetchQuestionFromLLM(recordText);
      } catch {
        result = getFallbackQuestions();
      }

      if (cancelled) return;

      setLocalFramework(result.framework);
      setLocalQuestions(result.questions);
      setIsFallback(!!result.isFallback);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [recordText]);

  // ---- 交互处理 ----
  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    if (!selectedId || !framework) return;
    const q = questions.find((item) => item.id === selectedId);
    if (!q) return;

    setFramework(framework);
    setQuestions(questions);
    setSelectedQuestion(q);
    navigate('/question-answer');
  };

  // ---- 渲染 ----
  if (loading) {
    return <ThinkingLoader />;
  }

  return (
    <div className="qs-page">
      {/* 框架横幅 */}
      <div className="qs-banner">
        <span className="qs-banner-label">AI 识别框架</span>
        <h2 className="qs-banner-title">{framework}</h2>
      </div>

      {/* 问题卡片列表 */}
      <div className="qs-card-list">
        <p className="qs-card-list-hint">选择最触动你的一个问题</p>
        {questions.map((q) => (
          <button
            key={q.id}
            type="button"
            className={`qs-card ${selectedId === q.id ? 'qs-card--selected' : ''}`}
            onClick={() => handleSelect(q.id)}
          >
            <span className="qs-card-index">
              {questions.findIndex((x) => x.id === q.id) + 1}
            </span>
            <span className="qs-card-text">{q.text}</span>
            <span className="qs-card-check" aria-hidden="true">
              {selectedId === q.id ? '✦' : '○'}
            </span>
          </button>
        ))}
      </div>

      {/* 降级提示 */}
      {isFallback && (
        <p className="qs-fallback-hint">已为你准备通用反思问题</p>
      )}

      {/* 确认按钮 */}
      <div className="qs-actions">
        <button
          type="button"
          className="qs-btn"
          disabled={!selectedId}
          onClick={handleConfirm}
        >
          确认选择，开始反思
        </button>
      </div>
    </div>
  );
}
