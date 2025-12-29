import { GameStateData, ShotDecision, BallPosition } from "../types";

// Constants matching MainScene
const BALL_RADIUS = 9; // Shrink to match MainScene
const HOLE_RADIUS = 15; 

export const getAIShot = async (gameState: GameStateData): Promise<ShotDecision> => {
  return calculateGeometricShot(gameState);
};

const calculateGeometricShot = (gameState: GameStateData): ShotDecision => {
  const { cueBall, targetBalls, holes } = gameState;
  
  let bestShot: ShotDecision | null = null;
  let maxScore = -Infinity;

  if (targetBalls.length === 0) return getFallbackShot();

  // In Snooker, we ideally want to pot Reds first, then Colors.
  // MainScene should filter `targetBalls` to only pass valid targets (e.g. only Reds if Reds exist).
  // Here, the AI simply tries to pot whatever is given to it with the best probability.

  for (const target of targetBalls) {
    for (const hole of holes) {
      // 1. Calculate Ghost Ball
      const toHoleX = hole.x - target.x;
      const toHoleY = hole.y - target.y;
      const distToHole = Math.sqrt(toHoleX * toHoleX + toHoleY * toHoleY);
      
      const aimDirX = toHoleX / distToHole;
      const aimDirY = toHoleY / distToHole;

      const impactDist = BALL_RADIUS * 2; 
      const ghostX = target.x - (aimDirX * impactDist);
      const ghostY = target.y - (aimDirY * impactDist);

      // 2. Vector from Cue to Ghost
      const shotX = ghostX - cueBall.x;
      const shotY = ghostY - cueBall.y;
      const shotDist = Math.sqrt(shotX * shotX + shotY * shotY);
      
      const shotDirX = shotX / shotDist;
      const shotDirY = shotY / shotDist;

      // 3. Angle
      const angle = Math.atan2(shotY, shotX);

      // 4. Validity Checks
      const cutDot = shotDirX * aimDirX + shotDirY * aimDirY;
      
      // Snooker pockets are tighter, require straighter shots
      if (cutDot < 0.2) continue;

      if (isPathBlocked(cueBall, {x: ghostX, y: ghostY}, targetBalls, target.id)) continue;
      if (isPathBlocked(target, hole, targetBalls, target.id)) continue;

      // 5. Scoring Heuristic
      const distancePenalty = (shotDist + distToHole) * 0.5; 
      const angleBonus = cutDot * 1200; 
      
      // Simple logic: prefer easier shots
      const score = angleBonus - distancePenalty;

      if (score > maxScore) {
        maxScore = score;
        const totalDist = shotDist + distToHole;
        // Snooker requires finesse
        const requiredForce = Math.min(Math.max(totalDist / 900, 0.35), 0.85);

        bestShot = {
          angle: angle,
          force: requiredForce,
          rationale: `Potting ball ${target.id} (Color: ${target.color})`,
          targetBallId: target.id
        };
      }
    }
  }

  return bestShot || getFallbackShot();
};

const isPathBlocked = (start: {x:number, y:number}, end: {x:number, y:number}, obstacles: BallPosition[], ignoreId: number): boolean => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lenSq = dx*dx + dy*dy;
  const len = Math.sqrt(lenSq);
  
  const nx = dx / len;
  const ny = dy / len;

  for (const obs of obstacles) {
    if (obs.id === ignoreId) continue;
    if (Math.abs(obs.x - start.x) < 0.1 && Math.abs(obs.y - start.y) < 0.1) continue; 

    const wx = obs.x - start.x;
    const wy = obs.y - start.y;
    
    const proj = wx * nx + wy * ny;
    
    let closestX, closestY;
    if (proj <= 0) {
      closestX = start.x;
      closestY = start.y;
    } else if (proj >= len) {
      closestX = end.x;
      closestY = end.y;
    } else {
      closestX = start.x + nx * proj;
      closestY = start.y + ny * proj;
    }
    
    const distSq = (obs.x - closestX)**2 + (obs.y - closestY)**2;
    if (distSq < (BALL_RADIUS * 2.1) ** 2) {
      return true;
    }
  }
  return false;
}

const getFallbackShot = (): ShotDecision => {
  return {
    angle: Math.random() * Math.PI * 2,
    force: 0.4,
    rationale: "Safety shot / No clear pot.",
  };
};