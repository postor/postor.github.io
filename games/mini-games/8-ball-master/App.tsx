import React, { useState, useRef } from 'react';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import { GameMode, PlayerTurn, BallGroup, GameRule, Difficulty } from './types';
import { User, Cpu, CircleDot, Target, ArrowLeft, Trophy, Check } from 'lucide-react';

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.MENU);
  const [gameRule, setGameRule] = useState<GameRule>('8_BALL');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [menuStep, setMenuStep] = useState<'MAIN' | 'RULE' | 'DIFFICULTY'>('MAIN');

  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>(PlayerTurn.PLAYER_1);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [p1Group, setP1Group] = useState<BallGroup>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [gameOverResult, setGameOverResult] = useState<string | null>(null);
  const [isBallInHand, setIsBallInHand] = useState(false);
  
  const gameCanvasRef = useRef<GameCanvasHandle>(null);

  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameMode(GameMode.PVE); // Always PvE
    setMenuStep('MAIN'); 
    setScores({ p1: 0, p2: 0 });
    setP1Group(null);
    setGameOverResult(null);
    setIsBallInHand(false);
    setLogs([`Starting ${gameRule.replace('_', '-')} vs AI (${diff})`]);
  };

  const handleLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 3));
  };

  const handleGameOver = (result: string) => {
    setGameOverResult(result);
  };

  const p2Group = p1Group ? (p1Group === 'solids' ? 'stripes' : 'solids') : null;

  // --- Render Helpers ---

  const renderGroupIndicator = (group: BallGroup, isPlayer: boolean) => {
    if (!group) return <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase opacity-50">OPEN TABLE</span>;
    
    const isSolid = group === 'solids';
    // Visuals
    return (
      <div className="flex items-center gap-1.5 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
        <div className={`w-2 h-2 rounded-full shadow-sm ${isSolid ? 'bg-red-500' : 'bg-white border-2 border-green-600'}`}></div>
        <span className="text-[8px] font-bold tracking-widest text-white/80 uppercase">
          {isSolid ? 'SOLIDS' : 'STRIPES'}
        </span>
      </div>
    );
  };

  const renderPlayerBadge = (isPlayer: boolean, score: number, isActive: boolean, group: BallGroup) => {
      const label = isPlayer ? "YOU" : "AI";
      const Icon = isPlayer ? User : Cpu;
      const activeColor = isPlayer ? 'text-blue-400' : 'text-emerald-400';
      const baseColor = isActive ? activeColor : 'text-slate-500';

      return (
        <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60 grayscale'}`}>
            <div className={`flex items-center gap-1 mb-0.5 ${baseColor}`}>
                <Icon size={14} />
                <span className="text-[10px] font-black tracking-wider">{label}</span>
            </div>
            
            <div className="flex flex-col items-center gap-0.5">
                <div className={`text-xl font-mono font-bold leading-none ${isActive ? 'text-white text-shadow-glow' : 'text-slate-400'}`}>
                    {score}
                </div>
                {gameRule === '8_BALL' && renderGroupIndicator(group, isPlayer)}
            </div>
        </div>
      );
  }

  // --- Menu Screens ---

  const renderMainMenu = () => (
    <div className="flex flex-col gap-3 w-full max-w-xs animate-in fade-in zoom-in duration-300">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2 text-center">
        Gemini Pool
      </h1>
      <p className="text-slate-500 mb-8 text-center text-sm">Physics-based Billiards vs AI</p>
      
      <button 
        onClick={() => setMenuStep('RULE')}
        className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm"
      >
        <span className="text-lg">Start Game</span>
      </button>
    </div>
  );

  const renderRuleSelect = () => (
    <div className="flex flex-col gap-3 w-full max-w-xs animate-in fade-in slide-in-from-right-10 duration-300">
      <div className="flex items-center gap-2 mb-4 text-slate-400 cursor-pointer hover:text-white" onClick={() => setMenuStep('MAIN')}>
        <ArrowLeft size={16} /> <span>Back</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-4 text-center">Select Game Type</h2>
      
      {[
        { id: '8_BALL', label: '8-Ball Pool', desc: 'Solids vs Stripes' },
        { id: '9_BALL', label: '9-Ball Pool', desc: 'Run the rack 1-9' },
        { id: 'SNOOKER', label: 'Snooker', desc: 'Red & Colors' },
      ].map((rule) => (
        <button 
          key={rule.id}
          onClick={() => {
            setGameRule(rule.id as GameRule);
            setMenuStep('DIFFICULTY');
          }}
          className="w-full text-left px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-blue-500 group"
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold text-lg group-hover:text-blue-400 transition-colors">{rule.label}</div>
              <div className="text-xs text-slate-500">{rule.desc}</div>
            </div>
            <Target size={20} className="text-slate-600 group-hover:text-blue-400" />
          </div>
        </button>
      ))}
    </div>
  );

  const renderDifficultySelect = () => (
    <div className="flex flex-col gap-3 w-full max-w-xs animate-in fade-in slide-in-from-right-10 duration-300">
      <div className="flex items-center gap-2 mb-4 text-slate-400 cursor-pointer hover:text-white" onClick={() => setMenuStep('RULE')}>
        <ArrowLeft size={16} /> <span>Back</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2 text-center">Select Difficulty</h2>
      <p className="text-center text-slate-500 text-xs mb-6">Game: {gameRule.replace('_', '-')}</p>
      
      <div className="flex flex-col gap-3">
        {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(diff => (
          <button
            key={diff}
            onClick={() => handleStartGame(diff)}
            className={`w-full py-4 rounded-xl text-sm font-bold border transition-all flex items-center justify-between px-6 ${
              diff === 'EASY' ? 'bg-emerald-900/30 border-emerald-500/50 hover:bg-emerald-500 text-emerald-400 hover:text-white' :
              diff === 'MEDIUM' ? 'bg-yellow-900/30 border-yellow-500/50 hover:bg-yellow-500 text-yellow-400 hover:text-white' :
              'bg-red-900/30 border-red-500/50 hover:bg-red-500 text-red-400 hover:text-white'
            }`}
          >
            <span>{diff}</span>
            <Cpu size={18} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden relative flex flex-col items-center select-none">
      
      {/* Menu Mode */}
      {gameMode === GameMode.MENU && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-4">
          {menuStep === 'MAIN' && renderMainMenu()}
          {menuStep === 'RULE' && renderRuleSelect()}
          {menuStep === 'DIFFICULTY' && renderDifficultySelect()}
        </div>
      )}

      {/* Game Mode */}
      {gameMode !== GameMode.MENU && (
        <>
          {/* Back Button */}
          <button 
            onClick={() => setGameMode(GameMode.MENU)}
            className="absolute top-4 left-4 z-50 p-3 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 text-white/80 hover:bg-slate-700 hover:text-white transition-all shadow-xl group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <div className="w-full h-full flex items-center justify-center py-16 px-4"> 
            <div className="relative w-full h-full max-w-sm aspect-[9/16] shadow-2xl rounded-lg overflow-hidden border border-slate-800">
              <GameCanvas 
                ref={gameCanvasRef}
                vsAI={true} 
                gameRule={gameRule}
                difficulty={difficulty}
                onTurnChange={setCurrentTurn}
                onScoreUpdate={setScores}
                onGroupUpdate={setP1Group}
                onLog={handleLog}
                onGameOver={handleGameOver}
                onHandStateChange={setIsBallInHand}
              />
            </div>
          </div>

          {/* HUD - Compact */}
          <div className="absolute top-4 left-0 right-0 z-20 pointer-events-none flex justify-center">
             <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md rounded-full px-5 py-2 border border-white/10 shadow-xl w-[90%] max-w-[320px] pointer-events-auto">
                
                {/* Player 1 */}
                {renderPlayerBadge(true, scores.p1, currentTurn === PlayerTurn.PLAYER_1, p1Group)}

                {/* Center Status - Simplified */}
                <div className="flex flex-col items-center px-4">
                   <div className={`text-[9px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap ${currentTurn === PlayerTurn.PLAYER_1 ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                     {currentTurn === PlayerTurn.PLAYER_1 ? 'YOUR TURN' : 'AI TURN'}
                   </div>
                </div>

                {/* Player 2 (AI) */}
                {renderPlayerBadge(false, scores.p2, currentTurn !== PlayerTurn.PLAYER_1, p2Group)}

             </div>
          </div>

          {/* Controls - Compact */}
          <div className="absolute bottom-4 left-0 right-0 z-20 pointer-events-none px-4">
             <div className="max-w-[320px] mx-auto flex flex-col gap-2">
                <div className="flex flex-col items-center">
                    {logs.map((log, i) => (
                    <div key={i} className="text-[9px] font-medium text-white/80 bg-slate-800/80 px-2 py-1 rounded mb-1 backdrop-blur-md border border-white/5 shadow-sm">
                        {log}
                    </div>
                    ))}
                </div>
                
                {isBallInHand ? (
                   <button 
                      onClick={() => gameCanvasRef.current?.confirmPlacement()}
                      className="pointer-events-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-emerald-900/50 transition-all animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300"
                   >
                       <Check size={18} />
                       <span>CONFIRM POSITION</span>
                   </button>
                ) : (
                   <div className="flex justify-center items-center pointer-events-none bg-slate-900/90 backdrop-blur-md rounded-full p-2 border border-white/5 shadow-xl opacity-80">
                       <div className="text-[10px] text-slate-400 flex items-center gap-1.5 px-3 font-bold tracking-wider">
                         <CircleDot size={12} className="text-blue-400"/> 
                         <span>DRAG TO SHOOT</span>
                       </div>
                   </div>
                )}
             </div>
          </div>

          {/* Game Over Overlay */}
          {gameOverResult && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-500 p-6">
                 <Trophy size={48} className="text-yellow-400 mb-4 animate-bounce" />
                 <h2 className="text-3xl font-extrabold text-white mb-2 text-center uppercase tracking-widest text-shadow-glow">
                   Game Over
                 </h2>
                 <p className="text-emerald-400 font-mono text-lg mb-8 text-center px-4 font-bold">
                   {gameOverResult}
                 </p>
                 <div className="flex gap-4">
                    <button 
                       onClick={() => setGameMode(GameMode.MENU)}
                       className="px-6 py-3 rounded-xl bg-slate-700 text-white font-bold text-sm hover:bg-slate-600 transition-colors"
                    >
                       Main Menu
                    </button>
                    <button 
                       onClick={() => handleStartGame(difficulty)}
                       className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30"
                    >
                       Play Again
                    </button>
                 </div>
             </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;