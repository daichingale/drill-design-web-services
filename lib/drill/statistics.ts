// lib/drill/statistics.ts
// 統計・分析機能の計算ロジック

import type { UiSet } from "@/lib/drill/uiTypes";
import type { WorldPos } from "@/lib/drill/types";
import type { Member } from "@/context/MembersContext";

const STEP_M = 5 / 8; // 1ステップ = 0.625m

/**
 * 2点間の距離を計算（メートル）
 */
function calculateDistance(pos1: WorldPos, pos2: WorldPos): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 移動距離の統計を計算
 */
export function calculateMovementDistance(
  sets: UiSet[],
  members: Member[]
): {
  totalDistance: number; // 全メンバーの合計移動距離（メートル）
  averageDistance: number; // 1人あたりの平均移動距離（メートル）
  maxDistance: number; // 最大移動距離（メートル）
  minDistance: number; // 最小移動距離（メートル）
  memberDistances: Array<{ memberId: string; memberName: string; distance: number }>;
} {
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const memberDistances: Array<{ memberId: string; memberName: string; distance: number }> = [];

  members.forEach((member) => {
    let totalDistance = 0;
    let prevPos: WorldPos | null = null;

    sortedSets.forEach((set) => {
      const pos = set.positions[member.id];
      if (pos) {
        if (prevPos) {
          totalDistance += calculateDistance(prevPos, pos);
        }
        prevPos = pos;
      }
    });

    memberDistances.push({
      memberId: member.id,
      memberName: member.name,
      distance: totalDistance,
    });
  });

  const distances = memberDistances.map((d) => d.distance);
  const totalDistance = distances.reduce((sum, d) => sum + d, 0);
  const averageDistance = distances.length > 0 ? totalDistance / distances.length : 0;
  const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
  const minDistance = distances.length > 0 ? Math.min(...distances) : 0;

  return {
    totalDistance,
    averageDistance,
    maxDistance,
    minDistance,
    memberDistances: memberDistances.sort((a, b) => b.distance - a.distance),
  };
}

/**
 * 移動速度の分析（カウントあたりの移動距離）
 */
export function calculateMovementSpeed(
  sets: UiSet[],
  members: Member[],
  playbackBPM: number
): {
  averageSpeed: number; // 平均移動速度（メートル/秒）
  maxSpeed: number; // 最大移動速度（メートル/秒）
  speedBySet: Array<{
    setIndex: number;
    setCount: number;
    averageSpeed: number;
    maxSpeed: number;
  }>;
} {
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const countsPerSecond = playbackBPM / 60; // 1秒あたりのカウント数
  const speedBySet: Array<{
    setIndex: number;
    setCount: number;
    averageSpeed: number;
    maxSpeed: number;
  }> = [];

  let totalSpeed = 0;
  let maxSpeed = 0;

  for (let i = 0; i < sortedSets.length - 1; i++) {
    const currentSet = sortedSets[i];
    const nextSet = sortedSets[i + 1];
    const countDiff = nextSet.startCount - currentSet.startCount;

    if (countDiff <= 0) continue;

    const speeds: number[] = [];

    members.forEach((member) => {
      const currentPos = currentSet.positions[member.id];
      const nextPos = nextSet.positions[member.id];

      if (currentPos && nextPos) {
        const distance = calculateDistance(currentPos, nextPos);
        const timeSeconds = countDiff / countsPerSecond;
        const speed = timeSeconds > 0 ? distance / timeSeconds : 0;
        speeds.push(speed);
      }
    });

    if (speeds.length > 0) {
      const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
      const setMaxSpeed = Math.max(...speeds);
      totalSpeed += avgSpeed;
      maxSpeed = Math.max(maxSpeed, setMaxSpeed);

      speedBySet.push({
        setIndex: i,
        setCount: currentSet.startCount,
        averageSpeed: avgSpeed,
        maxSpeed: setMaxSpeed,
      });
    }
  }

  const averageSpeed = speedBySet.length > 0 ? totalSpeed / speedBySet.length : 0;

  return {
    averageSpeed,
    maxSpeed,
    speedBySet,
  };
}

/**
 * フォーメーションの複雑度スコアを計算
 * - メンバー間の距離の分散
 * - 移動の複雑さ（方向転換の多さ）
 * - フォーメーションの密度
 */
