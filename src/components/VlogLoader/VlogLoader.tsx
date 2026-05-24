// VlogLoader.tsx
import React, { useState, useEffect } from 'react';
import './VlogLoader.css'; // 引入对应的CSS文件

const UI_FRAMES = [
  '/loading-ui/google-search_untitled.png',
  '/loading-ui/imessage-blue_untitled.png',
  '/loading-ui/imessage-gray_untitled.png',
  '/loading-ui/instagram-comment_untitled.png',
  '/loading-ui/instagram-dm_untitled.png',
  '/loading-ui/instagram-dm-received_untitled.png'
];

const VlogLoader: React.FC = () => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  useEffect(() => {
    // 设置定时器，每 1500 毫秒执行一次状态更新
    const timer = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => (prevIndex + 1) % UI_FRAMES.length);
    }, 1500);

    // 组件卸载时清理定时器，防止内存泄漏
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="vlog-loader-container">
      {/* 遍历渲染所有底层图片，通过 active class 控制透明度 */}
      {UI_FRAMES.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`UI Frame ${index}`}
          className={`frame-image ${index === currentFrameIndex ? 'active' : ''}`}
        />
      ))}
      
    </div>
  );
};

export default VlogLoader;