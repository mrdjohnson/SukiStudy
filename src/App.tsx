import React, { useEffect } from 'react'
import { Route, Routes, useLocation, BrowserRouter, Navigate, Outlet } from 'react-router'
import { Header } from './components/Header'
import { Icons } from './components/Icons'
import { useUser } from './contexts/UserContext'
import { useGames } from './hooks/useGames'

// Pages
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Browse } from './pages/Browse'
import { About } from './pages/About'
import { Session } from './pages/Session'
import { Review } from './pages/Review'
import { GameMenu } from './pages/games/GameMenu'
import { CustomGameSetup } from './pages/games/CustomGameSetup'
import { CustomSession } from './pages/games/CustomSession'
import { Landing } from './pages/Landing'
import PWABadge from './PWABadge'

import logo from '@/src/assets/apple-touch-icon.png'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return children
}

export const AuthWrapper = () => {
  const { user, isSyncing, loading } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-2 rounded-full shadow-lg mb-4">
          <div className=" rounded-full shadow-md shadow-red-400 ">
            <img src={logo} alt="SukiStudy Logo" className="size-16 animate-pulse" />
          </div>
        </div>

        <p className="text-gray-500 font-medium">Loading SukiStudy...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/landing" />

  return (
    <Header>
      {isSyncing && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse">
          <Icons.RotateCcw className="w-3 h-3 animate-spin" />
          Syncing...
        </div>
      )}

      <PWABadge />

      <Outlet />
    </Header>
  )
}

export default function App() {
  const { user, isGuest, login } = useUser()

  const availableGames = useGames()

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route
            path="/login"
            element={user && !isGuest ? <Navigate to="/" /> : <Login onLogin={login} />}
          />

          {!user && <Route path="/about" element={<About />} />}

          <Route element={<AuthWrapper />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/session/lesson" element={<Session />} />
            <Route path="/session/review" element={<Review />} />

            <Route path="/session/games" element={<GameMenu />} />

            {availableGames.map(game => (
              <Route path={'/session/games/' + game.id} element={<game.component />} />
            ))}

            {/* go to games menu if at unknown game page */}
            <Route path="/session/games/*" element={<Navigate to="/session/games" />} />

            <Route path="/session/custom" element={<CustomGameSetup />} />
            <Route path="/session/custom/play" element={<CustomSession />} />

            <Route path="/browse" element={<Browse />} />

            <Route path="/about" element={<About />} />
          </Route>

          {/* go to dashboard if at unknown page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
