// components/drill/Drill3DPreview.tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Member as DrillMember, WorldPos } from "../../lib/drill/types";

type Props = {
  members: DrillMember[];
  positions: Record<string, WorldPos>;
};

export default function Drill3DPreview({ members, positions }: Props) {
  return (
    <div className="w-[420px] h-[260px] border rounded bg-black">
      <Canvas camera={{ position: [0, 25, 30], fov: 40 }}>
        {/* ライト */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />

        {/* 床（フィールド） */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <planeGeometry args={[40, 50]} /> {/* ざっくり 40m x 50m */}
          <meshStandardMaterial color="#4a7c59" />
        </mesh>

        {/* メンバー */}
        {members.map((m) => {
          const p = positions[m.id];
          if (!p) return null;
          const x = p.x - 20; // 中央揃えの補正はお好みで
          const z = p.y - 15;

          return (
            <mesh key={m.id} position={[x, 0.5, z]}>
              <cylinderGeometry args={[0.3, 0.3, 1.0, 16]} />
              <meshStandardMaterial color={m.color ?? "#ffcc00"} />
            </mesh>
          );
        })}

        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
