import React, { useEffect, Suspense } from 'react'
import { Route, Routes, useLocation, Navigate } from 'react-router'
import { PageLoader } from './components/PageLoader'

// Direct imports (no code splitting)
import { Login } from './pages/Login'
import { About } from './pages/About'
import { Landing } from './pages/Landing'

const AuthApp = React.lazy(() => import('./AuthApp'))

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return children
}

export default function AppRouter() {
  const location = useLocation()

  // Check if user has a token or is on public pages
  // This allows landing page to render without initializing the database
  const hasToken = localStorage.getItem('wk_token') !== null
  const isPublicPage =
    location.pathname === '/' ||
    location.pathname === '/landing' ||
    location.pathname === '/login' ||
    location.pathname === '/about'

  // For public pages without a token, render without UserProvider/SettingsProvider
  // This avoids initializing the database for landing page visitors
  if (isPublicPage && !hasToken) {
    return (
      <Layout>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/landing" />} />
        </Routes>
      </Layout>
    )
  }

  // For authenticated users or when navigating to protected routes, use full app with providers
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <AuthApp />
      </Suspense>
    </Layout>
  )
}
