// lib/drill/visualImpact.ts
// 視覚的インパクト分析

import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import type { WorldPos } from "@/lib/drill/types";
import { calculateDistance } from "./math";

const STEP_M = 5 / 8; // 1ステップ = 0.625m

/**
 * 対称性スコアを計算（0-100）
 * - X軸対称性
 * - Y軸対称性
 * - 中心対称性
 */
export function calculateSymmetryScore(
  sets: UiSet[],
  members: Member[],
  fieldWidth: number,
  fieldHeight: number
): {
  xAxisSymmetry: number; // X軸対称性（0-100）
  yAxisSymmetry: number; // Y軸対称性（0-100）
  centerSymmetry: number; // 中心対称性（0-100）
  overallSymmetry: number; // 総合対称性スコア（0-100）
} {
  if (sets.length === 0 || members.length === 0) {
    return {
      xAxisSymmetry: 0,
      yAxisSymmetry: 0,
      centerSymmetry: 0,
      overallSymmetry: 0,
    };
  }

  const centerX = fieldWidth / 2;
  const centerY = fieldHeight / 2;
  let totalXSymmetry = 0;
  let totalYSymmetry = 0;
  let totalCenterSymmetry = 0;
  let setCount = 0;

  sets.forEach((set) => {
    const positions = Object.entries(set.positions);
    if (positions.length === 0) return;

    // X軸対称性（Y軸を中心に左右対称）
    let xSymmetrySum = 0;
    let xSymmetryCount = 0;

    // Y軸対称性（X軸を中心に上下対称）
    let ySymmetrySum = 0;
    let ySymmetryCount = 0;

    // 中心対称性（中心点を中心に180度回転）
    let centerSymmetrySum = 0;
    let centerSymmetryCount = 0;

    positions.forEach(([memberId, pos]) => {
      // X軸対称性: (x, y) と (2*centerX - x, y) の距離
      const xMirrorPos: WorldPos = {
        x: 2 * centerX - pos.x,
        y: pos.y,
      };
      const xMirrorDistance = calculateDistance(pos, xMirrorPos);
      xSymmetrySum += xMirrorDistance;
      xSymmetryCount++;

      // Y軸対称性: (x, y) と (x, 2*centerY - y) の距離
      const yMirrorPos: WorldPos = {
        x: pos.x,
        y: 2 * centerY - pos.y,
      };
      const yMirrorDistance = calculateDistance(pos, yMirrorPos);
      ySymmetrySum += yMirrorDistance;
      ySymmetryCount++;

      // 中心対称性: (x, y) と (2*centerX - x, 2*centerY - y) の距離
      const centerMirrorPos: WorldPos = {
        x: 2 * centerX - pos.x,
        y: 2 * centerY - pos.y,
      };
      const centerMirrorDistance = calculateDistance(pos, centerMirrorPos);
      centerSymmetrySum += centerMirrorDistance;
      centerSymmetryCount++;
    });

    if (xSymmetryCount > 0) {
      // 距離が小さいほど対称性が高い（最大距離で正規化）
      const maxDistance = Math.max(fieldWidth, fieldHeight);
      const xSymmetryScore = Math.max(0, 100 - (xSymmetrySum / xSymmetryCount / maxDistance) * 100);
      totalXSymmetry += xSymmetryScore;
    }

    if (ySymmetryCount > 0) {
      const maxDistance = Math.max(fieldWidth, fieldHeight);
      const ySymmetryScore = Math.max(0, 100 - (ySymmetrySum / ySymmetryCount / maxDistance) * 100);
      totalYSymmetry += ySymmetryScore;
    }

    if (centerSymmetryCount > 0) {
      const maxDistance = Math.max(fieldWidth, fieldHeight);
      const centerSymmetryScore = Math.max(0, 100 - (centerSymmetrySum / centerSymmetryCount / maxDistance) * 100);
      totalCenterSymmetry += centerSymmetryScore;
    }

    setCount++;
  });

  const xAxisSymmetry = setCount > 0 ? totalXSymmetry / setCount : 0;
  const yAxisSymmetry = setCount > 0 ? totalYSymmetry / setCount : 0;
  const centerSymmetry = setCount > 0 ? totalCenterSymmetry / setCount : 0;
  const overallSymmetry = (xAxisSymmetry + yAxisSymmetry + centerSymmetry) / 3;

  return {
    xAxisSymmetry: Math.round(xAxisSymmetry * 100) / 100,
    yAxisSymmetry: Math.round(yAxisSymmetry * 100) / 100,
    centerSymmetry: Math.round(centerSymmetry * 100) / 100,
    overallSymmetry: Math.round(overallSymmetry * 100) / 100,
  };
}

