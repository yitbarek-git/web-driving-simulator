import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTrafficPose } from '../../game/traffic';

interface TrafficVehiclesProps {
  count: number;
  elapsedSecondsRef: React.MutableRefObject<number>;
}

export function TrafficVehicles({ count, elapsedSecondsRef }: TrafficVehiclesProps) {
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    for (let i = 0; i < count; i++) {
      const group = refs.current[i];
      if (!group) continue;
      const pose = getTrafficPose(i, elapsedSecondsRef.current, count);
      group.position.set(pose.x, pose.y, pose.z);
      group.rotation.y = pose.yaw;
    }
  });

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <group
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
        >
          <mesh position={[0, 0.62, 0.05]} castShadow>
            <boxGeometry args={[1.72, 0.72, 3.55]} />
            <meshStandardMaterial
              color={['#345c73', '#a94b3d', '#9c9b8a', '#425b42', '#554b68', '#c18745'][index]}
              roughness={0.38}
              metalness={0.28}
            />
          </mesh>
          <mesh position={[0, 1.12, -0.22]}>
            <boxGeometry args={[1.36, 0.48, 1.55]} />
            <meshStandardMaterial color="#263642" roughness={0.24} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0.38, 1.86]}>
            <boxGeometry args={[1.68, 0.12, 0.08]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 0.39, -1.75]}>
            <boxGeometry args={[1.45, 0.1, 0.08]} />
            <meshBasicMaterial color="#fef3c7" />
          </mesh>
          {[-0.88, 0.88].flatMap((x) =>
            [-1.12, 1.24].map((z) => (
              <mesh
                key={`${x}-${z}`}
                position={[x, 0.28, z]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.29, 0.29, 0.17, 10]} />
                <meshStandardMaterial color="#17191c" roughness={0.92} />
              </mesh>
            )),
          )}
        </group>
      ))}
    </>
  );
}
