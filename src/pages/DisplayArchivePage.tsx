import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '../components/AppLayout/AppLayout';
import { useRecordStore, type MemoryEntry } from '../store/useRecordStore';
import { assetUrl } from '../utils/assetUrl';
import { formatCollectionNumber } from '../utils/formatCollectionNumber';
import './DisplayArchivePage.css';

type ArchiveMode = 'timeline' | 'random' | 'favorites';
type MonthKey = `${number}-${string}`;
type PagingDirection = 'left' | 'right';

interface ArchiveLocationState {
  createdEntryId?: string;
}

interface ArchiveMonth {
  key: MonthKey;
  year: number;
  monthIndex: number;
  entries: MemoryEntry[];
}

const VISIBLE_CARD_COUNT = 5;
const PAGING_DURATION_MS = 420;
const LIFT_DURATION_MS = 260;

const MODE_OPTIONS = [
  { value: 'timeline', label: '时间线', title: 'Collection • Timeline' },
  { value: 'random', label: '随机逛逛', title: 'Collection • Random' },
  { value: 'favorites', label: '珍藏记忆', title: 'Collection • Favorites' },
] as const;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DISPLAY_ASSETS = {
  background: assetUrl('display-archive/background.png'),
  rackBack: assetUrl('display-archive/rack/rack-back.png'),
  rackFront: assetUrl('display-archive/rack/rack-front.png'),
  rackShadow: assetUrl('display-archive/shadows/rack-shadow.png'),
  cards: Array.from(
    { length: VISIBLE_CARD_COUNT },
    (_, index) => assetUrl(`display-archive/cards/card-shell-${String(index + 1).padStart(2, '0')}.png`),
  ),
} as const;

