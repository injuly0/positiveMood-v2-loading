
import React from 'react';

export default function RecordEntryPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>开始记录你内心的想法</h1>
      <p style={{ color: '#666' }}>（这里是 RecordEntryPage 模块容器，稍后在这里编写输入框与提交逻辑）</p>
      
      <textarea 
        placeholder="今天发生了什么？你的信念是什么..." 
        style={{ width: '100%', height: '150px', padding: '12px', marginTop: '20px' }}
      />
    </div>
  );
}