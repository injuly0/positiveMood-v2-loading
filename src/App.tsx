import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InitializationPage from './pages/InitializationPage';
import RecordEntryPage from './pages/RecordEntryPage';
import QuestionSelectionPage from './pages/QuestionSelectionPage';
import QuestionAnswerPage from './pages/QuestionAnswerPage';
import DisplayArchivePage from './pages/DisplayArchivePage';
import AppLayout from './components/AppLayout/AppLayout';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* 初始化加载页：无 Layout，独立全屏 */}
        <Route path="/" element={<InitializationPage />} />

        {/* 主流程页面：嵌套在 Layout 中 */}
        <Route element={<AppLayout />}>
          <Route path="/record" element={<RecordEntryPage />} />
          <Route path="/question-selection" element={<QuestionSelectionPage />} />
          <Route path="/question-answer" element={<QuestionAnswerPage />} />
          <Route path="/display-archive" element={<DisplayArchivePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;