import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import CrystallizeOverlay from '../CrystallizeOverlay/CrystallizeOverlay';
import SiteFooter from '../SiteFooter/SiteFooter';
import type { StartSoftFocusTransition } from '../WarmLightTransition/WarmLightTransitionLayer';
import './AppLayout.css';

export interface AppLayoutContext {
  startCrystallizing: () => void;
  startSoftFocusTransition: StartSoftFocusTransition;
}

interface AppLayoutProps {
  startSoftFocusTransition: StartSoftFocusTransition;
}

export default function AppLayout({ startSoftFocusTransition }: AppLayoutProps) {
  // 跨路由动画属于常驻 Layout 的瞬时 UI，不写入持久化业务 Store。
  const [crystallizing, setCrystallizing] = useState(false);
  const startCrystallizing = useCallback(() => setCrystallizing(true), []);

  return (
    <div className="app-layout">
      <Outlet
        context={{ startCrystallizing, startSoftFocusTransition } satisfies AppLayoutContext}
      />
      <SiteFooter />
      {crystallizing && (
        <CrystallizeOverlay onDone={() => setCrystallizing(false)} />
      )}
    </div>
  );
}
