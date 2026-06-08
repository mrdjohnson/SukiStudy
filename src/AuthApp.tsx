import React, { useEffect, Suspense } from 'react'
import { Route, Routes, Navigate, Outlet, useSearchParams, useLocation } from 'react-router'
import { modals, ModalsProvider } from '@mantine/modals'
import { Text } from '@mantine/core'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

import { Header } from './components/Header'
import { Icons } from './components/Icons'
import { PageLoader } from './components/PageLoader'
import { DrawerRoute } from './components/DrawerRoute'

import { useUser, UserProvider } from './contexts/UserContext'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'

import { saveLocalNotificationPreferences } from './core/preferencesStore'
import { runStartupMigrations } from './migrations/runStartupMigrations'
import { unsubscribeFromPushNotifications } from './services/pushNotificationService'

import { useGames } from './hooks/useGames'
import { useSyncManager } from './hooks/useSyncManager'

// Direct imports (no code splitting)
import { Login } from './pages/Login'
import { Landing } from './pages/Landing'

import '@mantine/carousel/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'

// init dayjs plugins
dayjs.extend(customParseFormat)

runStartupMigrations()

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
const Settings = React.lazy(() =>
  import('./pages/Settings').then(m => ({ default: m.SettingsModal })),
)

export const AuthWrapper = () => {
  const { user, loading, loginAsGuest } = useUser()
  const {
    notificationSchedule,
    setNotificationSchedule,
    autoWaniKaniUpdatesEnabled,
    waniKaniUpdatePromptDismissed,
    updateWaniKaniSyncPreferences,
  } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notificationDisabledMessage, setNotificationDisabledMessage] = React.useState(false)
  const hasMigratedNotificationPreferences = React.useRef(false)
  const hasOpenedWaniKaniUpdatePrompt = React.useRef(false)

  const isSyncing = useSyncManager(user, { autoWaniKaniUpdatesEnabled })

  useEffect(() => {
    if (hasMigratedNotificationPreferences.current || !notificationSchedule.enabled) return

    hasMigratedNotificationPreferences.current = true
    void saveLocalNotificationPreferences(notificationSchedule)
  }, [notificationSchedule])

  useEffect(() => {
    if (
      !user ||
      user.is_guest ||
      waniKaniUpdatePromptDismissed ||
      hasOpenedWaniKaniUpdatePrompt.current
    ) {
      return
    }

    hasOpenedWaniKaniUpdatePrompt.current = true

    modals.openConfirmModal({
      title: 'Download WaniKani items?',
      children: (
        <Text size="sm">
          SukiStudy can download your WaniKani subjects, assignments, and study materials for
          offline practice and automatic updates. This can be a large first download on mobile.
        </Text>
      ),
      labels: { confirm: 'Download now', cancel: 'Kana only' },
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      onCancel: () => {
        updateWaniKaniSyncPreferences({
          autoWaniKaniUpdatesEnabled: false,
          waniKaniUpdatePromptDismissed: true,
        })
      },
      onConfirm: () => {
        updateWaniKaniSyncPreferences({
          autoWaniKaniUpdatesEnabled: true,
          waniKaniUpdatePromptDismissed: true,
        })
      },
    })
  }, [user, waniKaniUpdatePromptDismissed, updateWaniKaniSyncPreferences])

  // Handle guest login from landing page
  useEffect(() => {
    if (searchParams.get('guest') === 'true' && !user) {
      loginAsGuest()
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, user, loginAsGuest, setSearchParams])

  useEffect(() => {
    if (searchParams.get('disable') !== 'true') return

    void (async () => {
      await unsubscribeFromPushNotifications()
      setNotificationSchedule(prev => ({ ...prev, enabled: false }))
      setNotificationDisabledMessage(true)
      setSearchParams({}, { replace: true })
    })()
  }, [searchParams, setNotificationSchedule, setSearchParams])

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

      {notificationDisabledMessage && (
        <div className="fixed bottom-4 left-4 bg-slate-900 text-white text-xs px-3 py-2 rounded-md shadow-lg z-50">
          Notifications turned off.
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

/**
 * Modal routes layer — renders page content inside bottom-sheet modals
 * while the Dashboard stays visible underneath.
 */
const DrawerRoutes = () => {
  const location = useLocation()
  const availableGames = useGames()

  // Only render modal routes when NOT on the dashboard root
  if (location.pathname === '/') {
    return null
  }

  return (
    <Routes location={location}>
      <Route
        path="/session/lesson"
        element={
          <DrawerRoute title="Lesson">
            <Session />
          </DrawerRoute>
        }
      />
      <Route
        path="/session/review"
        element={
          <DrawerRoute title="Review">
            <Review />
          </DrawerRoute>
        }
      />
      <Route
        path="/session/games"
        element={
          <DrawerRoute title="Games">
            <GameMenu />
          </DrawerRoute>
        }
      />

      {availableGames.map(game => (
        <Route
          key={game.id}
          path={'/session/games/' + game.id}
          element={
            <DrawerRoute title={game.name}>
              <game.component />
            </DrawerRoute>
          }
        />
      ))}

      <Route
        path="/session/custom"
        element={
          <DrawerRoute title="Custom Session">
            <CustomGameSetup />
          </DrawerRoute>
        }
      />
      <Route
        path="/session/custom/play"
        element={
          <DrawerRoute title="Custom Game">
            <CustomSession />
          </DrawerRoute>
        }
      />

      <Route
        path="/browse"
        element={
          <DrawerRoute title="Browse">
            <Browse />
          </DrawerRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <DrawerRoute title="Statistics">
            <Statistics />
          </DrawerRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <DrawerRoute title="Settings">
            <Settings />
          </DrawerRoute>
        }
      />
      <Route
        path="/settings/notifications"
        element={<Navigate to="/settings?tab=notifications" replace />}
      />
    </Routes>
  )
}

// Inner app component that uses UserProvider context
const AppRoutes = () => {
  const { user, isGuest } = useUser()

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={user && !isGuest ? <Navigate to="/" /> : <Login />} />

      {!user && <Route path="/about" element={<Navigate to="/landing#about" replace />} />}

      <Route element={<AuthWrapper />}>
        {/* Dashboard always renders as the base layer */}
        <Route
          path="*"
          element={
            <>
              <Dashboard />
              <DrawerRoutes />
            </>
          }
        />
      </Route>

      {/* go to dashboard if at unknown page */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

// For authenticated users
export default function AuthApp() {
  return (
    <UserProvider>
      <SettingsProvider>
        <ModalsProvider>
          <AppRoutes />
        </ModalsProvider>
      </SettingsProvider>
    </UserProvider>
  )
}
