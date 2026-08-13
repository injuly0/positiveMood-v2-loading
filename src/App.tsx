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
import WarmLightTransitionLayer, {
  type LightGeometry,
  type SoftFocusTransitionContent,
  type SoftFocusTransitionState,
  type StartSoftFocusTransition,
} from './components/WarmLightTransition/WarmLightTransitionLayer';
import './App.css';

const LIGHT_SIZE = 28;

const waitForRoutePaint = (): Promise<void> => new Promise((resolve) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => resolve());
  });
});

function AppRoutes() {
  const navigate = useNavigate();
  const [transitionState, setTransitionState] = useState<SoftFocusTransitionState>('idle');
  const [lightGeometry, setLightGeometry] = useState<LightGeometry>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [transitionContent, setTransitionContent] = useState<SoftFocusTransitionContent | null>(
    null,
  );
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);
  const runningRef = useRef(false);
  const transitionRunRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const clearTransitionTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => {
    transitionRunRef.current += 1;
    runningRef.current = false;
    clearTransitionTimers();
  }, [clearTransitionTimers]);

  const startSoftFocusTransition = useCallback<StartSoftFocusTransition>(({
    trigger,
    to,
    beforeNavigate,
    waitFor,
    minimumDurationMs,
    content,
    onError,
  }) => {
    if (runningRef.current) return false;

    let readiness: Promise<void> | undefined;
    try {
      beforeNavigate?.();
      readiness = waitFor?.();
    } catch {
      onError?.();
      return false;
    }

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
      ? {
          cover: 120,
          revealDuration: 120,
        }
      : {
          cover: 540,
          revealDuration: 430,
        };

    runningRef.current = true;
    const runId = transitionRunRef.current + 1;
    transitionRunRef.current = runId;
    setLightGeometry({ x, y, scale });
    setTransitionContent(content ?? null);
    setShowDelayedMessage(false);
    setTransitionState('covering');

    const isCurrentRun = () => transitionRunRef.current === runId;
    const schedule = (callback: () => void, delay: number) => {
      const timerId = window.setTimeout(callback, delay);
      timersRef.current.push(timerId);
      return timerId;
    };
    const wait = (delay: number): Promise<void> => new Promise((resolve) => {
      schedule(resolve, delay);
    });
    const finishTransition = () => {
      if (!isCurrentRun()) return;
      clearTransitionTimers();
      setTransitionState('idle');
      setTransitionContent(null);
      setShowDelayedMessage(false);
      runningRef.current = false;
    };

    if (readiness) {
      const minimumDuration = Math.max(timing.cover, minimumDurationMs ?? timing.cover);
      const coverReady = wait(timing.cover);
      const minimumReady = wait(minimumDuration);

      schedule(() => {
        if (isCurrentRun()) setTransitionState('covered');
      }, timing.cover);

      if (content?.delayedMessage && content.delayedAfterMs !== undefined) {
        schedule(() => {
          if (isCurrentRun()) setShowDelayedMessage(true);
        }, content.delayedAfterMs);
      }

      void Promise.all([readiness, minimumReady])
        .then(async () => {
          if (!isCurrentRun()) return;
          navigate(to);
          await waitForRoutePaint();
          if (!isCurrentRun()) return;
          setTransitionState('revealing');
          schedule(finishTransition, timing.revealDuration);
        })
        .catch(async () => {
          await coverReady;
          if (!isCurrentRun()) return;
          onError?.();
          setTransitionState('revealing');
          schedule(finishTransition, timing.revealDuration);
        });

      return true;
    }

    void wait(timing.cover).then(async () => {
      if (!isCurrentRun()) return;
      setTransitionState('covered');
      navigate(to);
      await waitForRoutePaint();
      if (!isCurrentRun()) return;
      setTransitionState('revealing');
      schedule(finishTransition, timing.revealDuration);
    });
    return true;
  }, [clearTransitionTimers, navigate]);

  const startHomeRecordTransition = useCallback((trigger: HTMLElement) => {
    startSoftFocusTransition({ trigger, to: '/record' });
  }, [startSoftFocusTransition]);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={(
            <InitializationPage
              transitionState={transitionState}
              onStartRecordTransition={startHomeRecordTransition}
            />
          )}
        />

        <Route element={<AppLayout startSoftFocusTransition={startSoftFocusTransition} />}>
          <Route path="/record" element={<RecordEntryPage />} />
          <Route path="/question-selection" element={<QuestionSelectionPage />} />
          <Route path="/question-answer" element={<QuestionAnswerPage />} />
          <Route path="/display-archive" element={<DisplayArchivePage />} />
        </Route>
      </Routes>

      <WarmLightTransitionLayer
        state={transitionState}
        geometry={lightGeometry}
        content={transitionContent}
        showDelayedMessage={showDelayedMessage}
      />
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
