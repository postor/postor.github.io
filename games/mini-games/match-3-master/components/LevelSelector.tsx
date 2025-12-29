
import React, { useEffect } from 'react';
import { LevelConfig, TileType } from '../types';
import { LEVELS } from '../levels';

const TARGET_ICON_MAP: {[key: string]: string} = {
  [TileType.BOMB]: '💣',
  [TileType.ROCKET_H]: '🚀↔',
  [TileType.ROCKET_V]: '🚀↕',
  [TileType.MAGIC]: '🌈',
  'ICE': '🧊',
  'LOCK': '🔓'
};

interface Props {
  onSelectLevel: (level: LevelConfig) => void;
  maxReachedLevel?: number;
  stars?: Record<number, number>;
  lastActiveLevelId?: number | null;
}

export const LevelSelector: React.FC<Props> = ({ onSelectLevel, maxReachedLevel = 1, stars = {}, lastActiveLevelId }) => {
  
  useEffect(() => {
    // Scroll priority: 
    // 1. The level we just returned from (lastActiveLevelId)
    // 2. The highest unlocked level (maxReachedLevel)
    const targetId = lastActiveLevelId ?? maxReachedLevel;

    if (targetId) {
      // Small timeout to ensure layout is fully rendered before scrolling
      const timer = setTimeout(() => {
          const el = document.getElementById(`level-btn-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lastActiveLevelId, maxReachedLevel]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 pb-20">
      <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-8 drop-shadow-lg">
        MATCH-3 MASTER
      </h1>
      
      <div className="grid grid-cols-2 gap-4 w-full">
        {LEVELS.map((level, index) => {
          const isLocked = (level.id || 100) > maxReachedLevel;
          const starCount = stars[level.id || 0] || 0;
          const isPassed = starCount > 0;
          // Show heart hint if unlocked but not passed
          const showHeartHint = !isLocked && !isPassed;
          
          return (
            <button
              key={index}
              id={`level-btn-${level.id}`}
              onClick={() => !isLocked && onSelectLevel(level)}
              disabled={isLocked}
              className={`group relative border-2 rounded-xl p-4 transition-all duration-200 flex flex-col items-center min-h-[110px] justify-between shadow-lg
                ${isLocked 
                  ? 'bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-cyan-500 hover:-translate-y-1 active:scale-95 cursor-pointer'
                }
              `}
            >
               {isLocked ? (
                   <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-4xl">🔒</span>
                   </div>
               ) : (
                 <>
                   {showHeartHint && (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-bounce flex items-center gap-1 z-10 border border-red-400">
                          <span>❤</span> +1
                      </div>
                   )}

                   <div className="flex flex-col items-center w-full">
                       <h3 className="font-bold text-slate-200 text-sm">Lv {level.id} {level.name}</h3>
                       
                       {/* Stars Display */}
                       <div className="flex gap-0.5 mt-1 h-5">
                          {[1, 2, 3].map(i => (
                              <span key={i} className={`text-sm ${i <= starCount ? 'text-yellow-400' : 'text-slate-600'}`}>
                                  {i <= starCount ? '★' : '☆'}
                              </span>
                          ))}
                       </div>
                   </div>
      
                   <div className="text-xs text-slate-400 mt-2 flex flex-col items-center gap-1 w-full">
                      {level.collectionTargets && level.collectionTargets.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1 w-full">
                           {level.collectionTargets.map((t, i) => (
                              <span key={i} className="text-[10px] text-yellow-300 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-600/50 whitespace-nowrap">
                                 {TARGET_ICON_MAP[t.type] || t.type} {t.count}
                              </span>
                           ))}
                         </div>
                      ) : (
                         <span className="text-cyan-400 font-mono">🎯 {level.targetScore}</span>
                      )}
                   </div>
                 </>
               )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-8 text-slate-500 text-xs text-center max-w-xs">
        <p>Cost 1 ❤ to enter a level.</p>
        <p>Win a new level to get 1 ❤ back!</p>
      </div>
    </div>
  );
};