/**
 * バランススコアを計算（0-100）
 * - メンバーの分布の均一性
 * - 重心の位置
 */
export function calculateBalanceScore(
  sets: UiSet[],
  members: Member[],
  fieldWidth: number,
  fieldHeight: number
): {
  distributionBalance: number; // 分布の均一性（0-100）
  centerBalance: number; // 重心の位置バランス（0-100）
  overallBalance: number; // 総合バランススコア（0-100）
} {
  if (sets.length === 0 || members.length === 0) {
    return {
      distributionBalance: 0,
      centerBalance: 0,
      overallBalance: 0,
    };
  }

  const centerX = fieldWidth / 2;
  const centerY = fieldHeight / 2;
  let totalDistributionBalance = 0;
  let totalCenterBalance = 0;
  let setCount = 0;

  sets.forEach((set) => {
    const positions = Object.entries(set.positions);
    if (positions.length === 0) return;

    // 重心を計算
    let sumX = 0;
    let sumY = 0;
    positions.forEach(([, pos]) => {
      sumX += pos.x;
      sumY += pos.y;
    });
    const centerOfMass: WorldPos = {
      x: sumX / positions.length,
      y: sumY / positions.length,
    };

    // 重心の位置バランス（中心からの距離が小さいほど高い）
    const centerDistance = calculateDistance(centerOfMass, { x: centerX, y: centerY });
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const centerBalance = Math.max(0, 100 - (centerDistance / maxDistance) * 100);
    totalCenterBalance += centerBalance;

    // 分布の均一性（各象限のメンバー数の分散が小さいほど高い）
    const quadrants = [0, 0, 0, 0]; // 左上、右上、左下、右下
    positions.forEach(([, pos]) => {
      const quadrantX = pos.x >= centerX ? 1 : 0;
      const quadrantY = pos.y >= centerY ? 1 : 0;
      const quadrant = quadrantY * 2 + quadrantX;
      quadrants[quadrant]++;
    });

    // 分散を計算
    const avg = positions.length / 4;
    const variance = quadrants.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / 4;
    const maxVariance = Math.pow(positions.length, 2) / 4;
    const distributionBalance = Math.max(0, 100 - (variance / maxVariance) * 100);
    totalDistributionBalance += distributionBalance;

    setCount++;
  });

  return {
    distributionBalance: setCount > 0 ? Math.round((totalDistributionBalance / setCount) * 100) / 100 : 0,
    centerBalance: setCount > 0 ? Math.round((totalCenterBalance / setCount) * 100) / 100 : 0,
    overallBalance: setCount > 0
      ? Math.round(((totalDistributionBalance + totalCenterBalance) / 2 / setCount) * 100) / 100
      : 0,
  };
}

/**
 * 観客からの見えやすさスコアを計算（0-100）
 * - メンバー間の重なり度
 * - フォーメーションの広がり
 * - 視覚的な密度
 */
