import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import CrystallizeOverlay from '../CrystallizeOverlay/CrystallizeOverlay';
import './AppLayout.css';

export interface AppLayoutContext {
  startCrystallizing: () => void;
}

export default function AppLayout() {
  // 跨路由动画属于常驻 Layout 的瞬时 UI，不写入持久化业务 Store。
  const [crystallizing, setCrystallizing] = useState(false);
  const startCrystallizing = useCallback(() => setCrystallizing(true), []);

  return (
    <div className="app-layout">
      <Outlet context={{ startCrystallizing } satisfies AppLayoutContext} />
      {crystallizing && (
        <CrystallizeOverlay onDone={() => setCrystallizing(false)} />
      )}
    </div>
  );
}
