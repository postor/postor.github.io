import React, { useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { GameHUD } from './components/GameHUD';
import { Difficulty, GameStats, GameState } from './types';
import { Target, Trophy, Wind, Activity, RotateCcw, Smartphone } from 'lucide-react';

const InitialStats: GameStats = {
  playerHp: 100,
  aiHp: 100,
  currentWind: 0,
  isPlayerTurn: true,
  winner: null,
};

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.BEGINNER);
  const [gameStats, setGameStats] = useState<GameStats>(InitialStats);
  const [lastWinner, setLastWinner] = useState<'Player' | 'AI' | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  // Handle Orientation Check
  useEffect(() => {
    const checkOrientation = () => {
      // Simple check: is width less than height?
      const inPortrait = window.innerHeight > window.innerWidth;
      setIsPortrait(inPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState(GameState.PLAYING);
    setGameStats(InitialStats);
  };

  const handleGameOver = (winner: 'Player' | 'AI') => {
    setLastWinner(winner);
    setGameState(GameState.GAME_OVER);
  };

  const returnToMenu = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="min-h-screen bg-neutral-900 overflow-hidden relative touch-none">
      
      {/* Portrait Warning Overlay */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
           <Smartphone className="w-16 h-16 text-cyan-400 mb-4 animate-pulse" />
           <RotateCcw className="w-8 h-8 text-white mb-6 animate-spin-slow" />
           <h2 className="text-2xl text-white font-serif font-bold mb-2">Please Rotate Device</h2>
           <p className="text-gray-400">This game requires landscape mode for the best archery experience.</p>
        </div>
      )}

      {/* Main Content */}
      <div className={`w-full h-screen flex items-center justify-center p-2 md:p-4 bg-[url('https://images.unsplash.com/photo-1514922116294-097c27303c73?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay`}>
        
        {/* MENU SCREEN */}
        {gameState === GameState.MENU && (
          <div className="max-w-4xl w-full max-h-full overflow-y-auto bg-black/80 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl text-center flex flex-col items-center justify-center">
            <div className="flex justify-center mb-4 md:mb-6 shrink-0">
              <Target className="w-12 h-12 md:w-16 md:h-16 text-cyan-400" />
            </div>
            <h1 className="text-4xl md:text-6xl text-white font-bold mb-3 md:mb-4 font-serif tracking-tight shrink-0">
              ZEN ARCHERY
            </h1>
            <p className="text-gray-300 text-base md:text-lg mb-8 md:mb-12 max-w-lg mx-auto shrink-0">
              Master the art of the bow. Account for wind, control your breathing, and defeat your opponent.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full shrink-0 pb-4">
              {/* Beginner */}
              <button 
                onClick={() => startGame(Difficulty.BEGINNER)}
                className="group relative p-4 md:p-6 rounded-xl bg-gradient-to-b from-green-900/50 to-green-950/80 border border-green-500/30 hover:border-green-400 transition-all hover:scale-105"
              >
                  <div className="absolute top-2 right-2 md:top-4 md:right-4 text-green-400"><Trophy className="w-4 h-4 md:w-5 md:h-5"/></div>
                  <h3 className="text-xl md:text-2xl text-white font-bold mb-2">Novice</h3>
                  <div className="text-xs md:text-sm text-gray-400 space-y-1 md:space-y-2">
                      <div className="flex items-center gap-2 justify-center"><Wind className="w-3 h-3 md:w-4 md:h-4" /> No Wind</div>
                      <div className="flex items-center gap-2 justify-center"><Activity className="w-3 h-3 md:w-4 md:h-4" /> Steady Aim</div>
                  </div>
              </button>

              {/* Intermediate */}
              <button 
                onClick={() => startGame(Difficulty.INTERMEDIATE)}
                className="group relative p-4 md:p-6 rounded-xl bg-gradient-to-b from-blue-900/50 to-blue-950/80 border border-blue-500/30 hover:border-blue-400 transition-all hover:scale-105"
              >
                  <div className="absolute top-2 right-2 md:top-4 md:right-4 text-blue-400 opacity-50 group-hover:opacity-100 flex"><Trophy className="w-4 h-4 md:w-5 md:h-5"/><Trophy className="w-4 h-4 md:w-5 md:h-5 -ml-2 -mt-2"/></div>
                  <h3 className="text-xl md:text-2xl text-white font-bold mb-2">Archer</h3>
                  <div className="text-xs md:text-sm text-gray-400 space-y-1 md:space-y-2">
                      <div className="flex items-center gap-2 justify-center"><Wind className="w-3 h-3 md:w-4 md:h-4" /> Variable Wind</div>
                      <div className="flex items-center gap-2 justify-center"><Activity className="w-3 h-3 md:w-4 md:h-4" /> Normal Sway</div>
                  </div>
              </button>

              {/* Advanced */}
              <button 
                onClick={() => startGame(Difficulty.ADVANCED)}
                className="group relative p-4 md:p-6 rounded-xl bg-gradient-to-b from-red-900/50 to-red-950/80 border border-red-500/30 hover:border-red-400 transition-all hover:scale-105"
              >
                  <div className="absolute top-2 right-2 md:top-4 md:right-4 text-red-400 opacity-50 group-hover:opacity-100 flex"><Trophy className="w-4 h-4 md:w-5 md:h-5"/><Trophy className="w-4 h-4 md:w-5 md:h-5"/><Trophy className="w-4 h-4 md:w-5 md:h-5"/></div>
                  <h3 className="text-xl md:text-2xl text-white font-bold mb-2">Master</h3>
                  <div className="text-xs md:text-sm text-gray-400 space-y-1 md:space-y-2">
                      <div className="flex items-center gap-2 justify-center"><Wind className="w-3 h-3 md:w-4 md:h-4 text-red-400" /> Strong Gales</div>
                      <div className="flex items-center gap-2 justify-center"><Activity className="w-3 h-3 md:w-4 md:h-4 text-red-400" /> Heavy Sway</div>
                  </div>
              </button>
            </div>
          </div>
        )}

        {/* GAME SCREEN */}
        {gameState === GameState.PLAYING && (
          <div className="relative w-full h-full flex items-center justify-center max-w-[1024px] max-h-[800px]">
            <PhaserGame 
              difficulty={difficulty}
              onStatsUpdate={setGameStats}
              onGameOver={handleGameOver}
            />
            <GameHUD 
              stats={gameStats}
              difficulty={difficulty}
              onLeave={returnToMenu}
            />
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === GameState.GAME_OVER && (
          <div className="max-w-md w-full bg-black/90 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
             <h2 className="text-4xl text-white font-serif mb-6">
               {lastWinner === 'Player' ? (
                  <span className="text-yellow-400 drop-shadow-glow">VICTORY</span>
               ) : (
                  <span className="text-red-500">DEFEAT</span>
               )}
             </h2>
             <p className="text-gray-300 mb-8">
               {lastWinner === 'Player' 
                  ? "Your aim was true. The winds were in your favor." 
                  : "The opponent was superior this time. Practice your breathing."}
             </p>
             <button 
               onClick={returnToMenu}
               className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition"
             >
               Return to Menu
             </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;