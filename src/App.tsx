import VlogLoader from './components/VlogLoader/VlogLoader'; // 引入你的组件
import './App.css'; // 保留全局样式

function App() {
  return (
    <div className="app-container">
      {/* 直接在根组件渲染你的加载器 */}
      <VlogLoader /> 
    </div>
  )
}

export default App