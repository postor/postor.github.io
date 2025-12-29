import { useState, useCallback, useEffect, useRef } from 'react';
import { CellData, CellState, DifficultyConfig, GameStatus, DifficultyLevel, STORAGE_PREFIX } from '../types';

// --- Constants & Helpers ---

export const DIFFICULTIES: Record<DifficultyLevel, DifficultyConfig> = {
  [DifficultyLevel.EASY]: { name: 'Easy', rows: 9, cols: 9, mines: 10, color: 'emerald' },
  [DifficultyLevel.MEDIUM]: { name: 'Medium', rows: 16, cols: 16, mines: 40, color: 'orange' },
  [DifficultyLevel.HARD]: { name: 'Hard', rows: 16, cols: 30, mines: 99, color: 'rose' },
};

const getNeighbors = (index: number, rows: number, cols: number): number[] => {
  const neighbors: number[] = [];
  const r = Math.floor(index / cols);
  const c = index % cols;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push(nr * cols + nc);
      }
    }
  }
  return neighbors;
};

// --- Hook ---

export const useMinesweeper = (difficulty: DifficultyLevel) => {
  const config = DIFFICULTIES[difficulty];
  const [grid, setGrid] = useState<CellData[]>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [minesLeft, setMinesLeft] = useState(config.mines);
  const [hintCount, setHintCount] = useState(0);

  // Timer Ref to clear interval
  const timerRef = useRef<number | undefined>(undefined);

  // Initialize Board
  const initBoard = useCallback(() => {
    const totalCells = config.rows * config.cols;
    const newGrid: CellData[] = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      row: Math.floor(i / config.cols),
      col: i % config.cols,
      isMine: false,
      neighborMines: 0,
      state: CellState.HIDDEN,
    }));
    setGrid(newGrid);
    setStatus(GameStatus.IDLE);
    setMinesLeft(config.mines);
    setElapsedTime(0);
    setStartTime(null);
    
    // Init hints based on difficulty
    const initialHints = difficulty === DifficultyLevel.EASY ? 1 : difficulty === DifficultyLevel.MEDIUM ? 2 : 3;
    setHintCount(initialHints);

    if (timerRef.current) clearInterval(timerRef.current);
  }, [config, difficulty]);

  useEffect(() => {
    initBoard();
    return () => clearInterval(timerRef.current);
  }, [initBoard]);

  // Timer Effect
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      setStartTime(Date.now());
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
  }, [status]);

  // Core Action: Reveal Cell
  const handleReveal = useCallback((index: number, isFirstClick: boolean = false) => {
    setGrid((prevGrid) => {
      // 1. If First Click, Generate Mines
      let currentGrid = [...prevGrid];
      if (isFirstClick) {
        // Exclude the clicked cell and its neighbors from mines to ensure safe start
        const safeZone = new Set([index, ...getNeighbors(index, config.rows, config.cols)]);
        let minesPlaced = 0;
        while (minesPlaced < config.mines) {
          const rand = Math.floor(Math.random() * currentGrid.length);
          if (!currentGrid[rand].isMine && !safeZone.has(rand)) {
            currentGrid[rand] = { ...currentGrid[rand], isMine: true };
            minesPlaced++;
          }
        }
        // Calculate Numbers
        currentGrid = currentGrid.map((cell, idx) => {
          if (cell.isMine) return cell;
          const neighbors = getNeighbors(idx, config.rows, config.cols);
          const count = neighbors.reduce((acc, nIdx) => acc + (currentGrid[nIdx].isMine ? 1 : 0), 0);
          return { ...cell, neighborMines: count };
        });
      }

      const cell = currentGrid[index];

      // Guard clauses
      if (cell.state !== CellState.HIDDEN && cell.state !== CellState.FLAGGED) return prevGrid; // Already open
      if (cell.state === CellState.FLAGGED) return prevGrid; // Safety: don't reveal flagged via normal click

      // Hit Mine
      if (cell.isMine) {
        setStatus(GameStatus.LOST);
        // Reveal all mines: triggered one is EXPLODED, others are REVEALED
        return currentGrid.map((c, i) => {
          if (c.isMine) {
            return { ...c, state: i === index ? CellState.EXPLODED : CellState.REVEALED };
          }
          return c;
        });
      }

      // Flood Fill
      const revealQueue = [index];
      const visited = new Set<number>();
      
      // Clone grid for mutation during floodfill
      const nextGrid = [...currentGrid];

      while (revealQueue.length > 0) {
        const currIdx = revealQueue.pop()!;
        if (visited.has(currIdx)) continue;
        visited.add(currIdx);

        const currCell = nextGrid[currIdx];
        if (currCell.state !== CellState.HIDDEN) continue; // Skip if already handled

        nextGrid[currIdx] = { ...currCell, state: CellState.REVEALED };

        if (currCell.neighborMines === 0 && !currCell.isMine) {
          const neighbors = getNeighbors(currIdx, config.rows, config.cols);
          neighbors.forEach(n => {
            if (nextGrid[n].state === CellState.HIDDEN) {
               revealQueue.push(n);
            }
          });
        }
      }

      // Check Win Condition
      const hiddenNonMines = nextGrid.filter(c => !c.isMine && c.state !== CellState.REVEALED).length;
      if (hiddenNonMines === 0) {
        setStatus(GameStatus.WON);
        saveScore(difficulty, elapsedTime + 1); 
      }

      return nextGrid;
    });

    if (isFirstClick) {
      setStatus(GameStatus.PLAYING);
    }
  }, [config, difficulty, elapsedTime]);


  // Action: Toggle Flag
  const toggleFlag = useCallback((index: number) => {
    if (status !== GameStatus.PLAYING && status !== GameStatus.IDLE) return;
    
    setGrid(prev => {
      const newGrid = [...prev];
      const cell = newGrid[index];
      if (cell.state === CellState.REVEALED) return prev;

      if (cell.state === CellState.FLAGGED) {
        newGrid[index] = { ...cell, state: CellState.HIDDEN };
        setMinesLeft(m => m + 1);
      } else {
        newGrid[index] = { ...cell, state: CellState.FLAGGED };
        setMinesLeft(m => m - 1);
      }
      return newGrid;
    });
  }, [status]);


  // Action: Chording (Smart Reveal)
  const handleChord = useCallback((index: number) => {
    if (status !== GameStatus.PLAYING) return;
    
    setGrid(prevGrid => {
        const cell = prevGrid[index];
        if (cell.state !== CellState.REVEALED) return prevGrid;

        const neighbors = getNeighbors(index, config.rows, config.cols);
        const flaggedCount = neighbors.reduce((acc, nIdx) => 
            acc + (prevGrid[nIdx].state === CellState.FLAGGED ? 1 : 0), 0
        );

        if (flaggedCount === cell.neighborMines) {
            let nextGrid = [...prevGrid];
            let hitMine = false;

            const neighborsToReveal = neighbors.filter(n => nextGrid[n].state === CellState.HIDDEN);
            const processQueue = [...neighborsToReveal];
            const processedChord = new Set<number>();

            while (processQueue.length > 0) {
                const pIdx = processQueue.pop()!;
                if (processedChord.has(pIdx)) continue;
                processedChord.add(pIdx);

                const pCell = nextGrid[pIdx];
                if (pCell.state === CellState.FLAGGED || pCell.state === CellState.REVEALED) continue;

                if (pCell.isMine) {
                    hitMine = true;
                    nextGrid[pIdx] = { ...pCell, state: CellState.EXPLODED };
                } else {
                    nextGrid[pIdx] = { ...pCell, state: CellState.REVEALED };
                    if (pCell.neighborMines === 0) {
                         const pNeighbors = getNeighbors(pIdx, config.rows, config.cols);
                         pNeighbors.forEach(pn => {
                             if (nextGrid[pn].state === CellState.HIDDEN) processQueue.push(pn);
                         });
                    }
                }
            }

            if (hitMine) {
                setStatus(GameStatus.LOST);
                // Reveal other mines as well
                return nextGrid.map(c => c.isMine && c.state !== CellState.EXPLODED ? { ...c, state: CellState.REVEALED } : c);
            }
            
            const hiddenNonMines = nextGrid.filter(c => !c.isMine && c.state !== CellState.REVEALED).length;
            if (hiddenNonMines === 0) {
                setStatus(GameStatus.WON);
                saveScore(difficulty, elapsedTime);
            }

            return nextGrid;
        }

        return prevGrid;
    });
  }, [config, difficulty, elapsedTime, status]);

  // Action: Use Hint
  const handleHint = useCallback(() => {
    if (status !== GameStatus.PLAYING && status !== GameStatus.IDLE) return;
    if (hintCount <= 0) return;

    // Use setter to access latest grid state
    setGrid(prev => {
      // Find all unrevealed mines that are NOT flagged
      const unflaggedMines = prev.filter(c => c.isMine && c.state === CellState.HIDDEN);
      
      if (unflaggedMines.length === 0) return prev; // Should be impossible if game is playing

      // Pick random mine
      const target = unflaggedMines[Math.floor(Math.random() * unflaggedMines.length)];
      
      const newGrid = [...prev];
      newGrid[target.id] = { ...target, state: CellState.FLAGGED };
      
      // Update mine count visual
      setMinesLeft(m => m - 1);
      
      return newGrid;
    });
    
    setHintCount(h => h - 1);
    
    // Ensure status is playing if used on first click (rare edge case but good safety)
    if (status === GameStatus.IDLE) setStatus(GameStatus.PLAYING);

  }, [hintCount, status]);

  return {
    grid,
    status,
    elapsedTime,
    minesLeft,
    hintCount,
    initBoard,
    handleReveal,
    toggleFlag,
    handleChord,
    handleHint
  };
};

// --- Local Storage Utils ---

function saveScore(difficulty: DifficultyLevel, time: number) {
  try {
    const key = `${STORAGE_PREFIX}${difficulty}`;
    const raw = localStorage.getItem(key);
    const prevScore = raw ? parseInt(raw, 10) : Infinity;
    if (time < prevScore) {
      localStorage.setItem(key, time.toString());
    }
  } catch (e) {
    console.error("Storage failed", e);
  }
}

export function getBestScore(difficulty: DifficultyLevel): number | null {
  try {
    const key = `${STORAGE_PREFIX}${difficulty}`;
    const raw = localStorage.getItem(key);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}