"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "next-themes";

/* Camera waypoints keyed to the six scroll story stages:
   SEE 0-.15 · UNDERSTAND .15-.30 · CONNECT .30-.45 ·
   PRIORITIZE .45-.65 · PREDICT .65-.85 · ACT .85-1 */
const waypoints = [
  { p: 0, pos: new THREE.Vector3(9, 7, 11), look: new THREE.Vector3(0, 0, 0) },
  { p: 0.15, pos: new THREE.Vector3(5, 4.2, 6), look: new THREE.Vector3(1.4, 0, 1.2) },
  { p: 0.3, pos: new THREE.Vector3(2.2, 3, 3), look: new THREE.Vector3(1.4, 0.3, 1.2) },
  { p: 0.45, pos: new THREE.Vector3(0, 9, 8.5), look: new THREE.Vector3(0, 0, 0) },
  { p: 0.65, pos: new THREE.Vector3(-6, 8, 9), look: new THREE.Vector3(0, 0, 0) },
  { p: 0.85, pos: new THREE.Vector3(10, 6, 12), look: new THREE.Vector3(0, 0, 0) },
  { p: 1, pos: new THREE.Vector3(9, 7, 11), look: new THREE.Vector3(0, 0, 0) },
];

function sampleWaypoints(p: number) {
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p || 1);
      const pos = new THREE.Vector3().lerpVectors(a.pos, b.pos, t);
      const look = new THREE.Vector3().lerpVectors(a.look, b.look, t);
      return { pos, look };
    }
  }
  return { pos: waypoints[0].pos.clone(), look: waypoints[0].look.clone() };
}

function Buildings() {
  const data = useMemo(() => {
    const arr: { x: number; z: number; h: number; w: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const x = (Math.random() - 0.5) * 16;
      const z = (Math.random() - 0.5) * 16;
      if (Math.abs(x) < 2.4 && Math.abs(z) < 2.4) continue;
      arr.push({ x, z, h: 0.6 + Math.random() * 2.6, w: 0.5 + Math.random() * 0.5 });
    }
    return arr;
  }, []);

  return (
    <group>
      {data.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color="#3a372f" roughness={0.85} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function Roads() {
  return (
    <group position={[0, 0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.4, 20]} />
        <meshStandardMaterial color="#232019" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 2.4]} />
        <meshStandardMaterial color="#232019" />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[26, 26]} />
      <meshStandardMaterial color="#161410" roughness={1} />
    </mesh>
  );
}

function Streetlights() {
  const points = [
    [1.6, 0, 3],
    [-1.6, 0, 6],
    [1.6, 0, -4],
    [3, 0, -1.6],
    [-4, 0, 1.6],
  ] as [number, number, number][];
  return (
    <group>
      {points.map((pt, i) => (
        <group key={i} position={pt}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
            <meshStandardMaterial color="#4a463c" />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial
              color="#E8A33D"
              emissive="#E8A33D"
              emissiveIntensity={2}
            />
          </mesh>
          <pointLight
            position={[0, 1.25, 0]}
            intensity={0.6}
            distance={3}
            color="#E8A33D"
          />
        </group>
      ))}
    </group>
  );
}

/* The pothole that becomes visible during the UNDERSTAND stage,
   scanned by an animated AI plane. */
function PotholeAndScan({ progress }: { progress: number }) {
  const scanRef = useRef<THREE.Mesh>(null);
  const active = progress > 0.13 && progress < 0.34;
  const localT = THREE.MathUtils.clamp((progress - 0.15) / 0.15, 0, 1);

  useFrame((state) => {
    if (scanRef.current) {
      scanRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={[1.6, 0, 3]} visible={active}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.3, 24]} />
        <meshStandardMaterial color="#0c0b09" />
      </mesh>
      <mesh
        ref={scanRef}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, localT, 1]}
      >
        <ringGeometry args={[0.32, 0.5, 32]} />
        <meshBasicMaterial
          color="#E8A33D"
          transparent
          opacity={0.7 * localT}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* Duplicate report nodes converging into one during CONNECT. */
