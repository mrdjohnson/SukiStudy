import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Subject, Assignment, GameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { waniKaniService } from '../../services/wanikaniService'
import { useSettings } from '../../contexts/SettingsContext'
import { playSound } from '../../utils/sound'
import { toRomanji } from '../../utils/romanji'
import { GameResults } from '../../components/GameResults'
import { useLocalStorage } from '@mantine/hooks'

// Grid size
const ROWS = 5
const COLS = 5

interface Cell {
  id: string // r-c
  char: string
  romanji: string
  row: number
  col: number
  isRomanjiDisplay: boolean
  correct: boolean
  wrong: boolean
}

interface ConnectGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const ConnectGame: React.FC<ConnectGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null)
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null)
  const [grid, setGrid] = useState<Cell[]>([])
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [validPath, setValidPath] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(
    Number(localStorage.getItem('suki_connect_highscore') || 0),
  )
  const [message, setMessage] = useState('')
  const [found, setFound] = useState(false)
  const [hintCellId, setHintCellId] = useState<string | null>(null)
  const [pressedCell, setPressedCell] = useState<string | null>(null)

  const [history, setHistory] = useState<{ subject: Subject; correct: boolean }[]>([])
  const startTimeRef = useRef(Date.now())
  const [finished, setFinished] = useState(false)

  const { soundEnabled, romanjiEnabled, setHelpSteps } = useSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const hiraganaPool =
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'

  useEffect(() => {
    setHelpSteps([
      {
        title: 'Trace Reading',
        description: "Connect hiragana to spell the word's reading.",
        icon: Icons.GridDots,
      },
      { title: 'Drag to Connect', description: 'Slide across neighbors.', icon: Icons.Link },
      {
        title: 'Romanji',
        description: 'If enabled, some tiles show as Romanji.',
        icon: Icons.FileQuestion,
      },
    ])
    return () => setHelpSteps(null)
  }, [])

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('suki_connect_highscore', String(score))
    }
  }, [score, highScore])

  const initLevel = () => {
    setSelectedCells([])
    setFound(false)
    setMessage('')
    setHintCellId(null)
    setPressedCell(null)

    // Stop after 5 successes for standardized session
    if (score >= 5) {
      setFinished(true)
      return
    }

    let candidates = items.filter(i => {
      const reading = i.subject.readings?.[0]?.reading
      return reading && reading.length >= 2 && reading.length <= 8
    })

    if (candidates.length === 0) return

    const idx = Math.floor(Math.random() * Math.min(candidates.length, 5))
    const selection = candidates[idx]
    setCurrentSubject(selection.subject)
    setCurrentAssignment(selection.assignment || null)

    const reading = selection.subject.readings![0].reading

    const pathCoords = generatePath(reading.length)
    const pathIds = pathCoords.map(p => `${p.r}-${p.c}`)
    setValidPath(pathIds)

    const newGrid: Cell[] = []

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        newGrid.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          char: '',
          romanji: '',
          isRomanjiDisplay: romanjiEnabled && Math.random() > 0.8,
          correct: false,
          wrong: false,
        })
      }
    }

    pathCoords.forEach((pos, idx) => {
      const cellIdx = pos.r * COLS + pos.c
      const char = reading[idx]
      newGrid[cellIdx].char = char
      newGrid[cellIdx].romanji = toRomanji(char)
    })

    newGrid.forEach(cell => {
      if (!cell.char) {
        const char = hiraganaPool[Math.floor(Math.random() * hiraganaPool.length)]
        cell.char = char
        cell.romanji = toRomanji(char)
      }
    })

    setGrid(newGrid)
  }

  const generatePath = (length: number) => {
    for (let i = 0; i < 100; i++) {
      const path: { r: number; c: number }[] = []
      const startR = Math.floor(Math.random() * ROWS)
      const startC = Math.floor(Math.random() * COLS)
      path.push({ r: startR, c: startC })
      if (solvePath(path, length)) return path
    }
    return [{ r: 0, c: 0 }]
  }

  const solvePath = (path: { r: number; c: number }[], targetLen: number): boolean => {
    if (path.length === targetLen) return true
    const curr = path[path.length - 1]
    const neighbors = [
      { r: curr.r - 1, c: curr.c },
      { r: curr.r + 1, c: curr.c },
      { r: curr.r, c: curr.c - 1 },
      { r: curr.r, c: curr.c + 1 },
      { r: curr.r - 1, c: curr.c - 1 },
      { r: curr.r - 1, c: curr.c + 1 },
      { r: curr.r + 1, c: curr.c - 1 },
      { r: curr.r + 1, c: curr.c + 1 },
    ].sort(() => 0.5 - Math.random())

    for (const n of neighbors) {
      if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
        if (!path.some(p => p.r === n.r && p.c === n.c)) {
          path.push(n)
          if (solvePath(path, targetLen)) return true
          path.pop()
        }
      }
    }
    return false
  }

  useEffect(() => {
    if (!loading && items.length > 0) {
      // Reset state on mount
      setScore(0)
      setHistory([])
      startTimeRef.current = Date.now()
      setFinished(false)
      initLevel()
    }
  }, [loading, items])

  const handlePointerDown = (e: React.PointerEvent, cellId: string) => {
    if (found) return
    e.preventDefault()
    setIsDragging(true)
    setPressedCell(cellId)
    const existingIndex = selectedCells.indexOf(cellId)
    if (existingIndex !== -1) {
      setSelectedCells(prev => prev.slice(0, existingIndex + 1))
    } else {
      setSelectedCells([cellId])
    }
    setMessage('')
    playSound('pop', soundEnabled)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || found) return
    e.preventDefault()
    const element = document.elementFromPoint(e.clientX, e.clientY)
    const cellId = element?.getAttribute('data-cell-id')
    if (cellId) {
      setPressedCell(cellId)
      const existingIndex = selectedCells.indexOf(cellId)
      if (existingIndex !== -1) {
        if (existingIndex !== selectedCells.length - 1) {
          setSelectedCells(prev => prev.slice(0, existingIndex + 1))
          playSound('pop', soundEnabled)
        }
      } else {
        const lastId = selectedCells[selectedCells.length - 1]
        const [lr, lc] = lastId.split('-').map(Number)
        const [cr, cc] = cellId.split('-').map(Number)
        if (Math.abs(lr - cr) <= 1 && Math.abs(lc - cc) <= 1) {
          setSelectedCells(prev => [...prev, cellId])
          playSound('pop', soundEnabled)
        }
      }
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    setPressedCell(null)
    if (found) return
    checkAnswer()
  }

  const checkAnswer = () => {
    if (selectedCells.length === 0) return
    const selectedChars = selectedCells
      .map(id => {
        const [r, c] = id.split('-').map(Number)
        return grid[r * COLS + c].char
      })
      .join('')
    const correctReading = currentSubject?.readings?.[0]?.reading

    if (selectedChars === correctReading) {
      setScore(s => s + 1)
      setFound(true)
      setMessage('Correct!')
      setGrid(prev =>
        prev.map(cell => (selectedCells.includes(cell.id) ? { ...cell, correct: true } : cell)),
      )

      if (currentSubject) setHistory(prev => [...prev, { subject: currentSubject, correct: true }])

      playSound('success', soundEnabled)
      if (
        currentAssignment &&
        currentAssignment.id &&
        new Date(currentAssignment.available_at!) < new Date()
      ) {
        waniKaniService.createReview(currentAssignment.id, 0, 0).catch(e => console.error(e))
      }

      setTimeout(initLevel, 1500)
    } else {
      if (selectedCells.length > 1) playSound('error', soundEnabled)
      setGrid(prev =>
        prev.map(cell => (selectedCells.includes(cell.id) ? { ...cell, wrong: true } : cell)),
      )
      setTimeout(() => {
        setGrid(prev => prev.map(cell => ({ ...cell, wrong: false })))
      }, 500)
    }
  }

  const handleClear = () => {
    if (!found) {
      setSelectedCells([])
      setMessage('')
    }
  }

  const handleSkip = () => {
    initLevel()
  }

  const handleHint = () => {
    let matchCount = 0
    for (let i = 0; i < selectedCells.length; i++) {
      if (selectedCells[i] === validPath[i]) matchCount++
      else break
    }
    if (matchCount === validPath.length) return
    const nextId = validPath[matchCount]
    setHintCellId(nextId)
    setTimeout(() => setHintCellId(null), 1500)
  }

  const getCenterCoords = (id: string) => {
    const [r, c] = id.split('-').map(Number)
    const x = c * (100 / COLS) + 100 / COLS / 2
    const y = r * (100 / ROWS) + 100 / ROWS / 2
    return { x, y }
  }

  const handleFinish = () => {
    if (onComplete) {
      onComplete({
        gameId: 'connect',
        score: score,
        maxScore: score, // Connect is endless, so score is max
        timeTaken: (Date.now() - startTimeRef.current) / 1000,
        history: history,
      })
    }
  }

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )
  if (items.length < 5)
    return <div className="p-8 text-center text-gray-500">Not enough vocabulary.</div>

  if (finished)
    return (
      <GameResults
        gameId="connect"
        score={score}
        maxScore={score}
        timeTaken={(Date.now() - startTimeRef.current) / 1000}
        history={history}
        onNext={handleFinish}
        isLastGame={!propItems}
      />
    )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 select-none overscroll-none touch-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {!propItems && (
            <Button variant="ghost" onClick={() => navigate('/session/games')}>
              <Icons.ChevronLeft />
            </Button>
          )}
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold">Connect</h2>
          <span className="text-xs text-indigo-600 font-bold">High Score: {highScore}</span>
        </div>
        <div className="font-mono bg-gray-100 px-3 py-1 rounded text-sm font-bold">
          Score: {score}
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">
          Trace the reading
        </div>
        <div className="text-5xl font-bold text-gray-900 mb-1">{currentSubject?.characters}</div>
        <div className="text-indigo-600 font-medium text-sm">
          {currentSubject?.meanings[0].meaning}
        </div>
        {currentAssignment && new Date(currentAssignment.available_at!) < new Date() && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded">
            Review Item
          </span>
        )}
      </div>

      <div className="h-12 mb-4 flex items-center justify-center gap-1">
        {selectedCells.map((id, idx) => {
          const [r, c] = id.split('-').map(Number)
          const cell = grid[r * COLS + c]
          return (
            <button
              key={`${id}-${idx}`}
              className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border-2 border-indigo-200"
            >
              {cell.char}
            </button>
          )
        })}
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto aspect-square max-w-[320px] touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#818cf8" />
            </marker>
          </defs>
          <polyline
            points={selectedCells
              .map(id => {
                const { x, y } = getCenterCoords(id)
                return `${x}% ${y}%`
              })
              .join(' ')}
            fill="none"
            stroke={grid.some(c => c.wrong) ? '#fca5a5' : '#a5b4fc'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="absolute inset-0 grid grid-rows-5 grid-cols-5 gap-4 p-2 z-10">
          {grid.map(cell => {
            const isSelected = selectedCells.includes(cell.id)
            const isHint = cell.id === hintCellId
            const isPressed = cell.id === pressedCell

            return (
              <div
                key={cell.id}
                data-cell-id={cell.id}
                onPointerDown={e => handlePointerDown(e, cell.id)}
                className={`
                            relative rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 shadow-sm cursor-pointer select-none
                            ${
                              cell.correct
                                ? 'bg-green-500 text-white transform scale-100 shadow-lg'
                                : cell.wrong
                                  ? 'bg-red-500 text-white animate-shake'
                                  : isSelected
                                    ? 'bg-indigo-600 text-white transform scale-110 shadow-indigo-200 shadow-lg border-2 border-white'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
                            }
                            ${isHint ? 'ring-4 ring-yellow-400 bg-yellow-50 animate-pulse' : ''}
                        `}
              >
                {cell.isRomanjiDisplay ? cell.romanji : cell.char}
                {isPressed && (
                  <div className="absolute -top-10 bg-black text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-20">
                    {toRomanji(cell.char)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between max-w-[320px] mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={found || selectedCells.length === 0}
        >
          <Icons.Eraser className="w-4 h-4 mr-1" />
          Clear
        </Button>

        <div className={`text-lg font-bold ${found ? 'text-green-600' : 'text-gray-400'}`}>
          {found ? 'Correct!' : message || ''}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleHint} disabled={found}>
            <Icons.Lightbulb className="w-4 h-4 text-yellow-500" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleSkip}>
            <Icons.SkipForward className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}
