import React from 'react';
import { useNavigate } from 'react-router-dom';
import VlogLoader from '../components/VlogLoader/VlogLoader';

export default function InitializationPage() {
  // 获取路由跳转的工具函数
  const navigate = useNavigate();

  // 定义具体的跳转逻辑
  const handleFinishLoading = () => {
    navigate('/record');
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f8f9fa' 
    }}>
      {/* 将具体的跳转逻辑打包，作为 Props 传给底层的 VlogLoader */}
      <VlogLoader onComplete={handleFinishLoading} />
    </div>
  );
}