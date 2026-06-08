import type { FC, ReactNode } from 'react'
import { AppShell } from '@mantine/core'
import BackgroundWrapper from './BackgroundWrapper'

interface HeaderProps {
  children: ReactNode
}

export const Header: FC<HeaderProps> = ({ children }) => {
  return (
    <AppShell>
      <BackgroundWrapper>
        <AppShell.Main className="flex! flex-col">{children}</AppShell.Main>
      </BackgroundWrapper>
    </AppShell>
  )
}
