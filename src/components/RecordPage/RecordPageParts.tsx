import type { ChangeEventHandler, ReactNode } from 'react';
import { assetUrl } from '../../utils/assetUrl';

export type SaveState = 'default' | 'saving' | 'saved' | 'error';

const SAVE_COPY: Record<SaveState, string> = {
  default: '',
  saving: '保存中…',
  saved: '✓ 已保存',
  error: '保存失败',
};

export function RecordPageBackground() {
  return (
    <img
      className="record-page-background"
      src={assetUrl('record/record-background.webp')}
      alt=""
      aria-hidden="true"
    />
  );
}

export function LetterArtworkImage() {
  return (
    <img
      className="letter-artwork-image"
      src={assetUrl('record/letter-artwork.webp')}
      alt=""
      aria-hidden="true"
    />
  );
}

interface ShufflePromptButtonProps {
  onClick: () => void;
}

export function ShufflePromptButton({ onClick }: ShufflePromptButtonProps) {
  return (
    <button className="shuffle-prompt-button" type="button" onClick={onClick}>
      <span>换一个</span>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M12.7 3.3v3.1H9.6" />
        <path d="M12.2 6.2A4.8 4.8 0 1 0 12 10.1" />
      </svg>
    </button>
  );
}

interface LetterEditorProps {
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
}

export function LetterEditor({ value, onChange }: LetterEditorProps) {
  return (
    <div className="letter-editor-shell">
      <textarea
        className="letter-editor"
        value={value}
        onChange={onChange}
        aria-label="写下今天想留住的事情"
        placeholder="可以从上面的问题开始，也可以写下此刻最想留住的事情……不用写得完整，也不一定是大事，写下今天让你感觉好一点的事情就好。"
        spellCheck="false"
      />
    </div>
  );
}

export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span className={`save-status save-status--${state}`} aria-live="polite">
      {SAVE_COPY[state]}
    </span>
  );
}

interface LetterFooterProps {
  saveState: SaveState;
  wordCount: number;
  onCollect: (trigger: HTMLButtonElement) => void;
  collectDisabled: boolean;
}

export function LetterFooter({
  saveState,
  wordCount,
  onCollect,
  collectDisabled,
}: LetterFooterProps) {
  return (
    <footer className="letter-footer">
      <div className="record-status-group">
        {saveState !== 'default' && (
          <>
            <SaveStatus state={saveState} />
            <span className="record-status-separator" aria-hidden="true">·</span>
          </>
        )}
        <span className="word-count">{wordCount}字</span>
      </div>
      <button
        className="collect-memory-button"
        type="button"
        disabled={collectDisabled}
        onClick={(event) => onCollect(event.currentTarget)}
      >
        收藏这份记忆 <span aria-hidden="true">→</span>
      </button>
    </footer>
  );
}

interface DraftConflictDialogProps {
  onContinue: () => void;
  onDiscard: () => void;
}

export function DraftConflictDialog({ onContinue, onDiscard }: DraftConflictDialogProps) {
  return (
    <div className="draft-conflict-backdrop" role="presentation">
      <section
        className="draft-conflict-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-conflict-title"
      >
        <p className="draft-conflict-kicker">一封未完成的信</p>
        <h2 id="draft-conflict-title">要继续上次的反思吗？</h2>
        <p>你的文字还好好地保存在这里。</p>
        <div className="draft-conflict-actions">
          <button type="button" className="draft-conflict-continue" onClick={onContinue}>
            继续上次反思
          </button>
          <button type="button" className="draft-conflict-discard" onClick={onDiscard}>
            放弃并开始新记录
          </button>
        </div>
      </section>
    </div>
  );
}

export function LetterContentOverlay({ children }: { children: ReactNode }) {
  return <div className="letter-content-overlay">{children}</div>;
}
