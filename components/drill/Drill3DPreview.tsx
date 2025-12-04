// components/drill/Drill3DPreview.tsx
"use client";

import React, { forwardRef, useImperativeHandle, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useSettings } from "@/context/SettingsContext";
import type { Member as DrillMember, WorldPos } from "../../lib/drill/types";
import { STEP_M } from "@/lib/drill/utils";
import * as THREE from "three";

type Props = {
  members: DrillMember[];
  positions: Record<string, WorldPos>;
};

export type Drill3DPreviewRef = {
  captureFrame: () => Promise<Blob | null>;
};

// 視点の定義（外部からアクセス可能にするため、コンポーネント外に定義）
const CAMERA_VIEWS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  top: { position: [0, 50, 0], target: [0, 0, 0] },
  front: { position: [0, 10, 30], target: [0, 0, 0] },
  back: { position: [0, 10, -30], target: [0, 0, 0] },
  left: { position: [-30, 10, 0], target: [0, 0, 0] },
  right: { position: [30, 10, 0], target: [0, 0, 0] },
  diagonal: { position: [25, 25, 25], target: [0, 0, 0] },
};

// カメラコントロールコンポーネント（Canvas内でカメラを制御）
function CameraController({ 
  controlsRef, 
  view,
  manualPosition
}: { 
  controlsRef: React.RefObject<any>;
  view: string;
  manualPosition: [number, number, number] | null;
}) {
  const { camera } = useThree();
  const controls = controlsRef.current;

  useEffect(() => {
    if (!controls) return;
    
    // 手動位置が設定されている場合はそれを使用
    if (manualPosition) {
      camera.position.set(...manualPosition);
      controls.target.set(0, 0, 0);
      controls.update();
      return;
    }
    
    // それ以外は視点設定を使用
    if (!view) return;
    
    const viewConfig = CAMERA_VIEWS[view];
    if (!viewConfig) return;

    // カメラの位置を設定
    camera.position.set(...viewConfig.position);
    
    // ターゲットを設定
    controls.target.set(...viewConfig.target);
    controls.update();
  }, [view, manualPosition, controls, camera]);

  return null;
}

