import React, {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router'
import { CloseButton, Group, Paper, Title, useMatches, Drawer, ThemeIcon } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { PageLoader } from './PageLoader'
import { useSettings } from '../contexts/SettingsContext'
import { HowToPlayModal } from './HowToPlayModal'
import { Icons } from './Icons'

interface DrawerRouteHeaderState {
  title: React.ReactNode
  headerLeft?: React.ReactNode
}

interface DrawerRouteContextValue {
  setHeader: (state: Partial<DrawerRouteHeaderState>) => void
  pushHeader: (state: Partial<DrawerRouteHeaderState>) => void
  popHeader: () => void
  resetHeader: () => void
}

const DrawerRouteContext = createContext<DrawerRouteContextValue | null>(null)

/**
 * Hook for child components to dynamically update the sheet header.
 */
export const useDrawerRouteHeader = () => {
  const ctx = useContext(DrawerRouteContext)
  if (!ctx) throw new Error('useDrawerRouteHeader must be used within a DrawerRoute')
  return ctx
}

interface DrawerRouteProps {
  children: React.ReactNode
  title?: React.ReactNode
}

/**
 * Wraps page content in a bottom-sheet style modal.
 * When the modal is closed, navigates back to the dashboard.
 */
export const DrawerRoute: React.FC<DrawerRouteProps> = ({ children, title: defaultTitle }) => {
  const navigate = useNavigate()
  const [opened, { open, close }] = useDisclosure(false)
  const hasOpened = useRef(false)
  const { helpSteps } = useSettings()
  const [showHelp, setShowHelp] = useState(false)

  const [headerStack, setHeaderStack] = useState<DrawerRouteHeaderState[]>([
    { title: defaultTitle, headerLeft: null },
  ])

  const currentHeader = headerStack[headerStack.length - 1]

  const setHeader = useCallback((partial: Partial<DrawerRouteHeaderState>) => {
    setHeaderStack(prev => {
      const next = [...prev]
      const top = next[next.length - 1]
      next[next.length - 1] = { ...top, ...partial }
      return next
    })
  }, [])

  const pushHeader = useCallback(
    (state: Partial<DrawerRouteHeaderState>) => {
      setHeaderStack(prev => [...prev, { title: defaultTitle, headerLeft: null, ...state }])
    },
    [defaultTitle],
  )

  const popHeader = useCallback(() => {
    setHeaderStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const resetHeader = useCallback(() => {
    setHeaderStack([{ title: defaultTitle, headerLeft: null }])
  }, [defaultTitle])

  const logoSize = useMatches({
    base: 'md',
    xs: 'lg',
  })

  // Open the modal on mount with a slight delay for the animation
  useEffect(() => {
    if (!hasOpened.current) {
      hasOpened.current = true
      // Small delay to allow the DOM to mount before animating
      requestAnimationFrame(() => {
        open()
      })
    }
  }, [])

  return (
    <DrawerRouteContext.Provider value={{ setHeader, pushHeader, popHeader, resetHeader }}>
      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="100%"
        withCloseButton={false}
        padding={0}
        zIndex={100} // Base level for the route drawer
        transitionProps={{
          onExited: () => navigate('/', { replace: true }),
        }}
        classNames={{
          body: 'h-full flex flex-col',
          content: 'flex flex-col',
        }}
      >
        {currentHeader.title && (
          <Paper className="rounded-b-none! p-2 shrink-0 max-w-4xl! mx-auto! w-full!">
            <Group gap="xs" wrap="nowrap" className="w-full justify-between!">
              {currentHeader.headerLeft}
              <Group>
                <Title order={2}>{currentHeader.title}</Title>

                {helpSteps && (
                  <ThemeIcon
                    variant="light"
                    size={logoSize}
                    radius="xl"
                    color="indigo"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowHelp(true)}
                  >
                    <Icons.Help size={18} />
                  </ThemeIcon>
                )}
              </Group>
              <CloseButton onClick={close} />
            </Group>
          </Paper>
        )}

        {helpSteps && (
          <HowToPlayModal
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
            title={helpSteps[0]?.title ? 'How to Play' : 'Instructions'}
            steps={helpSteps}
          />
        )}

        <Suspense fallback={<PageLoader />}>
          <div className="flex-1 w-full h-full min-h-0 overflow-scroll max-w-4xl mx-auto">
            {children}
          </div>
        </Suspense>
      </Drawer>
    </DrawerRouteContext.Provider>
  )
}
