import React, { useState, useEffect } from 'react';
import { DifficultyLevel, DifficultyConfig } from '../types';
import { getBestScore, DIFFICULTIES } from '../utils/gameLogic';
import { Trophy, Play, Gamepad2, Bomb } from 'lucide-react';

interface MainMenuProps {
  onStart: (difficulty: DifficultyLevel) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  // Trigger a re-render to fetch latest scores when mounting
  const [, setTick] = useState(0); 
  useEffect(() => setTick(t => t + 1), []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-sky-100 to-indigo-50">
      <div className="mb-10 text-center animate-pop">
        <div className="flex items-center justify-center gap-2 mb-2">
            <Bomb className="w-12 h-12 text-slate-800 fill-red-400" />
            <h1 className="text-5xl font-extrabold text-slate-800 tracking-tight">Minesweeper</h1>
        </div>
        <p className="text-slate-500 font-medium text-lg">Mobile Edition</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {Object.values(DIFFICULTIES).map((diff) => (
          <DifficultyCard 
            key={diff.name} 
            config={diff} 
            level={diff.name.toUpperCase() as DifficultyLevel}
            onSelect={() => onStart(diff.name.toUpperCase() as DifficultyLevel)}
          />
        ))}
      </div>
    </div>
  );
};

const DifficultyCard: React.FC<{ 
  config: DifficultyConfig; 
  level: DifficultyLevel; 
  onSelect: () => void 
}> = ({ config, level, onSelect }) => {
  const bestScore = getBestScore(level);
  
  // Tailwind dynamic color classes
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200 hover:border-emerald-400',
    orange: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200 hover:border-orange-400',
    rose: 'bg-rose-100 border-rose-300 text-rose-800 hover:bg-rose-200 hover:border-rose-400'
  };

  const iconMap: Record<string, string> = {
    emerald: 'text-emerald-500',
    orange: 'text-orange-500',
    rose: 'text-rose-500'
  };

  const baseClass = "relative w-full p-5 rounded-2xl border-b-8 transition-all active:border-b-0 active:translate-y-2 flex items-center justify-between shadow-lg cursor-pointer select-none group";
  
  return (
    <button 
      className={`${baseClass} ${colorMap[config.color]}`} 
      onClick={onSelect}
    >
      <div className="text-left">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          {config.name}
        </h3>
        <p className="text-sm opacity-75 font-semibold mt-1">
          {config.rows}x{config.cols} • {config.mines} Mines
        </p>
      </div>

      <div className="flex flex-col items-end justify-center">
         {bestScore !== null ? (
           <div className="flex items-center gap-1 bg-white/50 px-3 py-1 rounded-full mb-1">
             <Trophy size={14} className={iconMap[config.color]} />
             <span className="font-bold text-sm">{bestScore}s</span>
           </div>
         ) : (
            <div className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1">No Record</div>
         )}
         <div className="bg-white/80 p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
             <Play size={20} className={iconMap[config.color]} fill="currentColor" />
         </div>
      </div>
    </button>
  );
};

export default MainMenu;