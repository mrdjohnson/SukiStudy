import React from 'react'
import { Route, Routes, useLocation, HashRouter } from 'react-router'
import { Header } from './components/Header'
import { Icons } from './components/Icons'
import { SettingsProvider } from './contexts/SettingsContext'
import { useUser } from './contexts/UserContext'

// Pages
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Browse } from './pages/Browse'
import { Session } from './pages/Session'
import { GameMenu } from './pages/games/GameMenu'
import { MemoryGame } from './pages/games/MemoryGame'
import { QuizGame } from './pages/games/QuizGame'
import { ShiritoriGame } from './pages/games/ShiritoriGame'
import { MatchingGame } from './pages/games/SortingGame'
import { ConnectGame } from './pages/games/ConnectGame'
import { VariationsQuizGame } from './pages/games/VariationsQuizGame'
import { RecallGame } from './pages/games/RecallGame'
import { TypingGame } from './pages/games/TypingGame'
import { CustomGameSetup } from './pages/games/CustomGameSetup'
import { RadicalCompositionGame } from './pages/games/RadicalCompositionGame'
import { AudioQuizGame } from './pages/games/AudioQuizGame'
import { CustomSession } from './pages/games/CustomSession'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const hideHeader = location.pathname === '/login'

  if (hideHeader) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <main>{children}</main>
      </div>
    )
  }

  return <Header>{children}</Header>
}

export default function App() {
  const { user, loading, isSyncing, login } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-4 rounded-full shadow-lg mb-4">
          <Icons.Brain className="w-12 h-12 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-gray-500 font-medium">Loading SukiStudy...</p>
      </div>
    )
  }

  return (
    <SettingsProvider>
      <HashRouter>
        <Layout>
          {isSyncing && user && (
            <div className="fixed bottom-4 right-4 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse">
              <Icons.RotateCcw className="w-3 h-3 animate-spin" />
              Syncing...
            </div>
          )}

          <Routes>
            <Route element={!user ? <Login onLogin={login} /> : undefined}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/session/lesson" element={<Session mode="lesson" />} />
              <Route path="/session/review" element={<Session mode="review" />} />

              <Route path="/session/games" element={<GameMenu />} />
              <Route path="/session/games/memory" element={<MemoryGame />} />
              <Route path="/session/games/quiz" element={<QuizGame />} />
              <Route path="/session/games/shiritori" element={<ShiritoriGame />} />
              <Route path="/session/games/sorting" element={<MatchingGame />} />
              <Route path="/session/games/connect" element={<ConnectGame />} />
              <Route path="/session/games/variations" element={<VariationsQuizGame />} />
              <Route path="/session/games/recall" element={<RecallGame />} />
              <Route path="/session/games/typing" element={<TypingGame />} />
              <Route
                path="/session/games/radical-composition"
                element={<RadicalCompositionGame />}
              />
              <Route path="/session/games/audio-quiz" element={<AudioQuizGame />} />

              <Route path="/session/custom" element={<CustomGameSetup />} />
              <Route path="/session/custom/play" element={<CustomSession />} />

              <Route path="/browse" element={<Browse />} />
            </Route>
          </Routes>
        </Layout>
      </HashRouter>
    </SettingsProvider>
  )
}
