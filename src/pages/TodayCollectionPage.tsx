import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppLayoutContext } from '../components/AppLayout/AppLayout';
import { useRecordStore } from '../store/useRecordStore';
import { assetUrl } from '../utils/assetUrl';
import { formatCollectionNumber } from '../utils/formatCollectionNumber';
import './TodayCollectionPage.css';

const ASSET_ROOT = assetUrl('today-collection');

const TODAY_COLLECTION_ASSETS = {
  background: `${ASSET_ROOT}/background.webp`,
  displayBoard: `${ASSET_ROOT}/display-board.webp`,
  shadow: `${ASSET_ROOT}/shadow-overlay.webp`,
  light: `${ASSET_ROOT}/light-overlay.webp`,
  originalPanel: `${ASSET_ROOT}/original-record-panel.png`,
  answerPanel: `${ASSET_ROOT}/reflection-answer-panel.png`,
} as const;

interface ReadOnlyScrollPanelProps {
  assetSrc: string;
  children: ReactNode;
  className: string;
  label: string;
}

const handleScrollRegionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  const viewport = event.currentTarget;
  const lineStep = 38;
  const pageStep = Math.max(lineStep, Math.round(viewport.clientHeight * 0.82));

  switch (event.key) {
    case 'ArrowDown':
      viewport.scrollTop += lineStep;
      break;
    case 'ArrowUp':
      viewport.scrollTop -= lineStep;
      break;
    case 'PageDown':
      viewport.scrollTop += pageStep;
      break;
    case 'PageUp':
      viewport.scrollTop -= pageStep;
      break;
    case 'Home':
      viewport.scrollTop = 0;
      break;
    case 'End':
      viewport.scrollTop = viewport.scrollHeight;
      break;
    default:
      return;
  }

  event.preventDefault();
};

function ReadOnlyScrollPanel({
  assetSrc,
  children,
  className,
  label,
}: ReadOnlyScrollPanelProps) {
  return (
    <div className={`today-collection-panel ${className}`}>
      <img
        className="today-collection-panel-image"
        src={assetSrc}
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <div
        className="today-collection-scroll today-collection-panel-scroll"
        role="region"
        tabIndex={0}
        aria-label={label}
        onKeyDown={handleScrollRegionKeyDown}
      >
        <p>{children}</p>
      </div>
    </div>
  );
}

const getDatePresentation = (timestamp: number) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: '', dateTime: undefined };
  }

  return {
    dateLabel: new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date),
    dateTime: date.toISOString(),
  };
};

export default function TodayCollectionPage() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const { startSoftFocusTransition } = useOutletContext<AppLayoutContext>();
  const entry = useRecordStore((state) => (
    entryId ? state.archive.entriesById[entryId] : undefined
  ));
  const transitionRunningRef = useRef(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!entry) {
      navigate('/display-archive', { replace: true });
    }
  }, [entry, navigate]);

  useEffect(() => {
    void Promise.all([
      document.fonts?.load('33px Italianno'),
      document.fonts?.load('500 48px "Noto Serif SC"'),
    ]);
  }, []);

  if (!entry) return null;

  const { dateLabel, dateTime } = getDatePresentation(entry.createdAt);
  const formattedCollectionNumber = formatCollectionNumber(entry.collectionNumber);

  const handleNavigate = (
    event: MouseEvent<HTMLButtonElement>,
    to: string,
  ) => {
    if (transitionRunningRef.current) return;

    const started = startSoftFocusTransition({
      trigger: event.currentTarget,
      to,
      onError: () => {
        transitionRunningRef.current = false;
        setTransitioning(false);
      },
    });
    if (!started) return;

    transitionRunningRef.current = true;
    setTransitioning(true);
  };

  return (
    <main className="today-collection-page">
      <article className="today-collection-stage" aria-labelledby="today-collection-title">
        <img
          className="today-collection-background"
          src={TODAY_COLLECTION_ASSETS.background}
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <div className="today-collection-header-underlay" aria-hidden="true">
          <span className="today-collection-rule today-collection-date-rule-left" />
          <span className="today-collection-rule today-collection-date-rule-right" />
        </div>

        <time className="today-collection-date" dateTime={dateTime}>
          {dateLabel}
        </time>

        <img
          className="today-collection-display-board"
          src={TODAY_COLLECTION_ASSETS.displayBoard}
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <header className="today-collection-header">
          <h1 id="today-collection-title">今日入馆</h1>
          <span className="today-collection-rule today-collection-subtitle-rule-left" aria-hidden="true" />
          <p>将今天值得留下的一刻，正式收入你的个人馆藏</p>
          <span className="today-collection-rule today-collection-subtitle-rule-right" aria-hidden="true" />
        </header>

        <p
          className="today-collection-number"
          aria-label={`馆藏编号 ${formattedCollectionNumber}`}
        >
          Collection NO.{formattedCollectionNumber}
        </p>

        <section className="today-collection-original" aria-labelledby="today-collection-original-title">
          <h2 id="today-collection-original-title">今天，我想记住</h2>
          <span className="today-collection-title-rule" aria-hidden="true" />
          <ReadOnlyScrollPanel
            assetSrc={TODAY_COLLECTION_ASSETS.originalPanel}
            className="today-collection-original-panel"
            label="用户的原始记录"
          >
            {entry.recordText}
          </ReadOnlyScrollPanel>
        </section>

        <section className="today-collection-reflection" aria-labelledby="today-collection-reflection-title">
          <div
            className="today-collection-scroll today-collection-question-scroll"
            role="region"
            tabIndex={0}
            aria-label={`我问自己：${entry.question.text}`}
            onKeyDown={handleScrollRegionKeyDown}
          >
            <p><span>我问自己：</span>{entry.question.text}</p>
          </div>
          <h2 id="today-collection-reflection-title">原来，这也是我</h2>
          <span className="today-collection-title-rule" aria-hidden="true" />
          <ReadOnlyScrollPanel
            assetSrc={TODAY_COLLECTION_ASSETS.answerPanel}
            className="today-collection-answer-panel"
            label="用户对引导问题的回答"
          >
            {entry.answerText}
          </ReadOnlyScrollPanel>
        </section>

        <img
          className="today-collection-shadow-overlay"
          src={TODAY_COLLECTION_ASSETS.shadow}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <img
          className="today-collection-light-overlay"
          src={TODAY_COLLECTION_ASSETS.light}
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <nav className="today-collection-actions" aria-label="今日入馆后续操作">
          <button
            type="button"
            className="today-collection-action today-collection-enter-archive"
            disabled={transitioning}
            onClick={(event) => handleNavigate(event, '/display-archive')}
          >
            <span aria-hidden="true">←</span>
            进入馆藏
          </button>
          <button
            type="button"
            className="today-collection-action today-collection-record-again"
            disabled={transitioning}
            onClick={(event) => handleNavigate(event, '/record')}
          >
            再记一刻
          </button>
          <button
            type="button"
            className="today-collection-action today-collection-return-home"
            disabled={transitioning}
            onClick={(event) => handleNavigate(event, '/')}
          >
            返回首页
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      </article>
    </main>
  );
}
