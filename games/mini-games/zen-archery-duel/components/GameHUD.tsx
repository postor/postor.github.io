import React from 'react';
import { ArrowLeft, ArrowRight, Wind } from 'lucide-react';
import { GameStats, Difficulty } from '../types';
import { MAX_HP } from '../constants';

interface GameHUDProps {
  stats: GameStats;
  difficulty: Difficulty;
  onLeave: () => void;
}

const ProgressBar: React.FC<{ current: number; max: number; color: string; label: string; alignRight?: boolean }> = ({ 
  current, max, color, label, alignRight 
}) => {
  const percentage = Math.max(0, (current / max) * 100);
  return (
    <div className={`flex flex-col w-32 md:w-64 ${alignRight ? 'items-end' : 'items-start'}`}>
      <span className="text-white font-bold mb-1 font-serif text-sm md:text-lg shadow-black drop-shadow-md">{label}</span>
      <div className="w-full h-4 md:h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-600 relative">
        <div 
            className={`h-full transition-all duration-500 ease-out ${color}`} 
            style={{ width: `${percentage}%`, float: alignRight ? 'right' : 'left' }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-white drop-shadow-md">
            {current} / {max}
        </span>
      </div>
    </div>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({ stats, difficulty, onLeave }) => {
  // Calculate wind direction visual
  const windSpeed = Math.abs(stats.currentWind);
  // Normalize wind visual width (0 to 400 is typical range)
  const windBarWidth = Math.min(100, (windSpeed / 400) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 md:p-6">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full gap-2">
        {/* Player Stats */}
        <ProgressBar 
            current={stats.playerHp} 
            max={MAX_HP} 
            color="bg-blue-500" 
            label="YOU" 
        />

        {/* Center Info */}
        <div className="flex flex-col items-center bg-black/40 backdrop-blur-sm p-2 md:p-4 rounded-xl border border-white/10 shrink-0">
            <h2 className="text-white font-serif text-sm md:text-xl mb-1 md:mb-2">{difficulty} MODE</h2>
            
            {/* Wind Indicator */}
            <div className="flex items-center gap-2 md:gap-3">
                <Wind className="text-gray-300 w-4 h-4 md:w-5 md:h-5" />
                <div className="flex flex-col items-center w-20 md:w-32">
                    <span className="text-[10px] md:text-xs text-gray-300 uppercase tracking-widest mb-1">Wind</span>
                    <div className="w-full h-1.5 md:h-2 bg-gray-700 rounded-full relative overflow-hidden">
                        {/* Center marker */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2" />
                        
                        {/* Wind bar */}
                        <div 
                            className={`h-full absolute top-0 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000`}
                            style={{
                                left: stats.currentWind > 0 ? '50%' : `calc(50% - ${windBarWidth}%)`,
                                width: `${windBarWidth}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Turn Indicator */}
            <div className="mt-1 md:mt-3 px-2 md:px-4 py-0.5 md:py-1 rounded-full bg-white/10 text-white text-[10px] md:text-sm font-bold animate-pulse whitespace-nowrap">
                {stats.isPlayerTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
            </div>
        </div>

        {/* AI Stats */}
        <ProgressBar 
            current={stats.aiHp} 
            max={MAX_HP} 
            color="bg-red-500" 
            label="OPPONENT" 
            alignRight
        />
      </div>

      {/* Footer Controls */}
      <div className="flex justify-between items-end pointer-events-auto w-full">
        <button 
            onClick={onLeave}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-800 text-white text-xs md:text-base rounded hover:bg-gray-700 border border-gray-600 transition font-serif"
        >
            Surrender
        </button>

        <div className="text-white/50 text-[10px] md:text-xs text-right bg-black/30 p-2 rounded">
            <p>Drag mouse/touch to aim.</p>
            <p>Release to shoot.</p>
        </div>
      </div>
    </div>
  );
};