function DuplicateNodes({ progress }: { progress: number }) {
  const active = progress > 0.28 && progress < 0.5;
  const t = THREE.MathUtils.clamp((progress - 0.3) / 0.15, 0, 1);
  const center = new THREE.Vector3(1.6, 0.5, 3);
  const spread = [
    new THREE.Vector3(0.4, 0.5, 0.5),
    new THREE.Vector3(-0.5, 0.5, 0.3),
    new THREE.Vector3(0.3, 0.5, -0.5),
    new THREE.Vector3(-0.4, 0.5, -0.4),
    new THREE.Vector3(0.6, 0.5, 0),
  ];

  return (
    <group visible={active}>
      {spread.map((offset, i) => {
        const pos = new THREE.Vector3().lerpVectors(
          center.clone().add(offset),
          center,
          t
        );
        return (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              color="#E8A33D"
              emissive="#E8A33D"
              emissiveIntensity={1.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* Severity heatmap discs that rise across the city during PRIORITIZE. */
function HeatZones({ progress }: { progress: number }) {
  const active = progress > 0.42 && progress < 0.7;
  const t = THREE.MathUtils.clamp((progress - 0.45) / 0.2, 0, 1);
  const zones = [
    { pos: [1.6, 0, 3], color: "#C1442C", scale: 1.3 },
    { pos: [-3, 0, -3], color: "#E8A33D", scale: 0.9 },
    { pos: [4, 0, -2], color: "#4C7A5E", scale: 0.7 },
    { pos: [-2, 0, 4], color: "#E8A33D", scale: 0.8 },
  ] as const;

  return (
    <group visible={active}>
      {zones.map((z, i) => (
        <mesh
          key={i}
          position={[z.pos[0], 0.03 + t * 0.02, z.pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[z.scale * t, z.scale * t, 1]}
        >
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color={z.color} transparent opacity={0.35 * t} />
        </mesh>
      ))}
    </group>
  );
}

/* Predicted risk rings expanding outward during PREDICT. */
function RiskRings({ progress }: { progress: number }) {
  const active = progress > 0.62 && progress < 0.9;
  const t = THREE.MathUtils.clamp((progress - 0.65) / 0.2, 0, 1);

  return (
    <group visible={active}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-3, 0.05, -3]}
        scale={[0.5 + t * 1.4, 0.5 + t * 1.4, 1]}
      >
        <ringGeometry args={[0.9, 1, 32]} />
        <meshBasicMaterial color="#C1442C" transparent opacity={0.6 * (1 - t * 0.4)} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[3, 0.05, 2]}
        scale={[0.5 + t * 1.1, 0.5 + t * 1.1, 1]}
      >
        <ringGeometry args={[0.7, 0.8, 32]} />
        <meshBasicMaterial color="#E8A33D" transparent opacity={0.5 * (1 - t * 0.4)} />
      </mesh>
    </group>
  );
}

function CameraRig({ progress }: { progress: number }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame(() => {
    const { pos, look } = sampleWaypoints(progress);
    camera.position.lerp(pos, 0.06);
    target.current.lerp(look, 0.06);
    camera.lookAt(target.current);
  });

  return null;
}

export function CityScene({ progress }: { progress: number }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <>
      <CameraRig progress={progress} />
      <ambientLight intensity={isDark ? 0.35 : 0.75} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={isDark ? 0.5 : 1.1}
        color={isDark ? "#E8A33D" : "#FFF6E6"}
        castShadow
      />
      <fog attach="fog" args={[isDark ? "#0D0D0C" : "#F5F3EE", 12, 26]} />

      <Ground />
      <Roads />
      <Buildings />
      <Streetlights />
      <PotholeAndScan progress={progress} />
      <DuplicateNodes progress={progress} />
      <HeatZones progress={progress} />
      <RiskRings progress={progress} />
    </>
  );
}
