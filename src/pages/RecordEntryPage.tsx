import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../store/useRecordStore';

export default function RecordEntryPage() {
  // 输入内容只控制当前页面；正式开始流程时才创建可恢复的业务草稿。
  const [inputText, setInputText] = useState('');
  const navigate = useNavigate();
  const draft = useRecordStore((state) => state.draft);
  const beginDraft = useRecordStore((state) => state.beginDraft);
  const resetDraft = useRecordStore((state) => state.resetDraft);

  const handleSubmit = () => {
    const recordText = inputText.trim();
    if (!recordText) {
      window.alert('请输入一些内容后再提交哦！');
      return;
    }

    if (draft) {
      const shouldReplace = window.confirm(
        '你还有一份未完成的反思草稿。要放弃它并开始新记录吗？',
      );
      if (!shouldReplace) return;
      resetDraft();
    }

    beginDraft(recordText);
    navigate('/question-selection');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>开始记录你内心的想法</h1>
      <p style={{ color: '#666' }}>请详细描述今天发生了什么，以及你当下的感受与信念。</p>
      <textarea
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        placeholder="今天发生了什么？你的感受是什么…"
        style={{
          width: '100%', height: '150px', padding: '12px', marginTop: '20px',
          borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        style={{
          marginTop: '20px', padding: '12px 24px', backgroundColor: '#aa3bff',
          color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px',
          cursor: 'pointer', width: '100%',
        }}
      >
        提交记录并继续
      </button>
    </div>
  );
}
