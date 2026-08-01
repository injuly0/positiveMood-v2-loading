import { useEffect, useMemo, useRef } from 'react';
import './CrystallizeOverlay.css';

interface Props {
  onDone: () => void;
}

/**
 * 粒子汇聚结晶动画
 *
 * 时序（总计 ~2.0s）：
 *   0 → 1.2s     粒子从屏幕各处飞向中心汇聚（各粒子有 0~0.35s 入场延迟）
 *   0.8 → 1.2s   中心光核逐渐增强
 *   1.2 → 1.35s  白屏扩散覆盖全场（0.15s 快闪）
 *   1.35 → 1.9s  白屏渐隐消失（0.55s 平滑过渡，信念之树浮现）
 */
const TOTAL_DURATION = 2000;
const PARTICLE_COUNT = 28;

interface Particle {
  id: number;
  fromX: number;   // 起始位置 x（vw）
  fromY: number;   // 起始位置 y（vh）
  delay: number;   // 出场延迟 (s)
  size: number;    // 大小 (px)
  hue: number;     // 色相 (260~300 紫蓝区间)
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    fromX: Math.random() * 100,
    fromY: Math.random() * 100,
    delay: Math.random() * 0.35,
    size: 3 + Math.random() * 5,
    hue: 255 + Math.random() * 45,
  }));
}

export default function CrystallizeOverlay({ onDone }: Props) {
  const doneCalled = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }, TOTAL_DURATION);

    return () => clearTimeout(timer);
  }, [onDone]);

  const particles = useMemo(() => generateParticles(), []);

  return (
    <div className="crystallize-overlay">
      {/* 粒子层 */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="crystallize-particle"
          style={
            {
              '--from-x': `${p.fromX}vw`,
              '--from-y': `${p.fromY}vh`,
              '--delay': `${p.delay}s`,
              '--size': `${p.size}px`,
              '--hue': p.hue,
            } as React.CSSProperties
          }
        />
      ))}

      {/* 中心光核 */}
      <div className="crystallize-core" />

      {/* 白屏层 */}
      <div className="crystallize-white-flash" />
    </div>
  );
}
