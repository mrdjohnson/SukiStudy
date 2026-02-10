import React, { useEffect, Suspense } from 'react'
import { Route, Routes, Navigate, Outlet, useSearchParams } from 'react-router'
import { ModalsProvider } from '@mantine/modals'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

import { Header } from './components/Header'
import { Icons } from './components/Icons'
import { PageLoader } from './components/PageLoader'

import { useUser, UserProvider } from './contexts/UserContext'
import { SettingsProvider } from './contexts/SettingsContext'

import { useGames } from './hooks/useGames'
import { useSyncManager } from './hooks/useSyncManager'

// Direct imports (no code splitting)
import { Login } from './pages/Login'
import { About } from './pages/About'
import { Landing } from './pages/Landing'

import '@mantine/carousel/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'

// init dayjs plugins
dayjs.extend(customParseFormat)

// Lazy-loaded pages (code split)
const Dashboard = React.lazy(() =>
  import('./pages/Dashboard').then(m => ({ default: m.Dashboard })),
)
const Browse = React.lazy(() => import('./pages/Browse').then(m => ({ default: m.Browse })))
const Session = React.lazy(() => import('./pages/Session').then(m => ({ default: m.Session })))
const Review = React.lazy(() => import('./pages/Review').then(m => ({ default: m.Review })))
const GameMenu = React.lazy(() =>
  import('./pages/games/GameMenu').then(m => ({ default: m.GameMenu })),
)
const CustomGameSetup = React.lazy(() =>
  import('./pages/games/CustomGameSetup').then(m => ({ default: m.CustomGameSetup })),
)
const CustomSession = React.lazy(() =>
  import('./pages/games/CustomSession').then(m => ({ default: m.CustomSession })),
)
const Statistics = React.lazy(() =>
  import('./pages/Statistics').then(m => ({ default: m.Statistics })),
)
const FontLoader = React.lazy(() =>
  import('./components/FontLoader').then(m => ({ default: m.FontLoader })),
)
const PWABadge = React.lazy(() => import('./PWABadge'))

export const AuthWrapper = () => {
  const { user, loading, loginAsGuest } = useUser()
  const [searchParams, setSearchParams] = useSearchParams()

  const isSyncing = useSyncManager(user)

  // Handle guest login from landing page
  useEffect(() => {
    if (searchParams.get('guest') === 'true' && !user) {
      loginAsGuest()
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, user, loginAsGuest, setSearchParams])

  if (loading) {
    return <PageLoader />
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

      <Suspense fallback={<PageLoader />}>
        <PWABadge />
        <FontLoader />

        <Outlet />
      </Suspense>
    </Header>
  )
}

// Inner app component that uses UserProvider context
const AppRoutes = () => {
  const { user, isGuest } = useUser()
  const availableGames = useGames()

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={user && !isGuest ? <Navigate to="/" /> : <Login />} />

      {!user && <Route path="/about" element={<About />} />}

      <Route element={<AuthWrapper />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/lesson" element={<Session />} />
        <Route path="/session/review" element={<Review />} />

        <Route path="/session/games" element={<GameMenu />} />

        {availableGames.map(game => (
          <Route key={game.id} path={'/session/games/' + game.id} element={<game.component />} />
        ))}

        {/* go to games menu if at unknown game page */}
        <Route path="/session/games/*" element={<Navigate to="/session/games" />} />

        <Route path="/session/custom" element={<CustomGameSetup />} />
        <Route path="/session/custom/play" element={<CustomSession />} />

        <Route path="/browse" element={<Browse />} />
        <Route path="/stats" element={<Statistics />} />
        <Route path="/settings" element={<Dashboard />} />

        <Route path="/about" element={<About />} />
      </Route>

      {/* go to dashboard if at unknown page */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

// For authenticated users
export default function AuthApp() {
  return (
    <ModalsProvider>
      <UserProvider>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </UserProvider>
    </ModalsProvider>
  )
}
