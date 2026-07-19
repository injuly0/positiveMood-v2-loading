import './ThinkingLoader.css';

export default function ThinkingLoader() {
  return (
    <div className="thinking-loader">
      <div className="thinking-loader-inner">
        <div className="thinking-orb" />
        <p className="thinking-text">正在用心感受你的文字…</p>
        <div className="thinking-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
    </div>
  );
}