const getMonthKey = (timestamp: number): MonthKey => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}` as MonthKey;
};

const sortTimeline = (entries: readonly MemoryEntry[]) => [...entries].sort((a, b) => (
  a.createdAt - b.createdAt
  || a.collectionNumber - b.collectionNumber
  || a.id.localeCompare(b.id)
));

const shuffleIds = (ids: readonly string[], previousIds: readonly string[] = []) => {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  if (
    result.length > 1
    && result.length === previousIds.length
    && result.every((id, index) => id === previousIds[index])
  ) {
    result.push(result.shift() as string);
  }

  return result;
};

const getEntryDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const getShadowAsset = (kind: 'card' | 'contact', visibleCount: number) => (
  assetUrl(`display-archive/shadows/${kind}-shadow-${visibleCount}.png`)
);

const getLatestWindowStart = (entryCount: number) => (
  Math.max(0, entryCount - VISIBLE_CARD_COUNT)
);

export default function DisplayArchivePage() {
  const location = useLocation();
  const { startSoftFocusTransition } = useOutletContext<AppLayoutContext>();
  const createdEntryId = (location.state as ArchiveLocationState | null)?.createdEntryId ?? null;
  const archive = useRecordStore((state) => state.archive);
  const viewEntry = useRecordStore((state) => state.viewEntry);
  const [mode, setMode] = useState<ArchiveMode>('timeline');
  const [selectedMonthKey, setSelectedMonthKey] = useState<MonthKey | null>(null);
  const [windowStart, setWindowStart] = useState(Number.POSITIVE_INFINITY);
  const [randomOrderIds, setRandomOrderIds] = useState<string[]>([]);
  const [pagingDirection, setPagingDirection] = useState<PagingDirection | null>(null);
  const [liftingEntryId, setLiftingEntryId] = useState<string | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const allEntries = useMemo(
    () => Object.values(archive.entriesById),
    [archive.entriesById],
  );

  const months = useMemo<ArchiveMonth[]>(() => {
    const groups = new Map<MonthKey, ArchiveMonth>();
    allEntries.forEach((entry) => {
      const date = new Date(entry.createdAt);
      const key = getMonthKey(entry.createdAt);
      const existing = groups.get(key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.set(key, {
          key,
          year: date.getFullYear(),
          monthIndex: date.getMonth(),
          entries: [entry],
        });
      }
    });

    return [...groups.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((month) => ({ ...month, entries: sortTimeline(month.entries) }));
  }, [allEntries]);

  useEffect(() => () => {
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      document.fonts?.load('50px Italianno'),
      document.fonts?.load('500 30px "Noto Serif SC"'),
    ]);
  }, []);

  const effectiveMonthKey = selectedMonthKey && months.some((month) => month.key === selectedMonthKey)
    ? selectedMonthKey
    : months.at(-1)?.key ?? null;
  const selectedMonth = months.find((month) => month.key === effectiveMonthKey) ?? null;
  const selectedYear = selectedMonth?.year ?? new Date().getFullYear();
  const displayedMonths = months.filter((month) => month.year === selectedYear);
  const timelineEntries = useMemo(
    () => selectedMonth?.entries ?? [],
    [selectedMonth],
  );

  const effectiveRandomOrderIds = useMemo(() => {
    const ids = timelineEntries.map((entry) => entry.id);
    const matchesCurrentSet = ids.length === randomOrderIds.length
      && ids.every((id) => randomOrderIds.includes(id));
    return matchesCurrentSet ? randomOrderIds : ids;
  }, [randomOrderIds, timelineEntries]);

  const modeEntries = useMemo(() => {
    if (mode === 'favorites') {
      return timelineEntries.filter((entry) => entry.favoritedAt !== null);
    }
    if (mode === 'random') {
      const entriesById = new Map(timelineEntries.map((entry) => [entry.id, entry]));
      return effectiveRandomOrderIds
        .map((id) => entriesById.get(id))
        .filter((entry): entry is MemoryEntry => Boolean(entry));
    }
    return timelineEntries;
  }, [effectiveRandomOrderIds, mode, timelineEntries]);

  const maxWindowStart = getLatestWindowStart(modeEntries.length);
  const effectiveWindowStart = Math.min(windowStart, maxWindowStart);

  const visibleEntries = modeEntries.slice(
    effectiveWindowStart,
    effectiveWindowStart + VISIBLE_CARD_COUNT,
  );
  const visibleCount = visibleEntries.length;
  const showPagingControls = modeEntries.length > VISIBLE_CARD_COUNT;
  const canPageLeft = effectiveWindowStart > 0;
  const canPageRight = effectiveWindowStart < maxWindowStart;
  const activeMode = MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0];

  const reshuffle = useCallback(() => {
    const ids = timelineEntries.map((entry) => entry.id);
    setRandomOrderIds((previous) => shuffleIds(ids, previous));
    setWindowStart(0);
  }, [timelineEntries]);

  const handleModeChange = (nextMode: ArchiveMode) => {
    if (pagingDirection || liftingEntryId) return;
    if (nextMode === 'random') {
      reshuffle();
      setMode('random');
      return;
    }

    setMode(nextMode);
    const nextEntries = nextMode === 'favorites'
      ? timelineEntries.filter((entry) => entry.favoritedAt !== null)
      : timelineEntries;
    setWindowStart(getLatestWindowStart(nextEntries.length));
  };

  const handleMonthChange = (month: ArchiveMonth) => {
    if (pagingDirection || liftingEntryId || month.key === effectiveMonthKey) return;
    setSelectedMonthKey(month.key);
    if (mode === 'random') {
      setRandomOrderIds(shuffleIds(month.entries.map((entry) => entry.id)));
      setWindowStart(0);
      return;
    }
    const nextEntries = mode === 'favorites'
      ? month.entries.filter((entry) => entry.favoritedAt !== null)
      : month.entries;
    setWindowStart(getLatestWindowStart(nextEntries.length));
  };

  const page = useCallback((direction: PagingDirection) => {
    if (pagingDirection || liftingEntryId) return;
    if (direction === 'left' && !canPageLeft) return;
    if (direction === 'right' && !canPageRight) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setWindowStart(direction === 'left' ? effectiveWindowStart - 1 : effectiveWindowStart + 1);
      return;
    }

    setPagingDirection(direction);
    window.setTimeout(() => {
      setWindowStart(direction === 'left' ? effectiveWindowStart - 1 : effectiveWindowStart + 1);
      setPagingDirection(null);
    }, PAGING_DURATION_MS);
  }, [canPageLeft, canPageRight, effectiveWindowStart, liftingEntryId, pagingDirection]);

  const handleRackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      page('left');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      page('right');
    }
  };

  const openEntry = (trigger: HTMLElement, entry: MemoryEntry) => {
    if (pagingDirection || liftingEntryId) return;
    setLiftingEntryId(entry.id);

    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null;
      const started = startSoftFocusTransition({
        trigger,
        to: `/today-collection/${entry.id}?from=archive`,
        beforeNavigate: () => viewEntry(entry.id),
        onError: () => setLiftingEntryId(null),
      });
      if (!started) setLiftingEntryId(null);
    }, LIFT_DURATION_MS);
  };

  const openEntryFromKeyboard = (event: KeyboardEvent<HTMLElement>, entry: MemoryEntry) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openEntry(event.currentTarget, entry);
  };

  const emptyMessage = allEntries.length === 0
    ? ['这里还没有馆藏', '完成今天的记录后，', '第一张卡片会出现在这里']
    : ['这里还没有珍贵记忆', '擦亮一张卡片后，它会被珍藏在这里'];

  return (
    <main className="display-archive-page">
      <section className="display-archive-stage" aria-labelledby="display-archive-title">
        <img className="display-archive-background" src={DISPLAY_ASSETS.background} alt="" aria-hidden="true" draggable="false" />

        <header className="display-archive-heading">
          <h1 id="display-archive-title">{activeMode.title}</h1>
        </header>

        <nav className="display-archive-months" aria-label="按月份筛选馆藏">
          <p className="display-archive-year">{selectedYear}</p>
          <div className="display-archive-month-list">
            <span className="display-archive-month-line" aria-hidden="true" />
            {displayedMonths.map((month) => {
              const selected = month.key === effectiveMonthKey;
              return (
                <button
                  type="button"
                  key={month.key}
                  className={`display-archive-month${selected ? ' is-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => handleMonthChange(month)}
                >
                  <span className="display-archive-month-dot" aria-hidden="true" />
                  <span className="display-archive-month-en">{MONTH_NAMES[month.monthIndex]}</span>
                  <span className="display-archive-month-zh">{month.monthIndex + 1}月</span>
                </button>
              );
            })}
          </div>
        </nav>

        <nav className="display-archive-modes" aria-label="馆藏展示方式">
          <span className="display-archive-mode-line" aria-hidden="true" />
          {MODE_OPTIONS.map((option, index) => {
            const selected = option.value === mode;
            return (
              <button
                type="button"
                key={option.value}
                className={`display-archive-mode${selected ? ' is-selected' : ''}`}
                style={{ '--mode-index': index } as CSSProperties}
                aria-pressed={selected}
                onClick={() => handleModeChange(option.value)}
              >
                {option.label}
                <span className="display-archive-mode-dot" aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        {visibleCount > 0 ? (
          <div
            className="display-archive-rack-scene"
            role="region"
            tabIndex={0}
            aria-label={`当前显示 ${visibleCount} 张馆藏卡片，可使用左右方向键翻页`}
            onKeyDown={handleRackKeyDown}
          >
            <img className="display-archive-full-layer display-archive-rack-shadow" src={DISPLAY_ASSETS.rackShadow} alt="" aria-hidden="true" draggable="false" />
            <img className="display-archive-rack-back" src={DISPLAY_ASSETS.rackBack} alt="" aria-hidden="true" draggable="false" />
            <img
              className={`display-archive-full-layer display-archive-card-shadow${pagingDirection ? ` is-paging-${pagingDirection}` : ''}`}
              src={getShadowAsset('card', visibleCount)}
              alt=""
              aria-hidden="true"
              draggable="false"
            />

            <div className={`display-archive-card-track${pagingDirection ? ` is-paging-${pagingDirection}` : ''}`}>
              {visibleEntries.map((entry, slotIndex) => (
                <article
                  key={entry.id}
                  className={`display-archive-card display-archive-card-slot-${slotIndex + 1}${entry.id === liftingEntryId ? ' is-lifting' : ''}${entry.id === createdEntryId ? ' is-new' : ''}`}
                  onClick={(event) => openEntry(event.currentTarget, entry)}
                  onKeyDown={(event) => openEntryFromKeyboard(event, entry)}
                  role="button"
                  tabIndex={0}
                  aria-label={`打开馆藏 ${formatCollectionNumber(entry.collectionNumber)}：${entry.recordText}`}
                >
                  <img className="display-archive-card-shell" src={DISPLAY_ASSETS.cards[slotIndex]} alt="" aria-hidden="true" draggable="false" />
                  <div className="display-archive-card-copy">
                    <div className="display-archive-card-meta">
                      <span>NO.{formatCollectionNumber(entry.collectionNumber)}</span>
                      <time dateTime={new Date(entry.createdAt).toISOString()}>{getEntryDate(entry.createdAt)}</time>
                    </div>
                    <p className="display-archive-card-number">Collection No.{formatCollectionNumber(entry.collectionNumber)}</p>
                    <div
                      className="display-archive-card-record"
                      role="region"
                      tabIndex={0}
                      aria-label="记录正文，可滚动"
                    >
                      <p>{entry.recordText}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <img
              className={`display-archive-full-layer display-archive-contact-shadow${pagingDirection ? ` is-paging-${pagingDirection}` : ''}`}
              src={getShadowAsset('contact', visibleCount)}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <img className="display-archive-rack-front" src={DISPLAY_ASSETS.rackFront} alt="" aria-hidden="true" draggable="false" />

            {showPagingControls && (
              <>
                <button
                  type="button"
                  className={`display-archive-page-arrow display-archive-page-left${canPageLeft ? '' : ' is-hidden'}`}
                  aria-label="向前一张"
                  disabled={!canPageLeft || Boolean(pagingDirection)}
                  onClick={() => page('left')}
                >‹</button>
                <button
                  type="button"
                  className={`display-archive-page-arrow display-archive-page-right${canPageRight ? '' : ' is-hidden'}`}
                  aria-label="向后一张"
                  disabled={!canPageRight || Boolean(pagingDirection)}
                  onClick={() => page('right')}
                >›</button>
              </>
            )}
          </div>
        ) : (
          <section className="display-archive-empty" aria-live="polite">
            {emptyMessage.map((line) => <p key={line}>{line}</p>)}
          </section>
        )}
      </section>
    </main>
  );
}
