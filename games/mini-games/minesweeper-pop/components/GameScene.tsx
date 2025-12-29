import React, { useState, useEffect, useRef } from 'react';
import { DifficultyLevel, GameStatus, ControlMode, CellState } from '../types';
import { useMinesweeper, DIFFICULTIES } from '../utils/gameLogic';
import { ArrowLeft, Clock, Flag, Shovel, RefreshCw, Trophy, AlertTriangle, Bomb, Lightbulb, Eye, X } from 'lucide-react';

interface GameSceneProps {
  difficulty: DifficultyLevel;
  onBack: () => void;
}

const GameScene: React.FC<GameSceneProps> = ({ difficulty, onBack }) => {
  const { 
    grid, status, elapsedTime, minesLeft, hintCount,
    initBoard, handleReveal, toggleFlag, handleChord, handleHint
  } = useMinesweeper(difficulty);

  const [mode, setMode] = useState<ControlMode>(ControlMode.DIG);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const config = DIFFICULTIES[difficulty];

  // Open modal when game ends
  useEffect(() => {
    if (status === GameStatus.WON || status === GameStatus.LOST) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [status]);

  // --- Custom Drag-Scroll Logic (Mouse) ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ left: 0, top: 0, x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      left: scrollRef.current.scrollLeft,
      top: scrollRef.current.scrollTop,
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Threshold to distinguish click from drag
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDraggedRef.current = true;
      e.preventDefault();
      scrollRef.current.scrollLeft = dragStartRef.current.left - dx;
      scrollRef.current.scrollTop = dragStartRef.current.top - dy;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Handle cell interaction
  const onCellInteraction = (index: number) => {
    // If we were dragging the map, ignore the click on release
    if (hasDraggedRef.current) return;
    if (status === GameStatus.WON || status === GameStatus.LOST) return;

    const isFirstClick = status === GameStatus.IDLE;
    const cell = grid[index];

    // Smart Chording: If revealed, try to chord
    if (cell.state === CellState.REVEALED) {
      handleChord(index);
      return;
    }

    // Normal Click
    if (mode === ControlMode.FLAG) {
      toggleFlag(index);
    } else {
      if (cell.state === CellState.FLAGGED) return; // Protect flagged
      handleReveal(index, isFirstClick);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Header */}
      <header className="h-16 px-4 flex items-center justify-between bg-white shadow-sm z-10 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-600">
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            <Flag size={18} className="text-red-500 fill-red-500" />
            <span className="font-mono font-bold text-lg w-6 text-center">{minesLeft}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            <Clock size={18} className="text-blue-500" />
            <span className="font-mono font-bold text-lg w-10 text-center">{elapsedTime}</span>
          </div>
        </div>

        <div className="flex gap-1">
          <button 
            onClick={handleHint} 
            disabled={hintCount === 0 || status === GameStatus.WON || status === GameStatus.LOST}
            className="relative p-2 rounded-full hover:bg-yellow-50 active:bg-yellow-100 text-yellow-500 disabled:opacity-30 disabled:grayscale transition-all"
          >
            <Lightbulb size={24} fill={hintCount > 0 ? "currentColor" : "none"} />
            {hintCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                {hintCount}
              </span>
            )}
          </button>
          
          <button onClick={initBoard} className="p-2 -mr-2 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-600">
            <RefreshCw size={24} />
          </button>
        </div>
      </header>

      {/* Game Board Container - Scrollable with Mouse Drag Support */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex-1 overflow-auto bg-slate-200/50 relative no-scrollbar flex ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="m-auto p-8">
            <div 
              style={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${config.cols}, min-content)`,
                gap: '2px',
              }}
              className="bg-slate-300 p-2 rounded-lg shadow-xl select-none"
            >
              {grid.map((cell) => (
                <CellComponent 
                  key={cell.id} 
                  data={cell} 
                  onClick={() => onCellInteraction(cell.id)}
                />
              ))}
            </div>
        </div>
      </div>

      {/* Floating Result Button (only if game over and modal closed) */}
      {!isModalOpen && (status === GameStatus.WON || status === GameStatus.LOST) && (
        <button 
            onClick={() => setIsModalOpen(true)}
            className="absolute bottom-28 right-6 z-20 bg-white p-3 rounded-full shadow-xl text-slate-600 border border-slate-100 animate-pop"
        >
            {status === GameStatus.WON ? <Trophy className="text-yellow-500" /> : <AlertTriangle className="text-red-500" />}
        </button>
      )}

      {/* Footer Controls */}
      <div className="h-24 pb-4 px-6 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 flex items-center justify-center gap-6 shrink-0">
         {/* Toggle Switch */}
         <div className="relative w-64 h-16 bg-slate-100 rounded-full border border-slate-200 p-1.5 cursor-pointer shadow-inner">
             {/* Inner container to map standard padding */}
             <div className="absolute inset-1.5 flex">
                {/* Sliding Background */}
                <div 
                    className={`w-1/2 h-full bg-white rounded-full shadow-md transition-transform duration-300 ease-spring ${mode === ControlMode.FLAG ? 'translate-x-full' : 'translate-x-0'}`}
                />
             </div>
             
             {/* Text/Icons Grid */}
             <div className="relative w-full h-full flex z-10">
                <button 
                  className={`flex-1 flex flex-col items-center justify-center h-full rounded-full transition-colors ${mode === ControlMode.DIG ? 'text-blue-600' : 'text-slate-400'}`}
                  onClick={() => setMode(ControlMode.DIG)}
                >
                  <Shovel size={24} className={mode === ControlMode.DIG ? 'fill-blue-100' : ''} />
                  <span className="text-[10px] font-bold uppercase mt-0.5">Dig</span>
                </button>

                <button 
                  className={`flex-1 flex flex-col items-center justify-center h-full rounded-full transition-colors ${mode === ControlMode.FLAG ? 'text-red-600' : 'text-slate-400'}`}
                  onClick={() => setMode(ControlMode.FLAG)}
                >
                  <Flag size={24} className={mode === ControlMode.FLAG ? 'fill-red-100' : ''} />
                  <span className="text-[10px] font-bold uppercase mt-0.5">Flag</span>
                </button>
             </div>
         </div>
      </div>

      {/* Modals */}
      {(status === GameStatus.WON || status === GameStatus.LOST) && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-pop">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-[90%] text-center relative">
            
            {/* Close Button */}
            <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100"
            >
                <X size={20} />
            </button>

            {status === GameStatus.WON ? (
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4 text-yellow-500">
                <Trophy size={40} fill="currentColor" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle size={40} fill="currentColor" />
              </div>
            )}
            
            <h2 className="text-3xl font-black text-slate-800 mb-2">
              {status === GameStatus.WON ? 'You Won!' : 'Game Over'}
            </h2>
            <p className="text-slate-500 font-medium mb-8">
              {status === GameStatus.WON 
                ? `Amazing! You cleared the field in ${elapsedTime} seconds.`
                : 'Better luck next time!'}
            </p>

            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center gap-2"
              >
                <Eye size={18} />
                View
              </button>
              <button 
                onClick={initBoard}
                className="flex-[2] py-3 px-4 rounded-xl font-bold bg-blue-500 text-white shadow-lg shadow-blue-200 hover:bg-blue-600 active:translate-y-1"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponent: Single Cell ---

const CellComponent: React.FC<{ data: any, onClick: () => void }> = React.memo(({ data, onClick }) => {
  const { state, isMine, neighborMines } = data;

  // Visual Styles
  let bgClass = 'bg-indigo-300 hover:bg-indigo-400 border-b-4 border-indigo-500 active:border-b-0 active:mt-1'; // Default Hidden (Raised 3D look)
  let content = null;

  if (state === CellState.REVEALED) {
    bgClass = 'bg-white border border-slate-200'; // Flat
    if (isMine) {
      // Logic for revealed mines that weren't the trigger
      content = <Bomb size={24} className="text-slate-800" />;
    } else if (neighborMines > 0) {
      const colors = [
        '', 
        'text-blue-500', 
        'text-green-500', 
        'text-red-500', 
        'text-purple-600', 
        'text-orange-600', 
        'text-teal-600', 
        'text-gray-800', 
        'text-gray-800'
      ];
      content = <span className={`font-black text-2xl ${colors[neighborMines]}`}>{neighborMines}</span>;
    }
  } else if (state === CellState.FLAGGED) {
    bgClass = 'bg-indigo-300 border-b-4 border-indigo-500';
    content = <Flag size={20} className="text-red-500 fill-red-500" />;
  } else if (state === CellState.EXPLODED) {
    bgClass = 'bg-red-500 border-red-700';
    content = <Bomb size={24} className="text-white fill-white animate-bounce" />;
  }

  return (
    <div 
      onClick={onClick}
      className={`
        w-10 h-10 rounded-md flex items-center justify-center transition-all duration-75
        ${bgClass}
      `}
    >
      {content}
    </div>
  );
});

export default GameScene;