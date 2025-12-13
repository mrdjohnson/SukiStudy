import { Path, useNavigate } from 'react-router'
import { useMatches, Button, Container, Group, SimpleGrid, Title, ButtonProps } from '@mantine/core'
import { Icons } from './Icons'
import { PropsWithChildren, useCallback, useMemo } from 'react'
import { GameResults } from './GameResults'
import { GameLogic } from '../hooks/useGameLogic'

type GameHeaderProps = PropsWithChildren<{
  gameLogic: GameLogic
  skip?: () => void
  onClear?: () => void
  clearDisabled?: boolean
  onHint?: () => void
  hintDisabled?: boolean
  shouldNavigateBack?: boolean
}>

const Back = -1 as Partial<Path>

export const GameContainer = ({
  gameLogic,
  children,
  skip,
  onClear,
  clearDisabled,
  onHint,
  hintDisabled,
  shouldNavigateBack = false,
}: GameHeaderProps) => {
  const navigate = useNavigate()
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
  } = gameLogic

  const bottomButton = useMemo(() => {
    let props: Partial<React.ComponentProps<typeof Button>>

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
        disabled: !canSkip,
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
    gameState.gameItems
  ])

  if (gameState.isFinished) {
    return (
      <GameResults
        gameLogic={gameLogic}
        // isLastGame={!propItems} // Standard mode implies last game, propItems usually implies custom/lesson queue
      />
    )
  }

  return (
    <Container size="sm" className="mt-4">
      <SimpleGrid cols={3} className="mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="subtle"
            onClick={() => navigate(shouldNavigateBack ? Back : '/session/games')}
            className="-ml-4"
          >
            <Icons.ChevronLeft />
          </Button>
        </div>

        <Group>
          <Title order={3} className="!mx-auto">
            {game.name}
          </Title>
        </Group>

        {gameState.maxRoundNumber > 0 && (
          <Group>
            <span className="font-bold text-gray-500 ml-auto">
              {gameState.roundNumber} / {gameState.maxRoundNumber}
            </span>
          </Group>
        )}
      </SimpleGrid>

      <div className="px-2">{children}</div>

      <Group className="!justify-between pt-8 px-4">
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
        >
          <Icons.Lightbulb className="size-4 text-yellow-500" />
        </Button>

        {bottomButton}
      </Group>
    </Container>
  )
}
