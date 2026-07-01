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
    <div className="relative h-dvh w-full overflow-hidden overscroll-none">
      {/* Full-bleed wallpaper: fixed inset-0 draws edge-to-edge, including
          under the status bar and navigation bar in an edge-to-edge PWA. */}
      <div
        aria-hidden
        className="fixed inset-0 bg-cover bg-top-left bg-no-repeat"
        style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
      />
      <div
        className={clsx(
          'relative h-dvh w-full overflow-hidden flex flex-col',
          dimmed ? 'bg-black/70' : 'bg-black/15',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default BackgroundWrapper
