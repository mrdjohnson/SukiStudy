import { PropsWithChildren } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { useMatches } from '@mantine/core'
import clsx from 'clsx'

type BackgroundWrapperProps = PropsWithChildren<{
  dimmed?: boolean
}>

const BackgroundWrapper = ({ children, dimmed = false }: BackgroundWrapperProps) => {
  const { themeBackground } = useSettings()

  const isMobile = useMatches({
    base: true,
    sm: false,
  })

  const backgroundUrl = themeBackground
    ? isMobile
      ? themeBackground.portraitUrl
      : themeBackground.landscapeUrl
    : ''

  return (
    <div className="relative h-svh w-full overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 bg-cover bg-top-left bg-no-repeat w-screen h-screen"
        style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
      />
      <div
        className={clsx(
          'relative h-svh md:h-full w-full overflow-y-auto flex-1',
          dimmed ? 'bg-black/70' : 'bg-black/15',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default BackgroundWrapper
