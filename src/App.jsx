import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from './contexts/ThemeContext'
import AdminLayout from './components/layout/AdminLayout'
import ContestantsList from './components/admin/ContestantsList'
import JudgesList from './components/admin/JudgesList'
import ResultsBoard from './components/admin/ResultsBoard'
import SettingsPanel from './components/admin/SettingsPanel'
import AdminDashboard from './pages/AdminDashboard'
import AdminAssistance from './pages/AdminAssistance'
import AdminCompetitionEditor from './pages/AdminCompetitionEditor'
import AdminLeaderboardDynamic from './pages/AdminLeaderboardDynamic'
import JudgePageNew from './pages/JudgePageNew'
import PublicLeaderboard from './pages/PublicLeaderboard'
import RankingPage from './pages/RankingPage'
import TestRankingPage from './pages/TestRankingPage'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster position="top-center" richColors />
        <Routes>
          {/* Admin Routes with Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="contestants" element={<ContestantsList />} />
            <Route path="judges" element={<JudgesList />} />
            <Route path="results" element={<ResultsBoard />} />
            <Route path="leaderboard" element={<AdminLeaderboardDynamic />} />
            <Route path="settings" element={<SettingsPanel />} />
            <Route path="assistance" element={<AdminAssistance />} />
            <Route path="competition" element={<AdminCompetitionEditor />} />
          </Route>
          
          {/* Judge Route (No Layout) */}
          <Route path="/judge/:token" element={<JudgePageNew />} />
          
          {/* Public Leaderboard (No Layout) */}
          <Route path="/leaderboard" element={<PublicLeaderboard />} />
          
          {/* Ranking Display (No Layout) */}
          <Route path="/ranking" element={<RankingPage />} />
          
          {/* Test Ranking (For debugging) */}
          <Route path="/test-ranking" element={<TestRankingPage />} />
          
          {/* Default redirect to admin */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
