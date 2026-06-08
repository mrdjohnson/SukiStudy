import type { ComponentProps, PropsWithChildren } from 'react'
import { useEffect, useMemo } from 'react'
import { useMatches, Button, Container, Group } from '@mantine/core'
import { Icons } from './Icons'
import { GameResults } from './GameResults'
import { type GameLogic } from '../hooks/useGameLogic'
import { type GameItem } from '../core/types'
import { useDrawerRouteHeader } from './DrawerRoute'

type GameHeaderProps<T extends GameItem> = PropsWithChildren<{
  gameLogic: GameLogic<T>
  skip?: () => void
  onClear?: () => void
  clearDisabled?: boolean
  onHint?: () => void
  hintDisabled?: boolean
  shouldNavigateBack?: boolean
  onPlayAgain?: () => void
  isLastGame?: boolean
}>

export const GameContainer = <T extends GameItem>({
  gameLogic,
  children,
  skip,
  onClear,
  clearDisabled,
  onHint,
  hintDisabled,
  onPlayAgain,
  isLastGame,
}: GameHeaderProps<T>) => {
  const buttonSizes = useMatches({
    base: 'md',
    lg: 'sm',
  })

  const {
    game,
    gameState,
    // shouldNavigateBack,
    isAnswerIncorrect,
    finishRound,
    canSkip,
    endGame,
    isWaitingForNextRound,
  } = gameLogic

  const { pushHeader, popHeader } = useDrawerRouteHeader()

  useEffect(() => {
    pushHeader({ title: game.name })

    return popHeader
  }, [game.name, pushHeader, popHeader])

  const bottomButton = useMemo(() => {
    let props: Partial<ComponentProps<typeof Button>>

    if (!canSkip) {
      props = {
        children: 'Finish',
        onClick: endGame,
      }
    } else if (!canSkip || (gameState.roundNumber + 1 > gameState.maxRoundNumber && !canSkip)) {
      props = {
        children: 'Finish',
        onClick: finishRound,
      }
    } else if (isAnswerIncorrect) {
      props = {
        children: 'Next',
        onClick: finishRound,
      }
    } else {
      props = {
        children: 'Skip',
        disabled: !canSkip || isWaitingForNextRound,
        onClick: skip,
      }
    }

    return (
      <Button
        variant="outline"
        size={buttonSizes}
        rightSection={<Icons.SkipForward className="size-4" />}
        {...props}
      />
    )
  }, [
    isAnswerIncorrect,
    gameState.isFinished,
    canSkip,
    gameState.roundNumber,
    gameState.maxRoundNumber,
    buttonSizes,
    gameState.gameItems,
    skip,
    isWaitingForNextRound,
  ])

  if (gameState.isFinished) {
    return <GameResults gameLogic={gameLogic} onPlayAgain={onPlayAgain} isLastGame={isLastGame} />
  }

  if (gameState.gameItems.length < gameState.maxRoundNumber) {
    return <div className="p-8 text-center">Not enough Game items loaded.</div>
  }

  return (
    <Container size="sm" className="size-full px-0! sm:px-2! md:px-4! max-h-full flex flex-col">
      <Group className="justify-between! pb-2 md:mx-4 flex-nowrap! shrink-0!">
        <span className="font-bold text-gray-500 ml-auto mr-auto -mt-2">
          {gameState.roundNumber} / {gameState.maxRoundNumber}
        </span>
      </Group>

      <div className="p-2 overflow-hidden shrink max-h-full flex flex-col justify-center">
        {children}
      </div>

      <Group className="justify-between! pt-4 px-2 md:mx-4 flex-nowrap! shrink-0! max-w-lg place-self-center w-full">
        <Button
          variant="outline"
          size={buttonSizes}
          onClick={onClear}
          leftSection={<Icons.Eraser className="size-4" />}
          disabled={!onClear || clearDisabled}
        >
          Clear
        </Button>

        <Button
          variant="outline"
          size={buttonSizes}
          onClick={onHint}
          disabled={!onHint || hintDisabled}
          className="disabled:hidden!"
        >
          <Icons.Lightbulb className="size-4 " />
        </Button>

        {bottomButton}
      </Group>
    </Container>
  )
}
