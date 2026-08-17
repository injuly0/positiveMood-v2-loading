import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FRAMEWORKS } from '../data/reflectionQuestions';
import {
  getEnvelopeLevel,
  selectHighlightEntries,
  selectTimelineEntries,
  useRecordStore,
  type MemoryEntry,
} from '../store/useRecordStore';

type ArchiveMode = 'timeline' | 'highlights' | 'surprise';

interface ArchiveLocationState {
  createdEntryId?: string;
}

export default function DisplayArchivePage() {
  const location = useLocation();
  const createdEntryId = (location.state as ArchiveLocationState | null)?.createdEntryId ?? null;
  const archive = useRecordStore((state) => state.archive);
  const viewEntry = useRecordStore((state) => state.viewEntry);
  const polishEntry = useRecordStore((state) => state.polishEntry);
  const toggleFavorite = useRecordStore((state) => state.toggleFavorite);

  // 展示模式、详情弹窗和偶遇结果都只属于当前展示页。
  const [mode, setMode] = useState<ArchiveMode>('timeline');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [surpriseEntryId, setSurpriseEntryId] = useState<string | null>(null);

  const timelineEntries = useMemo(
    () => selectTimelineEntries({ ...useRecordStore.getState(), archive }),
    [archive],
  );
  const highlightEntries = useMemo(
    () => selectHighlightEntries({ ...useRecordStore.getState(), archive }),
    [archive],
  );
  const visibleEntries = mode === 'highlights' ? highlightEntries : timelineEntries;
  const selectedEntry = selectedEntryId ? archive.entriesById[selectedEntryId] : null;

  const openEntry = (id: string) => {
    setSelectedEntryId(id);
    viewEntry(id);
  };

  const renderEntry = (entry: MemoryEntry) => (
    <button
      type="button"
      key={entry.id}
      onClick={() => openEntry(entry.id)}
      style={{
        padding: 20,
        borderRadius: 14,
        border: entry.id === createdEntryId ? '2px solid #aa3bff' : '1px solid #d9cfee',
        background: '#fff',
        color: '#2d2048',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <strong>{entry.recordText}</strong>
      <div style={{ marginTop: 10, color: '#766895', fontSize: 13 }}>
        {FRAMEWORKS[entry.frameworkId].name} · 信封等级 {getEnvelopeLevel(entry.polishCount)}
        {entry.favoritedAt !== null ? ' · 已收藏' : ''}
      </div>
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '48px', color: '#2d2048', background: '#f8f4ff' }}>
      <h2 style={{ textAlign: 'center' }}>积极记忆档案</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '24px 0' }}>
        {([
          ['timeline', '回顾'],
          ['highlights', '高光'],
          ['surprise', '偶遇'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              if (value !== 'surprise') setSurpriseEntryId(null);
            }}
            disabled={mode === value}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'surprise' ? (
        <p style={{ textAlign: 'center', color: '#766895' }}>
          {surpriseEntryId
            ? '已遇见一封记忆'
            : '偶遇筛选与随机策略将在展示页设计阶段实现。'}
        </p>
      ) : visibleEntries.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#766895' }}>还没有归档的积极记忆。</p>
      ) : (
        <div style={{ display: 'grid', gap: 14, maxWidth: 760, margin: '0 auto' }}>
          {visibleEntries.map(renderEntry)}
        </div>
      )}

      {selectedEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="积极记忆详情"
          style={{
            position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
            padding: 24, background: 'rgba(35, 24, 58, .45)',
          }}
        >
          <article style={{ maxWidth: 620, padding: 28, borderRadius: 18, background: '#fff' }}>
            <button type="button" onClick={() => setSelectedEntryId(null)} style={{ float: 'right' }}>关闭</button>
            <h3>{selectedEntry.recordText}</h3>
            <p><strong>{selectedEntry.question.text}</strong></p>
            <p>{selectedEntry.answerText}</p>
            <p style={{ color: '#766895' }}>
              查看 {selectedEntry.viewCount} · 擦亮 {selectedEntry.polishCount}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => polishEntry(selectedEntry.id)}>擦亮</button>
              <button type="button" onClick={() => toggleFavorite(selectedEntry.id)}>
                {selectedEntry.favoritedAt === null ? '收藏' : '取消收藏'}
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
