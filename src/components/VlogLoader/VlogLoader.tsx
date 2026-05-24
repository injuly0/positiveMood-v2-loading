import React, { useState, useEffect } from 'react';
import './VlogLoader.css';

const UI_FRAMES = [
  '/loading-ui/google-search_untitled.png',
  '/loading-ui/imessage-blue_untitled.png',
  '/loading-ui/imessage-gray_untitled.png',
  '/loading-ui/instagram-comment_untitled.png',
  '/loading-ui/instagram-dm_untitled.png',
  '/loading-ui/instagram-dm-received_untitled.png'
];

// 定义组件接收的属性接口，明确向父组件索要一个回调函数
interface VlogLoaderProps {
  onComplete: () => void; 
}

export default function VlogLoader({ onComplete }: VlogLoaderProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => {
        // 判断是否到达最后一张图片
        if (prevIndex === UI_FRAMES.length - 1) {
          clearInterval(timer);
          // 触发父组件传入的函数，发送状态提升信号
          onComplete(); 
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

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