// グリッド線コンポーネント
function FieldGrid({ width: fieldWidth, height: fieldHeight, boldLines }: { width: number; height: number; boldLines: any[] }) {
  const gridInterval = 1; // 1ステップごと
  const stepSize = STEP_M; // 1ステップ = 0.625m
  const halfWidth = fieldWidth / 2;
  const halfHeight = fieldHeight / 2;
  
  // 通常のグリッド線（細い線）
  const thinLines = useMemo(() => {
    const points: number[] = [];
    
    // 縦線（X軸方向）
    const numVerticalLines = Math.floor(fieldWidth / (gridInterval * stepSize)) + 1;
    for (let i = 0; i <= numVerticalLines; i++) {
      const x = -halfWidth + i * gridInterval * stepSize;
      const stepIndex = Math.round(i);
      const isBold = stepIndex % 8 === 0;
      const isCenter = Math.abs(x) < stepSize / 2; // 中央線はスキップ
      
      if (!isCenter && !isBold) {
        points.push(x, 0.01, -halfHeight, x, 0.01, halfHeight);
      }
    }
    
    // 横線（Z軸方向）
    const numHorizontalLines = Math.floor(fieldHeight / (gridInterval * stepSize)) + 1;
    for (let i = 0; i <= numHorizontalLines; i++) {
      const z = -halfHeight + i * gridInterval * stepSize;
      const stepIndex = Math.round(i);
      const isBold = stepIndex % 8 === 0;
      const isCenter = Math.abs(z) < stepSize / 2; // 中央線はスキップ
      
      if (!isCenter && !isBold) {
        points.push(-halfWidth, 0.01, z, halfWidth, 0.01, z);
      }
    }
    
    return new Float32Array(points);
  }, [fieldWidth, fieldHeight, gridInterval, stepSize, halfWidth, halfHeight]);
  
  // 太いグリッド線（8ステップごと）
  const thickLines = useMemo(() => {
    const points: number[] = [];
    
    // 縦線（X軸方向）
    const numVerticalLines = Math.floor(fieldWidth / (gridInterval * stepSize)) + 1;
    for (let i = 0; i <= numVerticalLines; i++) {
      const x = -halfWidth + i * gridInterval * stepSize;
      // ステップインデックスを計算（中央からの距離をステップ数に変換）
      const stepIndex = Math.round((x + halfWidth) / stepSize);
      const isBold = stepIndex % 8 === 0;
      const isCenter = Math.abs(x) < stepSize / 2; // 中央線はスキップ
      
      if (!isCenter && isBold) {
        // 太い線を複数回描画して太く見せる（WebGLのlinewidth制限対策）
        points.push(x, 0.016, -halfHeight, x, 0.016, halfHeight);
        points.push(x - 0.015, 0.016, -halfHeight, x - 0.015, 0.016, halfHeight);
        points.push(x + 0.015, 0.016, -halfHeight, x + 0.015, 0.016, halfHeight);
      }
    }
    
    // 横線（Z軸方向）
    const numHorizontalLines = Math.floor(fieldHeight / (gridInterval * stepSize)) + 1;
    for (let i = 0; i <= numHorizontalLines; i++) {
      const z = -halfHeight + i * gridInterval * stepSize;
      // ステップインデックスを計算（中央からの距離をステップ数に変換）
      const stepIndex = Math.round((z + halfHeight) / stepSize);
      const isBold = stepIndex % 8 === 0;
      const isCenter = Math.abs(z) < stepSize / 2; // 中央線はスキップ
      
      if (!isCenter && isBold) {
        // 太い線を複数回描画して太く見せる（WebGLのlinewidth制限対策）
        points.push(-halfWidth, 0.016, z, halfWidth, 0.016, z);
        points.push(-halfWidth, 0.016, z - 0.015, halfWidth, 0.016, z - 0.015);
        points.push(-halfWidth, 0.016, z + 0.015, halfWidth, 0.016, z + 0.015);
      }
    }
    
    return new Float32Array(points);
  }, [fieldWidth, fieldHeight, gridInterval, stepSize, halfWidth, halfHeight]);
  
  // 中央線（特に太く強調）
  const centerLines = useMemo(() => {
    const points: number[] = [];
    // 中央の縦線（X軸 = 0）
    points.push(0, 0.02, -halfHeight, 0, 0.02, halfHeight);
    // 中央の横線（Z軸 = 0）
    points.push(-halfWidth, 0.02, 0, halfWidth, 0.02, 0);
    return new Float32Array(points);
  }, [fieldWidth, fieldHeight, halfWidth, halfHeight]);
  
  // カスタム太線（boldLines）- センターラインと同じ太さ
  const customBoldLines = useMemo(() => {
    if (!boldLines || boldLines.length === 0) return new Float32Array([]);
    
    const points: number[] = [];
    // センターラインと同じ太さにするため、複数回描画（5本重ね）
    const centerLineOffset = 0.02; // センターラインと同じオフセット
    
    boldLines.forEach((line) => {
      if (line.type === "horizontal") {
        const y = line.position * stepSize;
        const startX = -(line.length * stepSize) / 2;
        const endX = (line.length * stepSize) / 2;
        // センターラインと同じ太さで描画（5本重ね）
        for (let o = -centerLineOffset; o <= centerLineOffset; o += centerLineOffset / 2) {
          points.push(startX, 0.02, y + o, endX, 0.02, y + o);
        }
      } else if (line.type === "vertical") {
        const x = line.position * stepSize;
        const startY = -(line.length * stepSize) / 2;
        const endY = (line.length * stepSize) / 2;
        // センターラインと同じ太さで描画（5本重ね）
        for (let o = -centerLineOffset; o <= centerLineOffset; o += centerLineOffset / 2) {
          points.push(x + o, 0.02, startY, x + o, 0.02, endY);
        }
      } else if (line.type === "diagonal") {
        const startX = line.start.x * stepSize;
        const startY = line.start.y * stepSize;
        const endX = line.end.x * stepSize;
        const endY = line.end.y * stepSize;
        const dx = endX - startX;
        const dy = endY - startY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / len;
        const perpY = dx / len;
        // センターラインと同じ太さで描画（5本重ね）
        for (let o = -centerLineOffset; o <= centerLineOffset; o += centerLineOffset / 2) {
          points.push(
            startX + perpX * o, 0.02, startY + perpY * o,
            endX + perpX * o, 0.02, endY + perpY * o
          );
        }
      } else if (line.type === "arc") {
        // アークは複数の線分で近似
        const startX = line.start.x * stepSize;
        const startY = line.start.y * stepSize;
        const endX = line.end.x * stepSize;
        const endY = line.end.y * stepSize;
        const controlX = line.control.x * stepSize;
        const controlY = line.control.y * stepSize;
        
        // ベジェ曲線を線分で近似（30分割で滑らかに）
        for (let i = 0; i < 30; i++) {
          const t1 = i / 30;
          const t2 = (i + 1) / 30;
          const x1 = (1 - t1) * (1 - t1) * startX + 2 * (1 - t1) * t1 * controlX + t1 * t1 * endX;
          const y1 = (1 - t1) * (1 - t1) * startY + 2 * (1 - t1) * t1 * controlY + t1 * t1 * endY;
          const x2 = (1 - t2) * (1 - t2) * startX + 2 * (1 - t2) * t2 * controlX + t2 * t2 * endX;
          const y2 = (1 - t2) * (1 - t2) * startY + 2 * (1 - t2) * t2 * controlY + t2 * t2 * endY;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const perpX = -dy / len;
            const perpY = dx / len;
            // センターラインと同じ太さで描画（5本重ね）
            for (let o = -centerLineOffset; o <= centerLineOffset; o += centerLineOffset / 2) {
              points.push(
                x1 + perpX * o, 0.02, y1 + perpY * o,
                x2 + perpX * o, 0.02, y2 + perpY * o
              );
            }
          }
        }
      }
    });
    
    return new Float32Array(points);
  }, [boldLines, stepSize]);

  return (
    <>
      {/* 細いグリッド線（通常のグリッド） */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={thinLines.length / 3}
            array={thinLines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#cbd5e1"
          opacity={0.3}
          transparent
          linewidth={1}
        />
      </lineSegments>
      
      {/* 太いグリッド線（8ステップごと） */}
      {thickLines.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={thickLines.length / 3}
              array={thickLines}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#64748b"
            opacity={0.8}
            transparent
            linewidth={2}
          />
        </lineSegments>
      )}
      
      {/* 中央線（特に太く強調） */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={centerLines.length / 3}
            array={centerLines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#e2e8f0"
          opacity={0.6}
          transparent
          linewidth={2.5}
        />
      </lineSegments>
      
      {/* カスタム太線（30m枠など、ポイントラインより上に表示、センターラインと同じ太さ、別の色） */}
      {customBoldLines.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={customBoldLines.length / 3}
              array={customBoldLines}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#60a5fa"
            opacity={0.7}
            transparent
            linewidth={2.5}
          />
        </lineSegments>
      )}
    </>
  );
}

const Drill3DPreview = forwardRef<Drill3DPreviewRef, Props>(
  function Drill3DPreview({ members, positions }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const controlsRef = useRef<any>(null);
    const [currentView, setCurrentView] = useState<string>("diagonal");
    const [manualPosition, setManualPosition] = useState<[number, number, number] | null>(null);
    const [cameraX, setCameraX] = useState(25);
    const [cameraY, setCameraY] = useState(25);
    const [cameraZ, setCameraZ] = useState(25);
    const { settings } = useSettings();
    const fieldWidth = settings.fieldWidth;
    const fieldHeight = settings.fieldHeight;
    const boldLines = settings.boldLines || [];

    // ref経由でフレームキャプチャ機能を公開
    useImperativeHandle(ref, () => ({
      captureFrame: async () => {
        // Three.jsのCanvasからフレームをキャプチャ
        const canvas = document.querySelector(
          ".drill-3d-preview canvas"
        ) as HTMLCanvasElement;
        if (!canvas) return null;

        try {
          return new Promise((resolve) => {
            canvas.toBlob(
              (blob) => {
                resolve(blob);
              },
              "image/png",
              1.0
            );
          });
        } catch (error) {
          console.error("Failed to capture 3D frame:", error);
          return null;
        }
      },
    }));

    return (
      <div className="relative w-full h-full border-0 rounded bg-black drill-3d-preview">
        <Canvas camera={{ position: [0, 25, 30], fov: 40 }}>
        {/* ライト */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />

        {/* 床（フィールド） */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <planeGeometry args={[fieldWidth, fieldHeight]} />
          <meshStandardMaterial color="#4a7c59" />
        </mesh>
        
        {/* グリッド線 */}
        {settings.showGrid && (
          <FieldGrid width={fieldWidth} height={fieldHeight} boldLines={boldLines} />
        )}

        {/* メンバー */}
        {members.map((m) => {
          const p = positions[m.id];
          if (!p) return null;
          const x = p.x - fieldWidth / 2; // 中央揃えの補正
          const z = p.y - fieldHeight / 2;
          const isTrumpet = m.part === "Trumpet" || m.part?.toLowerCase().includes("trumpet");
          const memberColor = m.color ?? "#ffcc00";

          return (
            <group key={m.id} position={[x, 0, z]}>
              {/* 人型モデル */}
              {/* 頭 */}
              <mesh position={[0, 1.7, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color={memberColor} />
              </mesh>
              
              {/* 胴体 */}
              <mesh position={[0, 1.1, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.6, 16]} />
                <meshStandardMaterial color={memberColor} />
              </mesh>
              
              {isTrumpet ? (
                <>
                  {/* トランペット奏者の腕（楽器を構える姿勢） */}
                  {/* 左腕（楽器を支える、バルブセクションの左側に配置） */}
                  <mesh position={[-0.05, 1.55, 0.08]} rotation={[Math.PI / 6, 0, -Math.PI / 8]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
                    <meshStandardMaterial color={memberColor} />
                  </mesh>
                  
                  {/* 右腕（バルブを操作、バルブセクションの右側に配置） */}
                  <mesh position={[0.08, 1.55, 0.08]} rotation={[Math.PI / 6, 0, Math.PI / 8]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
                    <meshStandardMaterial color={memberColor} />
                  </mesh>
                  
                  {/* トランペット（実際の構造に基づいて組み立て） */}
                  <group 
                    position={[0, 1.65, 0.15]} 
                    rotation={[Math.PI / 8, 0, -Math.PI / 12]}
                  >
                    {/* マウスピース（口に当てる部分） */}
                    <mesh position={[0, 0, 0.2]}>
                      <cylinderGeometry args={[0.014, 0.014, 0.04, 8]} />
                      <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* リードパイプ（マウスピースから垂直に下へ） */}
                    <mesh position={[0, 0, 0.05]}>
                      <cylinderGeometry args={[0.011, 0.011, 0.3, 8]} />
                      <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* 第1バルブケーシング（リードパイプから接続） */}
                    <mesh position={[0, 0, -0.1]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.03, 0.03, 0.22, 8]} />
                      <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* 第1バルブ */}
                    <mesh position={[0, 0.075, -0.1]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.022, 0.022, 0.14, 8]} />
                      <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                    </mesh>
                    {/* 第1バルブのボタン */}
                    <mesh position={[0, 0.075, -0.03]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.018, 0.018, 0.02, 8]} />
                      <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* 第1バルブスライド（U字型、バルブから出て戻る） */}
                    <group position={[0, 0, -0.1]}>
                      {/* スライドの出る部分 */}
                      <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.08, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      {/* U字の曲がり部分（下へ） */}
                      <mesh position={[0.04, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.08, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      {/* U字の戻る部分 */}
                      <mesh position={[0, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.08, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                    </group>
                    
                    {/* 第2バルブケーシング */}
                    <mesh position={[0, 0, -0.22]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.03, 0.03, 0.22, 8]} />
                      <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* 第2バルブ */}
                    <mesh position={[0, 0, -0.22]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.022, 0.022, 0.14, 8]} />
                      <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                    </mesh>
                    {/* 第2バルブのボタン */}
                    <mesh position={[0, 0, -0.15]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.018, 0.018, 0.02, 8]} />
                      <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* 第2バルブスライド（U字型、短い） */}
                    <group position={[0, 0, -0.22]}>
                      <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.05, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      <mesh position={[0.04, -0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.05, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      <mesh position={[0, -0.025, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.05, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                    </group>
                    
                    {/* 第3バルブケーシング */}
                    <mesh position={[0, 0, -0.34]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.03, 0.03, 0.22, 8]} />
                      <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* 第3バルブ */}
                    <mesh position={[0, -0.075, -0.34]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.022, 0.022, 0.14, 8]} />
                      <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                    </mesh>
                    {/* 第3バルブのボタン */}
                    <mesh position={[0, -0.075, -0.27]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.018, 0.018, 0.02, 8]} />
                      <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
                    </mesh>
                    
                    {/* 第3バルブスライド（U字型） */}
                    <group position={[0, 0, -0.34]}>
                      <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.08, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      <mesh position={[0.04, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.08, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      <mesh position={[0, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.08, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                    </group>
                    
                    {/* メインチューニングスライド（U字型、大きい、バルブから出て前方へ） */}
                    <group position={[0, 0, -0.46]}>
                      {/* スライドの出る部分 */}
                      <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.12, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      {/* U字の曲がり部分（前方へ） */}
                      <mesh position={[0.05, 0, -0.06]} rotation={[0, Math.PI / 2, 0]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.1, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      {/* U字の戻る部分（ベルへ接続） */}
                      <mesh position={[0.1, 0, -0.12]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.011, 0.011, 0.12, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                    </group>
                    
                    {/* ベルセクション（メインチューニングスライドから曲がって広がる） */}
                    <group position={[0.1, 0, -0.24]}>
                      {/* ベルのネック（細い部分） */}
                      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <cylinderGeometry args={[0.011, 0.05, 0.08, 8]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      {/* ベル（前方に広がる） */}
                      <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI / 2, 0]}>
                        <coneGeometry args={[0.05, 0.2, 16]} />
                        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
                      </mesh>
                      {/* ベルのリム（縁の装飾） */}
                      <mesh position={[0, 0, -0.28]} rotation={[0, Math.PI / 2, 0]}>
                        <torusGeometry args={[0.1, 0.003, 8, 16]} />
                        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
                      </mesh>
                    </group>
                  </group>
                </>
              ) : (
                <>
                  {/* 通常の腕 */}
                  {/* 左腕 */}
                  <mesh position={[-0.2, 1.1, 0]} rotation={[0, 0, Math.PI / 6]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
                    <meshStandardMaterial color={memberColor} />
                  </mesh>
                  
                  {/* 右腕 */}
                  <mesh position={[0.2, 1.1, 0]} rotation={[0, 0, -Math.PI / 6]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
                    <meshStandardMaterial color={memberColor} />
                  </mesh>
                </>
              )}
              
              {/* 左脚 */}
              <mesh position={[-0.08, 0.5, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
                <meshStandardMaterial color={memberColor} />
              </mesh>
              
              {/* 右脚 */}
              <mesh position={[0.08, 0.5, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
                <meshStandardMaterial color={memberColor} />
              </mesh>
            </group>
          );
        })}

        <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate />
        <CameraController 
          controlsRef={controlsRef} 
          view={currentView} 
          manualPosition={manualPosition}
        />
      </Canvas>
      
      {/* カメラ視点切り替えボタン */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
        {[
          { key: "top", label: "上から" },
          { key: "front", label: "正面" },
          { key: "back", label: "背面" },
          { key: "left", label: "左側" },
          { key: "right", label: "右側" },
          { key: "diagonal", label: "斜め" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              const viewConfig = CAMERA_VIEWS[key];
              if (viewConfig) {
                setCameraX(viewConfig.position[0]);
                setCameraY(viewConfig.position[1]);
                setCameraZ(viewConfig.position[2]);
              }
              setCurrentView(key);
              setManualPosition(null);
            }}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              currentView === key && !manualPosition
                ? "bg-blue-600/80 hover:bg-blue-700/80 text-white border-blue-500"
                : "bg-gray-800/80 hover:bg-gray-700/80 text-white border-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      
      {/* カメラ位置調整スライダー */}
      <div className="absolute bottom-2 left-2 z-10 bg-gray-900/90 p-4 rounded-lg border border-gray-700 min-w-[280px]">
        <div className="text-white text-sm font-semibold mb-3">カメラ位置</div>
        
        {/* X軸 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-white text-xs">X軸</label>
            <span className="text-white text-xs">{cameraX.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="0.5"
            value={cameraX}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setCameraX(value);
              setManualPosition([value, cameraY, cameraZ]);
              setCurrentView("");
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
        
        {/* Y軸 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-white text-xs">Y軸</label>
            <span className="text-white text-xs">{cameraY.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={cameraY}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setCameraY(value);
              setManualPosition([cameraX, value, cameraZ]);
              setCurrentView("");
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
        
        {/* Z軸 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-white text-xs">Z軸</label>
            <span className="text-white text-xs">{cameraZ.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="0.5"
            value={cameraZ}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setCameraZ(value);
              setManualPosition([cameraX, cameraY, value]);
              setCurrentView("");
            }}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
        
        {/* リセットボタン */}
        <button
          onClick={() => {
            setCameraX(25);
            setCameraY(25);
            setCameraZ(25);
            setManualPosition(null);
            setCurrentView("diagonal");
          }}
          className="w-full px-3 py-1.5 bg-gray-700/80 hover:bg-gray-600/80 text-white text-xs rounded border border-gray-600 transition-colors"
        >
          リセット
        </button>
      </div>
    </div>
    );
  }
);

export default Drill3DPreview;
