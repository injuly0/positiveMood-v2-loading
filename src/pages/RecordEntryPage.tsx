import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../store/useRecordStore'; // 引入刚才创建的 Store

export default function RecordEntryPage() {
// 本地 state，用于双向绑定输入框的值
const [inputText, setInputText] = useState('');

const navigate = useNavigate();
// 获取 zustand 里的更新函数
const setRecordText = useRecordStore((state) => state.setRecordText);

// 点击提交按钮的处理逻辑
const handleSubmit = () => {
if (!inputText.trim()) {
alert('请输入一些内容后再提交哦！');
return;
}

// 1. 将用户输入的数据存入全局 zustand 中
setRecordText(inputText);

// 2. 跳转到下一个页面 (需要在 App.tsx 中配置该路由)
navigate('/question-selection');

/* 注意：这里也可以顺便触发请求“本地大模型”的逻辑。
比如：
fetchLocalLLM(inputText).then(...)
或者等跳转到下一个页面后，在下一个页面的 useEffect 里去读取 zustand 数据并请求大模型。
*/
};

return (
<div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
<h1>开始记录你内心的想法</h1>
<p style={{ color: '#666' }}>请详细描述今天发生了什么，以及你当下的感受与信念。</p>

<textarea
value={inputText}
onChange={(e) => setInputText(e.target.value)}
placeholder="今天发生了什么？你的信念是什么..."
style={{
width: '100%',
height: '150px',
padding: '12px',
marginTop: '20px',
borderRadius: '8px',
border: '1px solid #ccc',
fontSize: '16px',
boxSizing: 'border-box' // 防止 padding 撑破容器
}}
/>

<button
onClick={handleSubmit}
style={{
marginTop: '20px',
padding: '12px 24px',
backgroundColor: '#aa3bff', // 使用了你 index.css 中的强调色
color: 'white',
border: 'none',
borderRadius: '6px',
fontSize: '16px',
cursor: 'pointer',
width: '100%'
}}
>
提交记录并继续
</button>
</div>
);
}