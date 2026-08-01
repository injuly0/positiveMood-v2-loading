import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import InitializationPage from './pages/InitializationPage';
import RecordEntryPage from './pages/RecordEntryPage';
import QuestionSelectionPage from './pages/QuestionSelectionPage';
import QuestionAnswerPage from './pages/QuestionAnswerPage';
import DisplayArchivePage from './pages/DisplayArchivePage';
import AppLayout from './components/AppLayout/AppLayout';
import './App.css';

type TransitionState = 'idle' | 'covering' | 'revealing';

interface LightGeometry {
  x: number;
  y: number;
  scale: number;
}

const LIGHT_SIZE = 28;

function AppRoutes() {
  const navigate = useNavigate();
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const [lightGeometry, setLightGeometry] = useState<LightGeometry>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const runningRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTransitionTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  const startRecordTransition = useCallback((trigger: HTMLElement) => {
    if (runningRef.current) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const x = triggerRect.left + triggerRect.width / 2;
    const y = triggerRect.top + triggerRect.height / 2;
    const farX = Math.max(x, viewportWidth - x);
    const farY = Math.max(y, viewportHeight - y);
    const radius = Math.hypot(farX, farY);
    const scale = Math.ceil((radius * 2.35) / LIGHT_SIZE);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timing = reducedMotion
      ? { switchPage: 120, reveal: 130, finish: 250 }
      : { switchPage: 500, reveal: 540, finish: 1000 };

    runningRef.current = true;
    setLightGeometry({ x, y, scale });
    setTransitionState('covering');

    timersRef.current.push(
      window.setTimeout(() => navigate('/record'), timing.switchPage),
      window.setTimeout(() => setTransitionState('revealing'), timing.reveal),
      window.setTimeout(() => {
        setTransitionState('idle');
        runningRef.current = false;
        timersRef.current = [];
      }, timing.finish),
    );
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={(
            <InitializationPage
              transitionState={transitionState}
              onStartRecordTransition={startRecordTransition}
            />
          )}
        />

        <Route element={<AppLayout />}>
          <Route path="/record" element={<RecordEntryPage />} />
          <Route path="/question-selection" element={<QuestionSelectionPage />} />
          <Route path="/question-answer" element={<QuestionAnswerPage />} />
          <Route path="/display-archive" element={<DisplayArchivePage />} />
        </Route>
      </Routes>

      <div
        className="warm-light-transition-layer"
        data-transition-state={transitionState}
        aria-hidden="true"
      >
        <div
          className="warm-light-transition"
          style={{
            left: `${lightGeometry.x}px`,
            top: `${lightGeometry.y}px`,
            '--light-scale': lightGeometry.scale,
          } as React.CSSProperties}
        />
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
