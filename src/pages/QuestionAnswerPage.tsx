import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../store/useRecordStore';
import './QuestionAnswerPage.css';

// ============================================================
// 按框架分类的引导文案
// ============================================================
function getPlaceholder(framework: string): string {
  const map: Record<string, string> = {
    '逆境重评与复原力': '回顾那个最想放弃的瞬间，写下你想对自己说的话…',
    '内在力量与优势确立': '用一个画面或一段对话，描述你展现出的那份力量…',
    '意义建构与价值对齐': '那个瞬间，你内心真正被满足的是什么…',
    '感恩与联结': '这份温暖从哪里来，带你去到了哪里…',
    '纯粹品味与心流延展': '闭上眼睛，让那个画面再次浮现，写下你的感受…',
  };

  // 匹配包含关键字的框架名
  for (const [key, value] of Object.entries(map)) {
    if (framework.includes(key)) return value;
  }
  return '写下你的想法，让这份感受在文字里停留得更久…';
}

export default function QuestionAnswerPage() {
  const navigate = useNavigate();
  const recordText = useRecordStore((s) => s.recordText);
  const framework = useRecordStore((s) => s.framework);
  const selectedQuestion = useRecordStore((s) => s.selectedQuestion);
  const setUserAnswer = useRecordStore((s) => s.setUserAnswer);
  const setAnsweredAt = useRecordStore((s) => s.setAnsweredAt);
  const setCrystallizing = useRecordStore((s) => s.setCrystallizing);

  const [answer, setAnswer] = useState('');
  const [recordExpanded, setRecordExpanded] = useState(false);

  // ---- 空数据守卫 ----
  useEffect(() => {
    if (!recordText) {
      navigate('/record', { replace: true });
      return;
    }
    if (!selectedQuestion) {
      navigate('/question-selection', { replace: true });
    }
  }, [recordText, selectedQuestion, navigate]);

  // 守卫未通过时不渲染
  if (!recordText || !selectedQuestion) return null;

  // ---- 交互处理 ----
  const handleBack = () => {
    navigate('/question-selection');
  };

  const handleSubmit = () => {
    if (!answer.trim()) return;

    setUserAnswer(answer.trim());
    setAnsweredAt(Date.now());
    setCrystallizing(true);
    navigate('/display-archive');
  };

  const placeholder = getPlaceholder(framework ?? '');

  // ---- 渲染 ----
  return (
    <div className="qa-page">
      {/* 步骤指示 */}
      <div className="qa-step">
        <span className="qa-step-label">反思书写</span>
      </div>

      {/* ===== ContextViewer ===== */}
      <div className="qa-context">
        {/* 框架标签 */}
        {framework && <span className="qa-framework-tag">{framework}</span>}

        {/* 原始记录（在上） */}
        <div className="qa-record-section">
          <button
            type="button"
            className="qa-record-toggle"
            onClick={() => setRecordExpanded((v) => !v)}
          >
            你的记录 <span className="qa-chevron">{recordExpanded ? '▾' : '▸'}</span>
          </button>
          {recordExpanded && (
            <p className="qa-record-text">{recordText}</p>
          )}
        </div>

        {/* 选中问题（在下） */}
        <div className="qa-question-card">
          <span className="qa-question-badge">此刻，请回答</span>
          <p className="qa-question-text">{selectedQuestion.text}</p>
        </div>
      </div>

      {/* ===== ResponseEditor ===== */}
      <div className="qa-editor">
        <p className="qa-editor-hint">{placeholder}</p>
        <textarea
          className="qa-textarea"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={placeholder}
          rows={6}
        />
        <span className="qa-charcount">{answer.length} 字</span>
      </div>

      {/* ===== ActionArea ===== */}
      <div className="qa-actions">
        <button
          type="button"
          className="qa-btn qa-btn--primary"
          disabled={!answer.trim()}
          onClick={handleSubmit}
        >
          生成我的反思
        </button>
        <button
          type="button"
          className="qa-btn qa-btn--ghost"
          onClick={handleBack}
        >
          ← 重新选一个问题
        </button>
      </div>
    </div>
  );
}
