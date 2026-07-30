import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InitializationPage.css';

type SceneState = 'initial' | 'record' | 'archive';

const sceneAssets: Record<SceneState, string> = {
  initial: '/home/initial-background.png',
  record: '/home/record-focus.png',
  archive: '/home/archive-focus.png',
};

const sceneCopy: Record<SceneState, string> = {
  initial: '写下今天感觉最好的瞬间',
  record: '写下今天感觉最好的瞬间',
  archive: '走进那些值得再次回味的时刻',
};

const isTouchLikeDevice = () =>
  window.matchMedia('(hover: none), (pointer: coarse)').matches;

export default function InitializationPage() {
  const navigate = useNavigate();
  const [sceneState, setSceneState] = useState<SceneState>('initial');

  const activateScene = (nextState: Exclude<SceneState, 'initial'>, route: string) => {
    if (isTouchLikeDevice() && sceneState !== nextState) {
      setSceneState(nextState);
      return;
    }

    navigate(route);
  };

  const resetPreview = () => setSceneState('initial');

  return (
    <main className="initialization-page">
      <section
        className="home-scene"
        data-scene-state={sceneState}
        aria-label="私人信件博物馆入口"
        onMouseLeave={resetPreview}
      >
        {(Object.keys(sceneAssets) as SceneState[]).map((state) => (
          <img
            key={state}
            className={`home-scene__image home-scene__image--${state}`}
            src={sceneAssets[state]}
            alt=""
            aria-hidden="true"
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
          onClick={() => activateScene('archive', '/display-archive')}
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
          onClick={() => activateScene('record', '/record')}
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
    </main>
  );
}