export function calculateFormationComplexity(
  sets: UiSet[],
  members: Member[]
): {
  complexityScore: number; // 0-100のスコア（高いほど複雑）
  densityScore: number; // フォーメーションの密度（メンバー間の平均距離）
  movementComplexity: number; // 移動の複雑さ（方向転換の多さ）
} {
  if (sets.length === 0 || members.length === 0) {
    return {
      complexityScore: 0,
      densityScore: 0,
      movementComplexity: 0,
    };
  }

  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  
  // 密度スコア: メンバー間の平均距離
  let totalDensity = 0;
  let densityCount = 0;

  sortedSets.forEach((set) => {
    const positions = Object.entries(set.positions);
    if (positions.length < 2) return;

    let setTotalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const distance = calculateDistance(positions[i][1], positions[j][1]);
        setTotalDistance += distance;
        pairCount++;
      }
    }

    if (pairCount > 0) {
      totalDensity += setTotalDistance / pairCount;
      densityCount++;
    }
  });

  const densityScore = densityCount > 0 ? totalDensity / densityCount : 0;

  // 移動の複雑さ: 方向転換の多さ
  let directionChanges = 0;
  let totalMovements = 0;

  for (let i = 0; i < sortedSets.length - 1; i++) {
    const currentSet = sortedSets[i];
    const nextSet = sortedSets[i + 1];

    members.forEach((member) => {
      const currentPos = currentSet.positions[member.id];
      const nextPos = nextSet.positions[member.id];

      if (currentPos && nextPos) {
        totalMovements++;
        
        // 前のセットとの方向を計算
        if (i > 0) {
          const prevSet = sortedSets[i - 1];
          const prevPos = prevSet.positions[member.id];
          
          if (prevPos) {
            const prevDx = currentPos.x - prevPos.x;
            const prevDy = currentPos.y - prevPos.y;
            const currentDx = nextPos.x - currentPos.x;
            const currentDy = nextPos.y - currentPos.y;
            
            // 内積で方向転換を検出
            const dot = prevDx * currentDx + prevDy * currentDy;
            const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
            const currentLength = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
            
            if (prevLength > 0.1 && currentLength > 0.1) {
              const cosAngle = dot / (prevLength * currentLength);
              // 角度が90度以上（cos < 0）なら方向転換
              if (cosAngle < 0) {
                directionChanges++;
              }
            }
          }
        }
      }
    });
  }

  const movementComplexity = totalMovements > 0 ? (directionChanges / totalMovements) * 100 : 0;

  // 複雑度スコア: 密度と移動の複雑さを組み合わせ
  const complexityScore = Math.min(100, (densityScore / 10) * 30 + movementComplexity * 0.7);

  return {
    complexityScore: Math.round(complexityScore),
    densityScore: Math.round(densityScore * 100) / 100,
    movementComplexity: Math.round(movementComplexity * 100) / 100,
  };
}

/**
 * 衝突リスクを計算
 * メンバー間の距離が近い（2ステップ以内）場合をリスクとして検出
 */
export function calculateCollisionRisk(
  sets: UiSet[],
  members: Member[]
): {
  riskCount: number; // リスクのある組み合わせの数
  highRiskPairs: Array<{
    member1: string;
    member2: string;
    distance: number;
    setCount: number;
  }>;
  riskBySet: Array<{
    setCount: number;
    riskCount: number;
  }>;
} {
  const sortedSets = [...sets].sort((a, b) => a.startCount - b.startCount);
  const SAFE_DISTANCE = 2 * STEP_M; // 2ステップ = 安全距離
  const highRiskPairs: Array<{
    member1: string;
    member2: string;
    distance: number;
    setCount: number;
  }> = [];
  const riskBySet: Array<{ setCount: number; riskCount: number }> = [];

  sortedSets.forEach((set) => {
    const positions = Object.entries(set.positions);
    let setRiskCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const [memberId1, pos1] = positions[i];
        const [memberId2, pos2] = positions[j];
        const distance = calculateDistance(pos1, pos2);

        if (distance < SAFE_DISTANCE) {
          setRiskCount++;
          const member1 = members.find((m) => m.id === memberId1);
          const member2 = members.find((m) => m.id === memberId2);
          
          if (member1 && member2) {
            highRiskPairs.push({
              member1: member1.name,
              member2: member2.name,
              distance,
              setCount: set.startCount,
            });
          }
        }
      }
    }

    if (setRiskCount > 0) {
      riskBySet.push({
        setCount: set.startCount,
        riskCount: setRiskCount,
      });
    }
  });

  return {
    riskCount: highRiskPairs.length,
    highRiskPairs: highRiskPairs.sort((a, b) => a.distance - b.distance),
    riskBySet,
  };
}

