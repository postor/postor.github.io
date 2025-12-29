import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { Difficulty, GameStats } from '../types';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

interface PhaserGameProps {
  difficulty: Difficulty;
  onStatsUpdate: (stats: GameStats) => void;
  onGameOver: (winner: 'Player' | 'AI') => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ difficulty, onStatsUpdate, onGameOver }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#87CEEB',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        activePointers: 3, // Enable multi-touch support (Mouse + 2 fingers)
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 }, // We apply gravity manually to arrow only
          debug: false,
        },
      },
      scene: [MainScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Start scene with data
    game.events.once('ready', () => {
        game.scene.start('MainScene', { 
            difficulty,
            onStatsUpdate,
            onGameOver
        });
    });

    return () => {
      game.destroy(true);
    };
  }, [difficulty]); // Restart game if difficulty changes

  return (
    <div 
        ref={containerRef} 
        className="rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800 mx-auto touch-none"
        style={{ 
            width: '100%',
            maxWidth: `${GAME_WIDTH}px`,
            aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
            maxHeight: '80vh' 
        }}
    />
  );
};