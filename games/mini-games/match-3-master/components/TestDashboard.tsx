
import React, { useState } from 'react';
import { runGameTests } from '../game/MainScene.test';
import { TestResult } from '../utils/testRunner';
import { LEVELS } from '../levels';
import { LevelConfig, TileType } from '../types';
import { MoveFinder } from '../game/utils/MoveFinder';
import { GridUtils } from '../game/utils/GridUtils';

interface AuditIssue {
    levelId: number;
    initialMatch: boolean;
    deadlock: boolean;
    impossibleTargets: string[];
}

// Mock Tile for simulation
class MockTile {
    data: any;
    active: boolean = true;
    constructor(data: any) { this.data = data; }
    getData(key: string) { return this.data[key]; }
    setData(key: string, val: any) { this.data[key] = val; }
    // Add setScale/setAlpha/setAngle dummies if needed by Utils (usually not, purely data logic)
}

export const TestDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [auditResults, setAuditResults] = useState<AuditIssue[] | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const runTests = async () => {
    setResults(null);
    setAuditResults(null);
    const r = await runGameTests();
    setResults(r);
  };

  const auditLevels = async () => {
      setIsAuditing(true);
      setAuditResults(null);
      setResults(null);

      // Allow UI to update before heavy sync work
      setTimeout(() => {
          const issues: AuditIssue[] = [];

          LEVELS.forEach(level => {
              const issue: AuditIssue = {
                  levelId: level.id || 0,
                  initialMatch: false,
                  deadlock: false,
                  impossibleTargets: []
              };

              // 1. Build Grid
              if (!level.initialGrid || level.initialGrid.length === 0) {
                  // Random grid - cannot check static issues easily, skip grid checks
                  // But check targets against config
                  checkTargets(level, [], issue);
              } else {
                  const grid = parseGrid(level);
                  
                  // 2. Check Initial Matches
                  const matches = GridUtils.findMatches(grid, level.rows, level.cols);
                  if (matches.length > 0) {
                      issue.initialMatch = true;
                  }

                  // 3. Check Deadlock
                  // Only relevant if no matches exist (otherwise the match clears and board changes)
                  // But user wants to know if "First step user cannot operate" implies NO moves.
                  // If there is an initial match, the user technically doesn't operate yet, the game updates.
                  // But usually we want a clean start.
                  // Let's check for deadlock assuming the grid is static (i.e. if no matches).
                  if (matches.length === 0) {
                       const move = MoveFinder.findPotentialMove(grid, level.rows, level.cols);
                       if (!move) {
                           // Check if we have props that don't need swapping?
                           // Actually the requirement is "User cannot operate" (no swap).
                           // If the user has boosters, maybe, but level design shouldn't rely on pre-game boosters.
                           // Unless the level GIVES a booster (e.g. Magic item on board).
                           // MoveFinder checks swaps.
                           // Does MoveFinder handle "Clicking a Magic Prop"?
                           // MoveFinder currently only checks swapping neighbors.
                           // If there is a Magic Prop, simply clicking it might be valid (if implemented as tap).
                           // But usually Magic is swapped.
                           // Let's stick to MoveFinder result.
                           issue.deadlock = true;
                       }
                  }

                  // 4. Check Targets
                  checkTargets(level, grid, issue);
              }

              if (issue.initialMatch || issue.deadlock || issue.impossibleTargets.length > 0) {
                  issues.push(issue);
              }
          });

          setAuditResults(issues);
          setIsAuditing(false);
      }, 100);
  };

  const parseGrid = (level: LevelConfig): MockTile[][] => {
      const grid: MockTile[][] = [];
      for(let r=0; r<level.rows; r++) {
          grid[r] = [];
          for(let c=0; c<level.cols; c++) {
              // Default if undefined
              const code = (level.initialGrid && level.initialGrid[r] && level.initialGrid[r][c]) ? level.initialGrid[r][c] : '-';
              grid[r][c] = createMockTileFromCode(code, r, c, level.colors);
          }
      }
      return grid;
  };

  const createMockTileFromCode = (val: string, r: number, c: number, colors: string[]): MockTile => {
      let color = '';
      let type = TileType.NORMAL;
      let locked = false;
      let jelly: 'A' | 'B' | undefined = undefined;

      if (val.includes('L')) {
          locked = true;
          val = val.replace('L', '');
      }

      if (val === 'R') {
          color = colors[0];
          type = TileType.ROCKET_H;
      } else if (val === 'B') {
          color = colors[0];
          type = TileType.BOMB;
      } else if (val === 'M') {
          color = 'rainbow';
          type = TileType.MAGIC;
      } else if (val === 'W') {
          color = 'wood';
          type = TileType.WOOD;
      } else if (val === 'S') {
          color = 'stone';
          type = TileType.STONE;
      } else {
          if (val.includes('A')) {
              jelly = 'A';
              val = val.replace('A', '');
          } else if (val.includes('B')) {
              jelly = 'B';
              val = val.replace('B', '');
          }

          if (val.match(/^[0-9]+$/)) {
              const idx = parseInt(val, 10);
              color = colors[idx % colors.length];
          } else {
              // Random fallback for '-'
              color = colors[0]; 
          }
      }

      return new MockTile({ row: r, col: c, color, type, locked, jelly });
  };

  const checkTargets = (level: LevelConfig, grid: MockTile[][], issue: AuditIssue) => {
      if (!level.collectionTargets) return;

      const flatGrid = grid.flat();
      
      level.collectionTargets.forEach(target => {
          let possible = true;
          let currentCount = 0;
          
          if (level.colors.includes(target.type)) {
              // It's a color target. Always possible if it spawns.
              // Assuming colors in `level.colors` can spawn.
              possible = true;
          } else {
              // Special Types or Obstacles
              switch(target.type) {
                  case 'ICE':
                      // Ice is overlay, check iceCount
                      if (level.iceCount < target.count) possible = false;
                      break;
                  case 'LOCK':
                      // Count locked tiles
                      currentCount = flatGrid.filter(t => t.getData('locked')).length;
                      if (currentCount < target.count) possible = false;
                      break;
                  case 'WOOD':
                      currentCount = flatGrid.filter(t => t.getData('type') === TileType.WOOD).length;
                      if (currentCount < target.count) possible = false;
                      break;
                  case 'JELLY':
                      // Count Jelly. If 'B' (infectious) exists, count is infinite theoretically.
                      // If only 'A', count must match.
                      const jellyTiles = flatGrid.filter(t => t.getData('jelly'));
                      const hasInfectious = jellyTiles.some(t => t.getData('jelly') === 'B');
                      if (!hasInfectious && jellyTiles.length < target.count) possible = false;
                      break;
                  case 'STONE':
                       // Rarely a target, but check
                      currentCount = flatGrid.filter(t => t.getData('type') === TileType.STONE).length;
                      if (currentCount < target.count) possible = false;
                      break;
                  case 'BOMB':
                  case 'ROCKET_H':
                  case 'ROCKET_V':
                  case 'MAGIC':
                      // These can be generated by combos. Impossible only if moves are tiny or board too small.
                      // Hard to verify statically. Assume possible.
                      break;
                  default:
                      // Unknown target?
                      break;
              }
          }

          if (!possible) {
              issue.impossibleTargets.push(`${target.type} (${target.count})`);
          }
      });
  };

  const passCount = results?.filter(r => r.passed).length || 0;
  const failCount = results?.filter(r => !r.passed).length || 0;

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 p-8 overflow-y-auto text-slate-200">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">Dev Dashboard</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕ Close</button>
        </div>

        <div className="mb-6 flex gap-4 items-center flex-wrap">
            <button 
                onClick={runTests}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded transition-colors"
            >
                Run Unit Tests
            </button>

            <button 
                onClick={auditLevels}
                disabled={isAuditing}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded transition-colors disabled:opacity-50"
            >
                {isAuditing ? 'Auditing...' : 'Audit All Levels'}
            </button>
        </div>

        {/* Unit Test Results */}
        {results && (
            <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-slate-300">Unit Tests</h3>
                 <div className="text-sm mb-2">
                    <span className="text-green-400 font-bold">{passCount} Passed</span>
                    <span className="text-slate-500 mx-2">|</span>
                    <span className={failCount > 0 ? "text-red-400 font-bold" : "text-slate-400"}>{failCount} Failed</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-700 p-2 rounded">
                    {results.map((res, i) => (
                        <div key={i} className={`p-3 rounded border ${res.passed ? 'border-green-900 bg-green-900/20' : 'border-red-900 bg-red-900/20'}`}>
                            <div className="flex items-start gap-3">
                                <span className={res.passed ? 'text-green-500' : 'text-red-500'}>{res.passed ? '✔' : '✘'}</span>
                                <div>
                                    <div className="font-mono text-sm">{res.name}</div>
                                    {!res.passed && <div className="text-red-400 text-xs mt-1 font-mono">{res.error}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && <div className="text-slate-500 italic">No tests found.</div>}
                </div>
            </div>
        )}

        {/* Audit Results */}
        {auditResults && (
            <div>
                <h3 className="text-xl font-bold mb-4 text-slate-300">Level Audit Results</h3>
                {auditResults.length === 0 ? (
                    <div className="p-4 bg-green-900/20 border border-green-800 rounded text-green-400">
                        ✅ All levels passed the static audit checks.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-slate-400 uppercase text-xs">
                                    <th className="p-3 border-b border-slate-700">Level</th>
                                    <th className="p-3 border-b border-slate-700">Initial Match</th>
                                    <th className="p-3 border-b border-slate-700">Deadlock (Start)</th>
                                    <th className="p-3 border-b border-slate-700">Impossible Targets</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditResults.map((issue) => (
                                    <tr key={issue.levelId} className="border-b border-slate-700 hover:bg-slate-800/50">
                                        <td className="p-3 font-mono text-cyan-300">Lv {issue.levelId}</td>
                                        <td className="p-3">
                                            {issue.initialMatch && (
                                                <span className="inline-block px-2 py-1 rounded bg-yellow-900/50 text-yellow-500 text-xs font-bold">
                                                    ⚠ DETECTED
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {issue.deadlock && (
                                                <span className="inline-block px-2 py-1 rounded bg-red-900/50 text-red-500 text-xs font-bold">
                                                    ⛔ DEADLOCK
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-red-300">
                                            {issue.impossibleTargets.join(', ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
