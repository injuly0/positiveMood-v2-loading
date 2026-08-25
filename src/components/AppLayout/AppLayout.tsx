import { Outlet } from 'react-router-dom';
import SiteFooter from '../SiteFooter/SiteFooter';
import type { StartSoftFocusTransition } from '../WarmLightTransition/WarmLightTransitionLayer';
import './AppLayout.css';

export interface AppLayoutContext {
  startSoftFocusTransition: StartSoftFocusTransition;
}

interface AppLayoutProps {
  startSoftFocusTransition: StartSoftFocusTransition;
}

export default function AppLayout({ startSoftFocusTransition }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <Outlet
        context={{ startSoftFocusTransition } satisfies AppLayoutContext}
      />
      <SiteFooter />
    </div>
  );
}
