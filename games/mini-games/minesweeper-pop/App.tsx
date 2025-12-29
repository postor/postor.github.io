import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameScene from './components/GameScene';
import { DifficultyLevel } from './types';

function App() {
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel | null>(null);

  return (
    <div className="h-full w-full">
      {currentDifficulty ? (
        <GameScene 
          difficulty={currentDifficulty} 
          onBack={() => setCurrentDifficulty(null)} 
        />
      ) : (
        <MainMenu onStart={setCurrentDifficulty} />
      )}
    </div>
  );
}

export default App;