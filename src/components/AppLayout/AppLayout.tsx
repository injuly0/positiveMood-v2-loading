import { Outlet } from 'react-router-dom';
import { useRecordStore } from '../../store/useRecordStore';
import CrystallizeOverlay from '../CrystallizeOverlay/CrystallizeOverlay';
import './AppLayout.css';

export default function AppLayout() {
  const crystallizing = useRecordStore((s) => s.crystallizing);
  const setCrystallizing = useRecordStore((s) => s.setCrystallizing);

  return (
    <div className="app-layout">
      {/* 子路由页面 */}
      <Outlet />

      {/* 结晶动画覆盖层：应用级，跨路由平滑过渡 */}
      {crystallizing && (
        <CrystallizeOverlay onDone={() => setCrystallizing(false)} />
      )}
    </div>
  );
}
