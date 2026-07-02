import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InitializationPage from './pages/InitializationPage';
import RecordEntryPage from './pages/RecordEntryPage';
import QuestionSelectionPage from './pages/QuestionSelectionPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* 默认访问根路径时，挂载初始化加载页 */}
        <Route path="/" element={<InitializationPage />} />
        
        {/* 发生路由跳转时，卸载加载页，挂载记录页 */}
        <Route path="/record" element={<RecordEntryPage />} />

        <Route path="/question-selection" element={<QuestionSelectionPage />} />
      </Routes>
    </Router>
  );
}

export default App;