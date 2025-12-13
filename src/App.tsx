import React from 'react'
import { Route, Routes, useLocation, HashRouter, Navigate } from 'react-router'
import { Header } from './components/Header'
import { Icons } from './components/Icons'
import { SettingsProvider } from './contexts/SettingsContext'
import { useUser } from './contexts/UserContext'
import { useGames } from './hooks/useGames'

// Pages
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Browse } from './pages/Browse'
import { Session } from './pages/Session'
import { GameMenu } from './pages/games/GameMenu'
import { CustomGameSetup } from './pages/games/CustomGameSetup'
import { CustomSession } from './pages/games/CustomSession'
import { Landing } from './pages/Landing'
import PWABadge from './PWABadge'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const hideHeader = location.pathname === '/login' || location.pathname === '/landing'

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
  const { user, isGuest, loading, isSyncing, login } = useUser()
  const availableGames = useGames()

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
      <PWABadge />

      <HashRouter>
        <Layout>
          {isSyncing && user && (
            <div className="fixed bottom-4 right-4 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse">
              <Icons.RotateCcw className="w-3 h-3 animate-spin" />
              Syncing...
            </div>
          )}

          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={login} />} />

            <Route element={!user && !isGuest && <Navigate to="/landing" />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/session/lesson" element={<Session mode="lesson" />} />
              <Route path="/session/review" element={<Session mode="review" />} />

              <Route path="/session/games" element={<GameMenu />} />

              {availableGames.map(game => (
                <Route path={'/session/games/' + game.id} element={<game.component />} />
              ))}

              {/* go to games menu if at unknown game page */}
              <Route path="/session/games/*" element={<Navigate to="/session/games" />} />

              <Route path="/session/custom" element={<CustomGameSetup />} />
              <Route path="/session/custom/play" element={<CustomSession />} />

              <Route path="/browse" element={<Browse />} />

              {/* go to dashboard if at unknown page */}
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </Layout>
      </HashRouter>
    </SettingsProvider>
  )
}
