import { useState } from 'react';
import { assetUrl } from '../utils/assetUrl';
import SiteFooter from '../components/SiteFooter/SiteFooter';
import './InitializationPage.css';

type SceneState = 'initial' | 'record' | 'archive';
type FocusSceneState = Exclude<SceneState, 'initial'>;

interface InitializationPageProps {
  transitionState: 'idle' | 'covering' | 'covered' | 'revealing';
  onStartRecordTransition: (trigger: HTMLElement) => void;
  onStartArchiveTransition: (trigger: HTMLElement) => void;
}

const sceneAssets: Record<SceneState, string> = {
  initial: assetUrl('home/initial-background.webp'),
  record: assetUrl('home/record-focus.webp'),
  archive: assetUrl('home/archive-focus.webp'),
};

const sceneCopy: Record<SceneState, string> = {
  initial: '写下今天感觉最好的瞬间',
  record: '写下今天感觉最好的瞬间',
  archive: '走进那些值得再次回味的时刻',
};

const isTouchLikeDevice = () =>
  window.matchMedia('(hover: none), (pointer: coarse)').matches;

export default function InitializationPage({
  transitionState,
  onStartRecordTransition,
  onStartArchiveTransition,
}: InitializationPageProps) {
  const [sceneState, setSceneState] = useState<SceneState>('initial');
  const [shouldPreloadFocusAssets, setShouldPreloadFocusAssets] = useState(false);
  const [loadedFocusAssets, setLoadedFocusAssets] = useState<Record<FocusSceneState, boolean>>({
    record: false,
    archive: false,
  });

  const focusImageReady = sceneState === 'initial' || loadedFocusAssets[sceneState];

  const markFocusAssetLoaded = (state: FocusSceneState) => {
    setLoadedFocusAssets((current) => (
      current[state] ? current : { ...current, [state]: true }
    ));
  };

  const activateScene = (
    nextState: Exclude<SceneState, 'initial'>,
    transition: (trigger: HTMLElement) => void,
    trigger: HTMLElement,
  ) => {
    if (isTouchLikeDevice() && sceneState !== nextState) {
      setSceneState(nextState);
      return;
    }

    transition(trigger);
  };

  const resetPreview = () => setSceneState('initial');

  return (
    <main className="initialization-page" data-transition-state={transitionState}>
      <section
        className="home-scene"
        data-scene-state={sceneState}
        data-focus-image-ready={focusImageReady ? 'true' : 'false'}
        aria-label="私人信件博物馆入口"
        onMouseLeave={resetPreview}
      >
        <img
          className="home-scene__image home-scene__image--initial"
          src={sceneAssets.initial}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setShouldPreloadFocusAssets(true)}
        />

        {shouldPreloadFocusAssets && (['record', 'archive'] as FocusSceneState[]).map((state) => (
          <img
            key={state}
            className={`home-scene__image home-scene__image--${state}`}
            src={sceneAssets[state]}
            alt=""
            aria-hidden="true"
            decoding="async"
            onLoad={() => markFocusAssetLoaded(state)}
          />
        ))}

        <div className="home-scene__warmth" aria-hidden="true" />

        <h1 className="home-scene__heading">{sceneCopy[sceneState]}</h1>

        <button
          className="home-scene__hotspot home-scene__hotspot--archive"
          type="button"
          aria-label="进入回味展厅"
          aria-describedby="scene-instruction"
          onMouseEnter={() => setSceneState('archive')}
          onFocus={() => setSceneState('archive')}
          onBlur={resetPreview}
          onClick={(event) => activateScene('archive', onStartArchiveTransition, event.currentTarget)}
        >
          <span className="home-scene__hotspot-label">进入回味展厅</span>
        </button>

        <button
          className="home-scene__hotspot home-scene__hotspot--record"
          type="button"
          aria-label="打开托盘上的信纸，开始记录"
          aria-describedby="scene-instruction"
          onMouseEnter={() => setSceneState('record')}
          onFocus={() => setSceneState('record')}
          onBlur={resetPreview}
          onClick={(event) => onStartRecordTransition(event.currentTarget)}
        >
          <span className="home-scene__hotspot-label">开始写信</span>
        </button>

        <p id="scene-instruction" className="home-scene__instruction">
          移近场景，选择一处入口
        </p>

        <p className="home-scene__status" aria-live="polite">
          {sceneState === 'record' && '已聚焦写信区域，点击进入记录'}
          {sceneState === 'archive' && '已聚焦回味展厅，点击进入参观'}
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
