
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';

// Grid size
const ROWS = 5;
const COLS = 5;

interface Cell {
  id: string; // r-c
  char: string;
  row: number;
  col: number;
  highlighted: boolean;
  correct: boolean;
}

export const ConnectGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [grid, setGrid] = useState<Cell[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]); // Array of IDs "r-c"
  const [validPath, setValidPath] = useState<string[]>([]); // IDs of the generated correct path
  const [isDragging, setIsDragging] = useState(false);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [found, setFound] = useState(false);
  const [hintCellId, setHintCellId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const hiraganaPool = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";

  const initLevel = () => {
    setSelectedCells([]);
    setFound(false);
    setMessage('');
    setHintCellId(null);
    
    // Pick a word
    const candidates = items.filter(i => {
       const reading = i.subject.readings?.[0]?.reading;
       return reading && reading.length >= 2 && reading.length <= 8;
    });

    if (candidates.length === 0) return;

    const target = candidates[Math.floor(Math.random() * candidates.length)].subject;
    setCurrentSubject(target);
    const reading = target.readings![0].reading;

    // Generate path
    const pathCoords = generatePath(reading.length);
    const pathIds = pathCoords.map(p => `${p.r}-${p.c}`);
    setValidPath(pathIds);
    
    // Fill grid
    const newGrid: Cell[] = [];
    
    // Create empty cells
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            newGrid.push({
                id: `${r}-${c}`,
                row: r,
                col: c,
                char: '',
                highlighted: false,
                correct: false
            });
        }
    }

    // Place word
    pathCoords.forEach((pos, idx) => {
        const cellIdx = pos.r * COLS + pos.c;
        newGrid[cellIdx].char = reading[idx];
    });

    // Fill rest
    newGrid.forEach(cell => {
        if (!cell.char) {
            cell.char = hiraganaPool[Math.floor(Math.random() * hiraganaPool.length)];
        }
    });

    setGrid(newGrid);
  };

  const generatePath = (length: number) => {
     for (let i = 0; i < 100; i++) {
        const path: {r: number, c: number}[] = [];
        const startR = Math.floor(Math.random() * ROWS);
        const startC = Math.floor(Math.random() * COLS);
        
        path.push({r: startR, c: startC});
        
        if (solvePath(path, length)) return path;
     }
     return [{r:0,c:0}]; 
  }

  const solvePath = (path: {r: number, c: number}[], targetLen: number): boolean => {
      if (path.length === targetLen) return true;
      
      const curr = path[path.length - 1];
      const neighbors = [
          {r: curr.r-1, c: curr.c}, {r: curr.r+1, c: curr.c},
          {r: curr.r, c: curr.c-1}, {r: curr.r, c: curr.c+1},
          {r: curr.r-1, c: curr.c-1}, {r: curr.r-1, c: curr.c+1},
          {r: curr.r+1, c: curr.c-1}, {r: curr.r+1, c: curr.c+1}
      ].sort(() => 0.5 - Math.random());

      for (const n of neighbors) {
          if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
              // Not visited
              if (!path.some(p => p.r === n.r && p.c === n.c)) {
                  path.push(n);
                  if (solvePath(path, targetLen)) return true;
                  path.pop();
              }
          }
      }
      return false;
  }

  useEffect(() => {
    if (!loading && items.length > 0) {
        initLevel();
    }
  }, [loading, items]);

  // --- Interaction Logic ---

  const handlePointerDown = (e: React.PointerEvent, cellId: string) => {
      if (found) return;
      e.preventDefault(); // Prevent text selection/scroll
      setIsDragging(true);

      const existingIndex = selectedCells.indexOf(cellId);
      if (existingIndex !== -1) {
          // If clicking an existing cell, truncate path to this cell (remove subsequent)
          setSelectedCells(prev => prev.slice(0, existingIndex + 1));
      } else {
          // Start new path
          setSelectedCells([cellId]);
      }
      setMessage('');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging || found) return;
      e.preventDefault();

      // Get element under pointer
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const cellId = element?.getAttribute('data-cell-id');

      if (cellId) {
          // If we entered a cell
          const existingIndex = selectedCells.indexOf(cellId);

          if (existingIndex !== -1) {
              // Backtracking logic: If we re-enter a cell already in the path
              // Truncate the path to keep up to this cell
              // But only if it's not the exact same cell we are currently at (last one)
              if (existingIndex !== selectedCells.length - 1) {
                   setSelectedCells(prev => prev.slice(0, existingIndex + 1));
              }
          } else {
              // New cell logic: Check adjacency to last cell
              const lastId = selectedCells[selectedCells.length - 1];
              const [lr, lc] = lastId.split('-').map(Number);
              const [cr, cc] = cellId.split('-').map(Number);
              
              if (Math.abs(lr - cr) <= 1 && Math.abs(lc - cc) <= 1) {
                  setSelectedCells(prev => [...prev, cellId]);
              }
          }
      }
  };

  const handlePointerUp = () => {
      setIsDragging(false);
      if (found) return;
      checkAnswer();
  };

  const checkAnswer = () => {
      if (selectedCells.length === 0) return;

      const selectedChars = selectedCells.map(id => {
          const [r, c] = id.split('-').map(Number);
          return grid[r * COLS + c].char;
      }).join('');

      const correctReading = currentSubject?.readings?.[0]?.reading;

      if (selectedChars === correctReading) {
          setScore(s => s + 1);
          setFound(true);
          setMessage("Correct!");
          // Mark correct cells visually
          setGrid(prev => prev.map(cell => 
             selectedCells.includes(cell.id) ? {...cell, correct: true} : cell
          ));
          setTimeout(initLevel, 1500);
      } else {
          // Don't clear, just show message
         // setMessage("Try again");
      }
  };

  // --- Helper Features ---

  const handleClear = () => {
      if (!found) {
        setSelectedCells([]);
        setMessage('');
      }
  };

  const handleSkip = () => {
      initLevel();
  };

  const handleHint = () => {
      // Logic: Find the first cell in validPath that isn't in selectedCells, 
      // OR if user is lost, highlight the first cell of validPath.
      
      // If user has started correctly so far
      let matchCount = 0;
      for (let i = 0; i < selectedCells.length; i++) {
          if (selectedCells[i] === validPath[i]) {
              matchCount++;
          } else {
              break;
          }
      }

      if (matchCount === validPath.length) {
          return; // Already done
      }

      // Show the next cell in the valid sequence
      const nextId = validPath[matchCount];
      setHintCellId(nextId);
      
      // Remove hint after 1.5s
      setTimeout(() => setHintCellId(null), 1500);
  };

  const handleSelectedCharClick = (index: number) => {
      if (!found) {
          setSelectedCells(prev => prev.slice(0, index + 1));
      }
  }

  // --- Render Helpers ---

  // Calculate SVG Line Coordinates
  // Grid is responsive, so we use percentages
  // Cell center = (col * 100/COLS) + (100/COLS/2)
  const getCenterCoords = (id: string) => {
      const [r, c] = id.split('-').map(Number);
      const x = (c * (100 / COLS)) + (100 / COLS / 2);
      const y = (r * (100 / ROWS)) + (100 / ROWS / 2);
      return { x, y };
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 5) return <div className="p-8 text-center text-gray-500">Not enough vocabulary.</div>;

  const currentReadingAttempt = selectedCells.map(id => {
      const [r, c] = id.split('-').map(Number);
      return grid[r * COLS + c].char;
  }).join('');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 select-none overscroll-none touch-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
         <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
         <h2 className="text-xl font-bold">Hiragana Connect</h2>
         <div className="font-mono bg-gray-100 px-3 py-1 rounded text-sm font-bold">Score: {score}</div>
      </div>

      {/* Prompt Area */}
      <div className="text-center mb-6">
          <div className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">Trace the reading</div>
          <div className="text-5xl font-bold text-gray-900 mb-1">{currentSubject?.characters}</div>
          <div className="text-indigo-600 font-medium text-sm">{currentSubject?.meanings[0].meaning}</div>
      </div>

      {/* Selected Chars Display */}
      <div className="h-12 mb-4 flex items-center justify-center gap-1">
          {selectedCells.map((id, idx) => {
              const [r, c] = id.split('-').map(Number);
              const char = grid[r * COLS + c].char;
              return (
                  <button 
                    key={`${id}-${idx}`}
                    onClick={() => handleSelectedCharClick(idx)}
                    className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border-2 border-indigo-200 hover:bg-red-100 hover:border-red-200 hover:text-red-600 transition-colors animate-fade-in"
                  >
                      {char}
                  </button>
              )
          })}
          {selectedCells.length === 0 && (
              <span className="text-gray-300 italic text-sm">Select letters below...</span>
          )}
      </div>

      {/* Game Board */}
      <div 
        ref={containerRef}
        className="relative mx-auto aspect-square max-w-[320px] touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
          {/* SVG Connector Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
             <defs>
                 <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#818cf8" />
                 </marker>
             </defs>
             <polyline 
                points={selectedCells.map(id => {
                    const {x, y} = getCenterCoords(id);
                    return `${x}% ${y}%`;
                }).join(' ')}
                fill="none"
                stroke="#a5b4fc"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
             />
          </svg>

          {/* Grid Cells */}
          <div className="absolute inset-0 grid grid-rows-5 grid-cols-5 gap-4 p-2 z-10">
            {grid.map((cell) => {
                const isSelected = selectedCells.includes(cell.id);
                const isHint = cell.id === hintCellId;
                
                return (
                    <div
                        key={cell.id}
                        data-cell-id={cell.id}
                        onPointerDown={(e) => handlePointerDown(e, cell.id)}
                        className={`
                            rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 shadow-sm cursor-pointer select-none
                            ${cell.correct 
                                ? 'bg-green-500 text-white transform scale-100 shadow-lg' 
                                : isSelected 
                                    ? 'bg-indigo-600 text-white transform scale-110 shadow-indigo-200 shadow-lg border-2 border-white' 
                                    : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
                            }
                            ${isHint ? 'ring-4 ring-yellow-400 bg-yellow-50 animate-pulse' : ''}
                        `}
                    >
                        {cell.char}
                    </div>
                )
            })}
          </div>
      </div>

      {/* Message & Actions */}
      <div className="mt-8 flex items-center justify-between max-w-[320px] mx-auto">
          <Button variant="outline" size="sm" onClick={handleClear} disabled={found || selectedCells.length === 0}>
             <Icons.Eraser className="w-4 h-4 mr-1" />
             Clear
          </Button>

          <div className={`text-lg font-bold ${found ? 'text-green-600' : 'text-gray-400'}`}>
              {found ? 'Correct!' : (message || '')}
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
  );
};