export function calculateVisibilityScore(
  sets: UiSet[],
  members: Member[],
  fieldWidth: number,
  fieldHeight: number
): {
  overlapScore: number; // 重なり度（0-100、高いほど重なりが少ない）
  spreadScore: number; // 広がりスコア（0-100、高いほど広がっている）
  densityScore: number; // 密度スコア（0-100、適度な密度が高い）
  overallVisibility: number; // 総合見えやすさスコア（0-100）
} {
  if (sets.length === 0 || members.length === 0) {
    return {
      overlapScore: 0,
      spreadScore: 0,
      densityScore: 0,
      overallVisibility: 0,
    };
  }

  let totalOverlapScore = 0;
  let totalSpreadScore = 0;
  let totalDensityScore = 0;
  let setCount = 0;

  sets.forEach((set) => {
    const positions = Object.entries(set.positions);
    if (positions.length < 2) return;

    // 重なり度: メンバー間の距離が近すぎるペアの数
    const MIN_DISTANCE = 1 * STEP_M; // 1ステップ以内は重なりとみなす
    let overlapCount = 0;
    let pairCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const distance = calculateDistance(positions[i][1], positions[j][1]);
        pairCount++;
        if (distance < MIN_DISTANCE) {
          overlapCount++;
        }
      }
    }

    const overlapRatio = pairCount > 0 ? overlapCount / pairCount : 0;
    const overlapScore = Math.max(0, 100 - overlapRatio * 100);
    totalOverlapScore += overlapScore;

    // 広がりスコア: フォーメーションの範囲
    const xs = positions.map(([, pos]) => pos.x);
    const ys = positions.map(([, pos]) => pos.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;
    const fieldArea = fieldWidth * fieldHeight;
    const spreadRatio = area / fieldArea;
    const spreadScore = Math.min(100, spreadRatio * 200); // フィールドの50%以上で100点
    totalSpreadScore += spreadScore;

    // 密度スコア: 適度な密度（メンバー間の平均距離）
    let totalDistance = 0;
    let distanceCount = 0;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        totalDistance += calculateDistance(positions[i][1], positions[j][1]);
        distanceCount++;
      }
    }
    const avgDistance = distanceCount > 0 ? totalDistance / distanceCount : 0;
    // 理想的な距離は3-5ステップ（1.875-3.125m）
    const idealDistance = 4 * STEP_M;
    const distanceDiff = Math.abs(avgDistance - idealDistance);
    const densityScore = Math.max(0, 100 - (distanceDiff / idealDistance) * 100);
    totalDensityScore += densityScore;

    setCount++;
  });

  return {
    overlapScore: setCount > 0 ? Math.round((totalOverlapScore / setCount) * 100) / 100 : 0,
    spreadScore: setCount > 0 ? Math.round((totalSpreadScore / setCount) * 100) / 100 : 0,
    densityScore: setCount > 0 ? Math.round((totalDensityScore / setCount) * 100) / 100 : 0,
    overallVisibility: setCount > 0
      ? Math.round(((totalOverlapScore + totalSpreadScore + totalDensityScore) / 3 / setCount) * 100) / 100
      : 0,
  };
}

/**
 * 総合視覚的インパクトスコアを計算
 */
export function calculateVisualImpactScore(
  sets: UiSet[],
  members: Member[],
  fieldWidth: number,
  fieldHeight: number
): {
  symmetry: ReturnType<typeof calculateSymmetryScore>;
  balance: ReturnType<typeof calculateBalanceScore>;
  visibility: ReturnType<typeof calculateVisibilityScore>;
  overallScore: number; // 総合スコア（0-100）
} {
  const symmetry = calculateSymmetryScore(sets, members, fieldWidth, fieldHeight);
  const balance = calculateBalanceScore(sets, members, fieldWidth, fieldHeight);
  const visibility = calculateVisibilityScore(sets, members, fieldWidth, fieldHeight);

  const overallScore = (symmetry.overallSymmetry * 0.3 + balance.overallBalance * 0.3 + visibility.overallVisibility * 0.4);

  return {
    symmetry,
    balance,
    visibility,
    overallScore: Math.round(overallScore * 100) / 100,
  };
}

