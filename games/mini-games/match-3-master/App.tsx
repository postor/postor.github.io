
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import Phaser from 'phaser'; 
import { MainScene } from './game/MainScene';
import { LevelSelector } from './components/LevelSelector';
import { GameConfigEditor } from './components/GameConfigEditor'; 
import { TestDashboard } from './components/TestDashboard';
import { GameState, LevelConfig, TileType, STORAGE_KEYS } from './types';
import { LEVELS } from './levels';

// Fallback logic for Phaser if import is empty
const PhaserLib = Phaser || window.Phaser;

// Mapping for display
const TARGET_ICON_MAP: {[key: string]: string} = {
  [TileType.BOMB]: '💣',
  [TileType.ROCKET_H]: '🚀↔',
  [TileType.ROCKET_V]: '🚀↕',
  [TileType.MAGIC]: '🌈',
  'ICE': '🧊',
  'LOCK': '🔓'
};

const MAX_LIVES = 5;
const REGEN_TIME_MS = 10 * 60 * 1000; // 10 minutes

const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentLevel, setCurrentLevel] = useState<LevelConfig | null>(null);
  const [lastActiveLevelId, setLastActiveLevelId] = useState<number | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  
  // Persistence State
  const [maxReachedLevel, setMaxReachedLevel] = useState<number>(1);
  const [stars, setStars] = useState<Record<number, number>>({});
  const [highScores, setHighScores] = useState<Record<number, number>>({});
  
  // Heart System State
  const [lives, setLives] = useState<number>(MAX_LIVES);
  const [nextHeartTime, setNextHeartTime] = useState<number | null>(null);
  const [timeDisplay, setTimeDisplay] = useState<string>(''); // For countdown UI
  const [showFlyingHeart, setShowFlyingHeart] = useState(false); // UI Animation

  // Win Screen Animation State
  const [displayStars, setDisplayStars] = useState<number>(0);

  const [gameState, setGameState] = useState<Partial<GameState>>({
    score: 0,
    movesLeft: 0,
    status: 'playing',
    targetsLeft: {}
  });

  // --- Initialization & Offline Calculation ---
  useEffect(() => {
    // 1. Load Max Level
    const savedLevel = localStorage.getItem(STORAGE_KEYS.MAX_LEVEL);
    if (savedLevel) setMaxReachedLevel(parseInt(savedLevel, 10));

    // 2. Load Stars
    const savedStars = localStorage.getItem(STORAGE_KEYS.STARS);
    if (savedStars) {
        try { setStars(JSON.parse(savedStars)); } catch(e) {}
    }

    // 3. Load High Scores
    const savedScores = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
    if (savedScores) {
        try { setHighScores(JSON.parse(savedScores)); } catch(e) {}
    }

    // 4. Load Lives & Calculate Offline Regen
    const savedLives = localStorage.getItem(STORAGE_KEYS.LIVES);
    const savedNextTime = localStorage.getItem(STORAGE_KEYS.NEXT_HEART);
    
    let currentLives = savedLives ? parseInt(savedLives, 10) : MAX_LIVES;
    let nextTime = savedNextTime ? parseInt(savedNextTime, 10) : null;
    const now = Date.now();

    if (currentLives < MAX_LIVES && nextTime) {
        // Calculate how many intervals passed
        if (now >= nextTime) {
            const timePassed = now - nextTime;
            const livesRegained = 1 + Math.floor(timePassed / REGEN_TIME_MS);
            
            currentLives = Math.min(MAX_LIVES, currentLives + livesRegained);
            
            if (currentLives < MAX_LIVES) {
                // Determine when the NEXT heart is due after the ones we just added
                // Use modulo to keep the cycle accurate to the original timer
                const remainder = timePassed % REGEN_TIME_MS;
                nextTime = now + (REGEN_TIME_MS - remainder);
            } else {
                nextTime = null;
            }
        }
    } else if (currentLives >= MAX_LIVES) {
        nextTime = null;
    }

    setLives(currentLives);
    setNextHeartTime(nextTime);
  }, []);

  // --- Persistence Effects ---
  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.LIVES, lives.toString());
      if (nextHeartTime) {
          localStorage.setItem(STORAGE_KEYS.NEXT_HEART, nextHeartTime.toString());
      } else {
          localStorage.removeItem(STORAGE_KEYS.NEXT_HEART);
      }
  }, [lives, nextHeartTime]);

  // --- Heart Timer Tick ---
  useEffect(() => {
      // If full or overfull (via rewards), stop timer.
      if (!nextHeartTime && lives >= MAX_LIVES) {
          setTimeDisplay('');
          return;
      }

      const interval = setInterval(() => {
          const now = Date.now();
          
          // Only regenerate if below max
          if (lives < MAX_LIVES) {
              if (nextHeartTime && now >= nextHeartTime) {
                 setLives(prev => {
                     const newLives = prev + 1;
                     // Stop regenerating at MAX, but allow if it was already higher
                     if (newLives >= MAX_LIVES) {
                         setNextHeartTime(null);
                         return newLives;
                     }
                     // Schedule next
                     setNextHeartTime(t => (t ? t + REGEN_TIME_MS : now + REGEN_TIME_MS));
                     return newLives;
                 });
              } else if (!nextHeartTime) {
                  // Should have a timer if lives < max
                  setNextHeartTime(now + REGEN_TIME_MS);
              }
          }

          // Update Display String
          if (nextHeartTime) {
              const diff = Math.max(0, nextHeartTime - now);
              const minutes = Math.floor(diff / 60000);
              const seconds = Math.floor((diff % 60000) / 1000);
              setTimeDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
      }, 1000);

      return () => clearInterval(interval);
  }, [nextHeartTime, lives]);


  // --- Game End Logic ---
  useEffect(() => {
      setDisplayStars(0); // Reset animation

      // HANDLE WIN
      if (gameState.status === 'won' && currentLevel && currentLevel.id) {
          // Check if this is a NEW win (level wasn't passed before)
          const isFirstWin = !stars[currentLevel.id];

          // 1. Unlock Next Level
          const nextId = currentLevel.id + 1;
          if (nextId > maxReachedLevel) {
              setMaxReachedLevel(nextId);
              localStorage.setItem(STORAGE_KEYS.MAX_LEVEL, nextId.toString());
          }

          // 2. Calculate Stars
          const score = gameState.score || 0;
          const target = currentLevel.targetScore;
          let earnedStars = 1;
          if (score >= target * 2.0) earnedStars = 3;
          else if (score >= target * 1.5) earnedStars = 2;

          // 3. Sequential Star Animation
          let currentStar = 0;
          const starInterval = setInterval(() => {
              currentStar++;
              if (currentStar <= earnedStars) {
                  setDisplayStars(currentStar);
              } else {
                  clearInterval(starInterval);
              }
          }, 400); // 400ms per star

          // 4. Save Stars if better
          setStars(prev => {
              const oldStars = prev[currentLevel.id!] || 0;
              if (earnedStars > oldStars) {
                  const newStars = { ...prev, [currentLevel.id!]: earnedStars };
                  localStorage.setItem(STORAGE_KEYS.STARS, JSON.stringify(newStars));
                  return newStars;
              }
              return prev;
          });

          // 5. Save High Score
          setHighScores(prev => {
              const oldHigh = prev[currentLevel.id!] || 0;
              if (score > oldHigh) {
                  const newScores = { ...prev, [currentLevel.id!]: score };
                  localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(newScores));
                  return newScores;
              }
              return prev;
          });

          // 6. First Win Reward (Heart +1)
          if (isFirstWin) {
              // Grant heart (can exceed MAX_LIVES)
              setLives(prev => prev + 1);
              
              // Trigger Animation
              setShowFlyingHeart(true);
              setTimeout(() => setShowFlyingHeart(false), 2000);
          }
      }
      
      // Note: Loss logic removed for Heart Deduction. Hearts are now deducted on ENTRY.

  }, [gameState.status]); // Depend solely on status change

  const startGame = (config: LevelConfig) => {
    if (lives <= 0) {
        alert("Out of lives! Wait for them to regenerate.");
        return;
    }

    // COST 1 HEART TO ENTER
    setLives(prev => {
        const newLives = prev - 1;
        // If we dropped below max and had no timer, start it
        if (newLives < MAX_LIVES && !nextHeartTime) {
            setNextHeartTime(Date.now() + REGEN_TIME_MS);
        }
        return newLives;
    });

    setCurrentLevel(config);
    setGameState({
      score: 0,
      movesLeft: config.moves,
      status: 'playing',
      targetsLeft: {}
    });
    setDisplayStars(0);
    
    // Destroy previous instance
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    // Small timeout to allow render of container
    setTimeout(() => {
        if (!containerRef.current) return;
        
        const { clientWidth, clientHeight } = containerRef.current;
        
        const gameConfig: Phaser.Types.Core.GameConfig = {
          type: PhaserLib.AUTO,
          width: clientWidth,
          height: clientHeight,
          parent: containerRef.current,
          transparent: true,
          scale: {
             mode: PhaserLib.Scale.RESIZE,
             autoCenter: PhaserLib.Scale.CENTER_BOTH
          },
          scene: [MainScene],
          physics: { default: 'arcade' },
        };

        gameRef.current = new PhaserLib.Game(gameConfig);
        
        gameRef.current.events.once('ready', () => {
          const scene = gameRef.current?.scene.getScene('MainScene') as unknown as MainScene;
          if (scene) {
            scene.scene.restart({ config: config, onStateChange: setGameState });
          }
        });
    }, 50);
  };

  const handleBackToMenu = () => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setLastActiveLevelId(currentLevel?.id || null);
    setCurrentLevel(null);
  };

  const handleReplay = () => {
      // Check lives before replay (costs 1)
      if (lives <= 0) return;
      if(currentLevel) startGame(currentLevel);
  }

  const handleNextLevel = () => {
      // Check lives (costs 1)
      if (lives <= 0) return;
      if (!currentLevel || !currentLevel.id) return;
      const nextId = currentLevel.id + 1;
      const nextLevel = LEVELS.find(l => l.id === nextId);
      if (nextLevel) {
          startGame(nextLevel);
      }
  };

  // Handle Resize
  useLayoutEffect(() => {
      const handleResize = () => {
          if (gameRef.current && containerRef.current) {
              gameRef.current.scale.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Screen View: Level Selector
  if (!currentLevel) {
      return (
          <div className="min-h-screen bg-slate-950 text-white font-sans overflow-y-auto relative">
             {/* Header with Hearts */}
             <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 z-40 flex justify-between items-center shadow-md">
                 <div id="heart-container" className="flex items-center gap-2 bg-slate-800 rounded-full px-4 py-1 border border-slate-700 relative">
                     <span className="text-red-500 text-xl animate-pulse">❤</span>
                     <span className="font-bold text-lg">{lives}</span>
                     {lives < MAX_LIVES && (
                         <span className="text-xs text-slate-400 font-mono ml-1">{timeDisplay}</span>
                     )}
                 </div>
                 
                 <div className="items-center gap-2 hidden">
                    <button 
                      onClick={() => setShowBuilder(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold border border-cyan-900 bg-cyan-950/50 hover:bg-cyan-900/50 px-3 py-1 rounded transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                    >
                      ✨ AI BUILDER
                    </button>
                    <button 
                      onClick={() => setShowTests(true)}
                      className="text-xs text-slate-600 hover:text-cyan-500 font-mono border border-slate-800 hover:border-cyan-800 px-2 py-1 rounded"
                    >
                      DEV
                    </button>
                 </div>
             </div>

             {showTests && <TestDashboard onClose={() => setShowTests(false)} />}

             {showBuilder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-lg h-[85vh] relative flex flex-col">
                         <button 
                            onClick={() => setShowBuilder(false)} 
                            className="absolute -top-8 right-0 text-slate-400 hover:text-white font-bold text-sm"
                         >
                            CLOSE ✕
                         </button>
                         <GameConfigEditor onConfigChange={(cfg) => {
                             setShowBuilder(false);
                             startGame({ ...cfg, id: 999, name: "AI Custom Level" });
                         }} />
                    </div>
                </div>
             )}
             
             <LevelSelector 
                onSelectLevel={(lvl) => {
                    if (lives > 0) startGame(lvl);
                    else alert(`Next heart in ${timeDisplay}`);
                }} 
                maxReachedLevel={maxReachedLevel} 
                stars={stars}
                lastActiveLevelId={lastActiveLevelId}
             />
          </div>
      );
  }

  const renderTargets = () => {
     if (!currentLevel.collectionTargets || currentLevel.collectionTargets.length === 0) {
        return (
             <div>
                <div className="text-[10px] text-slate-400 uppercase">Target</div>
                <div className="text-xl font-bold text-emerald-400 leading-none">{currentLevel.targetScore}</div>
             </div>
        );
     }

     return (
        <div className="flex flex-col items-center">
             <div className="text-[10px] text-slate-400 uppercase">Targets</div>
             <div className="flex gap-2">
                {currentLevel.collectionTargets.map((t, i) => {
                    const icon = TARGET_ICON_MAP[t.type] || t.type;
                    const remaining = gameState.targetsLeft?.[t.type] !== undefined ? gameState.targetsLeft[t.type] : t.count;
                    const isDone = remaining <= 0;
                    return (
                        <div key={i} className={`flex items-center text-sm font-bold ${isDone ? 'text-green-500' : 'text-white'}`}>
                            <span className="mr-1">{icon}</span>
                            <span>{Math.max(0, remaining)}</span>
                        </div>
                    );
                })}
             </div>
        </div>
     );
  };
  
  const hasNextLevel = currentLevel && currentLevel.id && currentLevel.id < LEVELS.length;

  // Screen View: Game
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col text-white font-sans overflow-hidden">
      
      {/* Header / HUD */}
      <div className="flex-none bg-slate-800/90 border-b border-slate-700 p-2 z-10 shadow-md">
        <div className="max-w-md mx-auto flex flex-col md:flex-row items-center justify-between gap-y-2">
            
            {/* Top Row: Back + Name + (Mobile Lives) */}
            <div className="w-full md:w-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleBackToMenu}
                        className="text-slate-400 hover:text-white p-2"
                    >
                        ← Back
                    </button>
                    <div className="text-xs font-semibold text-slate-300">
                        {currentLevel.id === 999 ? 'AI Custom Level' : `Lv ${currentLevel.id}: ${currentLevel.name}`}
                    </div>
                </div>
                {/* Lives (Mobile Only) */}
                <div className="md:hidden flex items-center gap-1 bg-slate-900/50 px-2 py-1 rounded-full border border-slate-700 relative">
                     <span className="text-red-500 text-sm">❤</span>
                     <span className="font-bold text-sm">{lives}</span>
                </div>
            </div>
            
            {/* Middle Row: Stats */}
            <div className="flex gap-6 md:gap-8 text-center justify-center w-full md:w-auto">
                 <div>
                    <div className="text-[10px] text-slate-400 uppercase">Moves</div>
                    <div className={`text-xl font-bold leading-none ${gameState.movesLeft! < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {Math.max(0, gameState.movesLeft!)}
                    </div>
                 </div>
                 
                 {renderTargets()}

                 <div>
                    <div className="text-[10px] text-slate-400 uppercase">Score</div>
                    <div className="text-xl font-bold text-cyan-400 leading-none">{gameState.score}</div>
                 </div>
            </div>
            
            {/* Right: Lives (Desktop Only) */}
            <div className="hidden md:flex items-center gap-1 bg-slate-900/50 px-2 py-1 rounded-full border border-slate-700 relative">
                 <span className="text-red-500 text-sm">❤</span>
                 <span className="font-bold text-sm">{lives}</span>
            </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 w-full relative bg-slate-900" id="game-container-wrapper">
         <div id="game-container" ref={containerRef} className="absolute inset-0"></div>
      </div>
      
      {/* Footer */}
      <div className="flex-none bg-slate-900 p-2 text-center text-xs text-slate-500 border-t border-slate-800">
         High Score: {highScores[currentLevel.id!] || 0}
      </div>

      {/* Flying Heart Animation Overlay */}
      {showFlyingHeart && (
         <div className="animate-fly-heart text-red-500 text-6xl drop-shadow-2xl">
             ❤
         </div>
      )}

      {/* Win/Loss Modal */}
      {gameState.status !== 'playing' && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-6">
              <div className="bg-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-slate-600 text-center animate-bounce-in relative overflow-hidden">
                  
                  {/* Decorative Background Glow */}
                  <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${gameState.status === 'won' ? 'from-yellow-400 to-orange-500' : 'from-red-500 to-purple-600'}`}></div>

                  <div className="text-6xl mb-4 mt-4">
                      {gameState.status === 'won' ? '🏆' : '💔'}
                  </div>
                  
                  <h2 className={`text-3xl font-black mb-1 ${gameState.status === 'won' ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500' : 'text-slate-400'}`}>
                    {gameState.status === 'won' ? 'LEVEL CLEARED!' : 'FAILED'}
                  </h2>
                  
                  {gameState.status === 'won' && (
                      <div className="flex justify-center gap-2 mb-4 text-3xl h-10">
                          {[1,2,3].map(i => (
                              <span 
                                key={i} 
                                className={`transform transition-all duration-300 ${i <= displayStars ? "text-yellow-400 drop-shadow-lg scale-110" : "text-slate-700 scale-100"}`}
                              >
                                  ★
                              </span>
                          ))}
                      </div>
                  )}

                  <p className="text-slate-300 mb-6 font-mono">
                    {gameState.status === 'won' 
                      ? `Final Score: ${gameState.score}` 
                      : `Out of moves!`}
                  </p>
                  
                  <div className="flex flex-col gap-3">
                      {gameState.status === 'won' && hasNextLevel ? (
                          <button 
                            onClick={handleNextLevel}
                            disabled={lives <= 0}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                          >
                             <span>Next Level</span> <span>→</span>
                          </button>
                      ) : null}

                      <button 
                        onClick={handleReplay}
                        disabled={lives <= 0}
                        className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95 flex flex-col items-center"
                      >
                        <span>Replay Level</span>
                        {lives <= 0 ? (
                           <span className="text-[10px] font-normal opacity-80">{timeDisplay}</span>
                        ) : (
                           <span className="text-[10px] font-normal opacity-80">Cost 1 ❤</span>
                        )}
                      </button>
                      
                      <button 
                         onClick={handleBackToMenu}
                         className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-8 rounded-xl transition-colors"
                      >
                        Menu
                      </button>
                  </div>
              </div>
           </div>
        )}
    </div>
  );
};

export default App;
