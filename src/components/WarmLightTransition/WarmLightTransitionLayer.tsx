import type { CSSProperties } from 'react';
import './WarmLightTransitionLayer.css';

export type SoftFocusTransitionState = 'idle' | 'covering' | 'covered' | 'revealing';

export interface SoftFocusTransitionContent {
  message: string;
  delayedMessage?: string;
  delayedAfterMs?: number;
}

export interface SoftFocusTransitionOptions {
  trigger: HTMLElement;
  to: string;
  beforeNavigate?: () => void;
  waitFor?: () => Promise<void>;
  minimumDurationMs?: number;
  content?: SoftFocusTransitionContent;
  onError?: () => void;
}

export type StartSoftFocusTransition = (
  options: SoftFocusTransitionOptions,
) => boolean;

export interface LightGeometry {
  x: number;
  y: number;
  scale: number;
}

interface WarmLightTransitionLayerProps {
  state: SoftFocusTransitionState;
  geometry: LightGeometry;
  content: SoftFocusTransitionContent | null;
  showDelayedMessage: boolean;
}

export default function WarmLightTransitionLayer({
  state,
  geometry,
  content,
  showDelayedMessage,
}: WarmLightTransitionLayerProps) {
  const message = showDelayedMessage && content?.delayedMessage
    ? content.delayedMessage
    : content?.message;

  return (
    <div
      className="warm-light-transition-layer"
      data-transition-state={state}
    >
      <div
        className="warm-light-transition"
        aria-hidden="true"
        style={{
          left: `${geometry.x}px`,
          top: `${geometry.y}px`,
          '--light-scale': geometry.scale,
        } as CSSProperties}
      />
      {message && (
        <div
          className="warm-light-transition-content"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
