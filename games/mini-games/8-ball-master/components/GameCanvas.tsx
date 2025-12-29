import React, { useEffect, useRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';
import { MainScene } from '../game/MainScene';
import { GameStateData, PlayerTurn, ShotDecision, BallGroup, GameRule, Difficulty } from '../types';
import { getAIShot } from '../services/geminiService';

interface GameCanvasProps {
  vsAI: boolean;
  gameRule: GameRule;
  difficulty: Difficulty;
  onTurnChange: (turn: PlayerTurn) => void;
  onScoreUpdate: (scores: { p1: number, p2: number }) => void;
  onGroupUpdate: (p1Group: BallGroup) => void;
  onLog: (msg: string) => void;
  onGameOver?: (result: string) => void;
  onHandStateChange?: (isActive: boolean) => void;
}

export interface GameCanvasHandle {
  confirmPlacement: () => void;
}

export const GameCanvas = React.forwardRef<GameCanvasHandle, GameCanvasProps>(({ vsAI, gameRule, difficulty, onTurnChange, onScoreUpdate, onGroupUpdate, onLog, onGameOver, onHandStateChange }, ref) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentEl = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MainScene | null>(null);

  useImperativeHandle(ref, () => ({
    confirmPlacement: () => {
        if (sceneRef.current) sceneRef.current.confirmPlacement();
    }
  }));

  useEffect(() => {
    if (!parentEl.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: parentEl.current,
      width: 500, // Cushion included
      height: 850, // Cushion included
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 500,
        height: 850,
      },
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0 },
          debug: false,
          runner: {
            isFixed: true, // IMPORTANT: Fixed step prevents tunneling at high speeds
            fps: 60,
            delta: 1000 / 60
          } 
        }
      },
      scene: [MainScene]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.on('ready', () => {
        const scene = game.scene.getScene('MainScene') as MainScene;
        sceneRef.current = scene;
        
        // Setup Callbacks
        scene.onTurnChange = onTurnChange;
        scene.onScoreUpdate = onScoreUpdate;
        scene.onGroupUpdate = onGroupUpdate;
        scene.onLog = onLog;
        if (onGameOver) scene.onGameOver = onGameOver;
        if (onHandStateChange) scene.onHandStateChange = onHandStateChange;
        
        // AI Handler
        scene.onRequestAI = async (state: GameStateData) => {
            onLog("AI Thinking...");
            try {
                // 1. Calculate shot (Using Service)
                const decision: ShotDecision = await getAIShot(state);
                onLog(`AI Aiming: ${decision.rationale}`);
                
                // 2. Visualize the shot (Draw lines)
                if (sceneRef.current) {
                   sceneRef.current.visualizeAiAim(decision.angle, decision.force);
                }

                // 3. Wait for user to see the visualization
                setTimeout(() => {
                    if (sceneRef.current) {
                        // 4. Execute shot (Scene handles jitter/difficulty)
                        sceneRef.current.aiShoot(decision.angle, decision.force);
                    }
                }, 1500); 
            } catch (err) {
                console.error(err);
                onLog("AI failed to think. Skipping turn.");
                if (sceneRef.current) sceneRef.current.switchTurn();
            }
        };

        // Initialize with props
        scene.scene.restart({ vsAI, gameRule, difficulty });
    });

    return () => {
      game.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Watch for prop changes if game needs to reset
  useEffect(() => {
    if (sceneRef.current && gameRef.current) {
         sceneRef.current.scene.restart({ vsAI, gameRule, difficulty });
    }
  }, [vsAI, gameRule, difficulty]);
  
  return (
    <div className="w-full h-full relative" ref={parentEl}>
       {/* Phaser injects canvas here */}
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';