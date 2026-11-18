import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createContactShadowTexture } from '../../game/proceduralTextures';
import type { CarColorOption } from '../../game/types';

export interface SportsCarHandle {
  setTransform: (
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    roll: number,
    steerAngle: number,
    wheelSpin: number,
    isBraking: boolean,
    isReversing: boolean,
  ) => void;
}

interface SportsCarModelProps {
  paintColor: CarColorOption;
  isSoftwareGl?: boolean;
}

export const SportsCarModel = forwardRef<SportsCarHandle, SportsCarModelProps>(
  function SportsCarModel({ paintColor, isSoftwareGl = false }, ref) {
    const rootRef = useRef<THREE.Group>(null);
    const chassisRef = useRef<THREE.Group>(null);
    const flSteerRef = useRef<THREE.Group>(null);
    const frSteerRef = useRef<THREE.Group>(null);
    const wheelSpinRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
    const brakeMatRef = useRef<THREE.MeshStandardMaterial>(null);
    const reverseMatRef = useRef<THREE.MeshStandardMaterial>(null);

    // Build sculpted side-silhouette extruded body & greenhouse geometries
    const geometries = useMemo(() => {
      // Main lower body silhouette in YZ plane (extruded along X, then centered)
      const bodyShape = new THREE.Shape();
      // X in shape = -Z (so shape +x = forward -Z, shape +y = up +Y)
      bodyShape.moveTo(-2.12, 0.24);
      bodyShape.lineTo(2.05, 0.22); // bottom sill
      bodyShape.quadraticCurveTo(2.24, 0.24, 2.26, 0.42); // front bumper chin
      bodyShape.quadraticCurveTo(2.22, 0.66, 1.98, 0.74); // nose tip
      bodyShape.quadraticCurveTo(1.45, 0.86, 0.86, 0.92); // low sculpted hood
      bodyShape.lineTo(0.42, 0.96); // cowl
      bodyShape.lineTo(-0.3, 1.32); // windshield slope (covered by cabin)
      bodyShape.lineTo(-1.25, 1.24); // fastback rear deck
      bodyShape.quadraticCurveTo(-1.95, 1.02, -2.14, 0.88); // tail
      bodyShape.lineTo(-2.16, 0.48);
      bodyShape.quadraticCurveTo(-2.16, 0.28, -2.12, 0.24);

      const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
        depth: 1.76,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 3,
      });
      // Center along Z of extrusion, then rotate so shape +X maps to -Z (forward)
      bodyGeo.translate(0, 0, -0.88);
      bodyGeo.rotateY(Math.PI / 2);
      bodyGeo.computeVertexNormals();

      // Cabin greenhouse silhouette (narrower upper canopy)
      const cabinShape = new THREE.Shape();
      cabinShape.moveTo(-1.46, 0.92);
      cabinShape.lineTo(0.68, 0.92);
      cabinShape.quadraticCurveTo(0.24, 1.34, -0.22, 1.37); // windshield & roof peak
      cabinShape.lineTo(-0.82, 1.35);
      cabinShape.quadraticCurveTo(-1.22, 1.22, -1.46, 0.92);

      const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
        depth: 1.32,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 3,
      });
      cabinGeo.translate(0, 0, -0.66);
      cabinGeo.rotateY(Math.PI / 2);
      cabinGeo.computeVertexNormals();

      // Tire and rim geometries
      const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 28);
      tireGeo.rotateZ(Math.PI / 2);

      const rimGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.27, 20);
      rimGeo.rotateZ(Math.PI / 2);

      const hubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.285, 12);
      hubGeo.rotateZ(Math.PI / 2);

      const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 18);
      discGeo.rotateZ(Math.PI / 2);

      return { bodyGeo, cabinGeo, tireGeo, rimGeo, hubGeo, discGeo };
    }, []);

    const shadowTexture = useMemo(() => createContactShadowTexture(), []);

    useEffect(() => {
      return () => {
        Object.values(geometries).forEach((g) => g.dispose());
        shadowTexture.dispose();
      };
    }, [geometries, shadowTexture]);

    useImperativeHandle(ref, () => ({
      setTransform: (
        x,
        y,
        z,
        yaw,
        pitch,
        roll,
        steerAngle,
        wheelSpin,
        isBraking,
        isReversing,
      ) => {
        if (rootRef.current) {
          rootRef.current.position.set(x, y, z);
          rootRef.current.rotation.set(0, yaw, 0);
        }
        if (chassisRef.current) {
          chassisRef.current.rotation.set(pitch, 0, roll);
        }
        if (flSteerRef.current) {
          flSteerRef.current.rotation.y = steerAngle;
        }
        if (frSteerRef.current) {
          frSteerRef.current.rotation.y = steerAngle;
        }
        for (let i = 0; i < 4; i++) {
          const w = wheelSpinRefs.current[i];
          if (w) {
            // Forward motion (-Z) rotates wheels forward around -X
            w.rotation.x = -wheelSpin;
          }
        }
        if (brakeMatRef.current) {
          brakeMatRef.current.emissiveIntensity = isBraking ? 4.2 : 0.85;
        }
        if (reverseMatRef.current) {
          reverseMatRef.current.emissiveIntensity = isReversing ? 3.2 : 0.05;
        }
      },
    }));

    const materials = useMemo(() => {
      return {
        carbon: new THREE.MeshStandardMaterial({
          color: '#17191e',
          roughness: 0.42,
          metalness: 0.25,
        }),
        grille: new THREE.MeshStandardMaterial({
          color: '#0e1014',
          roughness: 0.82,
          metalness: 0.15,
        }),
        glass: new THREE.MeshPhysicalMaterial({
          color: '#111824',
          roughness: 0.08,
          metalness: 0.15,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          transparent: true,
          opacity: 0.88,
        }),
        tire: new THREE.MeshStandardMaterial({
          color: '#181a1d',
          roughness: 0.88,
          metalness: 0.05,
        }),
        rim: new THREE.MeshStandardMaterial({
          color: '#cbd2dc',
          roughness: 0.22,
          metalness: 0.9,
        }),
        caliper: new THREE.MeshStandardMaterial({
          color: '#b91c1c',
          roughness: 0.35,
          metalness: 0.4,
        }),
        chrome: new THREE.MeshStandardMaterial({
          color: '#e5e7eb',
          roughness: 0.12,
          metalness: 0.96,
        }),
        headlight: new THREE.MeshStandardMaterial({
          color: '#f8fafc',
          emissive: '#e0f2fe',
          emissiveIntensity: 2.2,
          roughness: 0.1,
        }),
      };
    }, []);

    useEffect(() => {
      return () => {
        Object.values(materials).forEach((m) => m.dispose());
      };
    }, [materials]);

    const wheelPositions: {
      key: string;
      x: number;
      z: number;
      isFront: boolean;
      isLeft: boolean;
    }[] = [
      { key: 'fl', x: -0.84, z: -1.36, isFront: true, isLeft: true },
      { key: 'fr', x: 0.84, z: -1.36, isFront: true, isLeft: false },
      { key: 'rl', x: -0.85, z: 1.36, isFront: false, isLeft: true },
      { key: 'rr', x: 0.85, z: 1.36, isFront: false, isLeft: false },
    ];

    const renderWheel = (
      idx: number,
      wp: (typeof wheelPositions)[number],
    ) => {
      const innerWheel = (
        <group
          ref={(el) => {
            wheelSpinRefs.current[idx] = el;
          }}
        >
          <mesh
            geometry={geometries.tireGeo}
            material={materials.tire}
            castShadow={!isSoftwareGl}
          />
          <mesh geometry={geometries.rimGeo} material={materials.rim} />
          <mesh geometry={geometries.hubGeo} material={materials.carbon} />
          {/* 5 Alloy Wheel Spokes */}
          {[0, 1, 2, 3, 4].map((spoke) => {
            const angle = (spoke * Math.PI * 2) / 5;
            const sideSign = wp.isLeft ? -1 : 1;
            return (
              <mesh
                key={spoke}
                position={[sideSign * 0.132, Math.cos(angle) * 0.12, Math.sin(angle) * 0.12]}
                rotation={[angle, 0, 0]}
                material={materials.chrome}
              >
                <boxGeometry args={[0.02, 0.21, 0.036]} />
              </mesh>
            );
          })}
        </group>
      );

      if (wp.isFront) {
        return (
          <group
            key={wp.key}
            position={[wp.x, 0.34, wp.z]}
            ref={wp.isLeft ? flSteerRef : frSteerRef}
          >
            {innerWheel}
            <mesh
              position={[wp.isLeft ? 0.05 : -0.05, 0, 0]}
              geometry={geometries.discGeo}
              material={materials.chrome}
            />
            <mesh
              position={[wp.isLeft ? 0.06 : -0.06, 0.05, 0.12]}
              material={materials.caliper}
            >
              <boxGeometry args={[0.06, 0.1, 0.07]} />
            </mesh>
          </group>
        );
      }

      return (
        <group key={wp.key} position={[wp.x, 0.34, wp.z]}>
          {innerWheel}
          <mesh
            position={[wp.isLeft ? 0.05 : -0.05, 0, 0]}
            geometry={geometries.discGeo}
            material={materials.chrome}
          />
        </group>
      );
    };

    return (
      <group ref={rootRef}>
        {/* Grounded radial contact shadow */}
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[2.7, 5.1]} />
          <meshBasicMaterial
            map={shadowTexture}
            transparent
            depthWrite={false}
            opacity={0.78}
          />
        </mesh>

        {/* Suspension-articulated chassis group */}
        <group ref={chassisRef}>
          {/* 1. Primary sculpted clearcoat car body */}
          <mesh
            geometry={geometries.bodyGeo}
            castShadow={!isSoftwareGl}
            receiveShadow={!isSoftwareGl}
          >
            <meshPhysicalMaterial
              color={paintColor.hex}
              metalness={paintColor.metalness}
              roughness={paintColor.roughness}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
              envMapIntensity={1.25}
            />
          </mesh>

          {/* 2. Side flared haunches / fender blisters */}
          <mesh
            position={[0, 0.56, -1.36]}
            castShadow={!isSoftwareGl}
            receiveShadow={!isSoftwareGl}
          >
            <boxGeometry args={[1.94, 0.38, 0.92]} />
            <meshPhysicalMaterial
              color={paintColor.hex}
              metalness={paintColor.metalness}
              roughness={paintColor.roughness}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
            />
          </mesh>
          <mesh
            position={[0, 0.6, 1.36]}
            castShadow={!isSoftwareGl}
            receiveShadow={!isSoftwareGl}
          >
            <boxGeometry args={[1.96, 0.42, 0.96]} />
            <meshPhysicalMaterial
              color={paintColor.hex}
              metalness={paintColor.metalness}
              roughness={paintColor.roughness}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
            />
          </mesh>

          {/* 3. Sculpted Cabin Greenhouse (Glass + Roof) */}
          <mesh
            geometry={geometries.cabinGeo}
            material={materials.glass}
            castShadow={!isSoftwareGl}
          />
          {/* Painted roof panel cap */}
          <mesh position={[0, 1.34, 0.52]} castShadow={!isSoftwareGl}>
            <boxGeometry args={[1.18, 0.05, 0.72]} />
            <meshPhysicalMaterial
              color={paintColor.hex}
              metalness={paintColor.metalness}
              roughness={paintColor.roughness}
              clearcoat={1.0}
              clearcoatRoughness={0.08}
            />
          </mesh>

          {/* 4. Underbody dark carbon chassis floor & front splitter */}
          <mesh position={[0, 0.21, 0]} material={materials.carbon}>
            <boxGeometry args={[1.72, 0.07, 4.15]} />
          </mesh>
          <mesh position={[0, 0.2, -2.2]} material={materials.carbon}>
            <boxGeometry args={[1.88, 0.04, 0.28]} />
          </mesh>

          {/* 5. Front air intake grille */}
          <mesh position={[0, 0.44, -2.23]} material={materials.grille}>
            <boxGeometry args={[1.28, 0.24, 0.08]} />
          </mesh>

          {/* 6. Rear carbon diffuser & dual exhaust tips */}
          <mesh position={[0, 0.28, 2.13]} material={materials.carbon}>
            <boxGeometry args={[1.64, 0.16, 0.14]} />
          </mesh>
          {[-0.56, -0.44, 0.44, 0.56].map((ex, i) => (
            <mesh
              key={i}
              position={[ex, 0.27, 2.2]}
              rotation={[Math.PI / 2, 0, 0]}
              material={materials.chrome}
            >
              <cylinderGeometry args={[0.045, 0.045, 0.12, 14]} />
            </mesh>
          ))}

          {/* 7. Subtle rear aerodynamic lip spoiler */}
          <mesh position={[0, 0.99, 2.0]} rotation={[0.16, 0, 0]} material={materials.carbon}>
            <boxGeometry args={[1.62, 0.045, 0.2]} />
          </mesh>

          {/* 8. Side mirrors */}
          {[-0.98, 0.98].map((mx, i) => (
            <mesh
              key={i}
              position={[mx, 0.98, -0.42]}
              rotation={[0, mx < 0 ? 0.18 : -0.18, 0]}
              material={materials.carbon}
            >
              <boxGeometry args={[0.18, 0.08, 0.13]} />
            </mesh>
          ))}

          {/* 9. Recessed LED headlights */}
          {[-0.68, 0.68].map((hx, i) => (
            <mesh
              key={i}
              position={[hx, 0.62, -2.14]}
              rotation={[0.25, hx < 0 ? 0.2 : -0.2, 0]}
              material={materials.headlight}
            >
              <boxGeometry args={[0.3, 0.07, 0.12]} />
            </mesh>
          ))}

          {/* 10. Full-width LED tail light bar + reactive brake lights */}
          <mesh position={[0, 0.78, 2.16]}>
            <boxGeometry args={[1.66, 0.055, 0.06]} />
            <meshStandardMaterial
              ref={brakeMatRef}
              color="#dc2626"
              emissive="#ef4444"
              emissiveIntensity={0.85}
              roughness={0.2}
            />
          </mesh>

          {/* 11. Reverse light cluster */}
          <mesh position={[0, 0.71, 2.16]}>
            <boxGeometry args={[0.42, 0.035, 0.05]} />
            <meshStandardMaterial
              ref={reverseMatRef}
              color="#e2e8f0"
              emissive="#ffffff"
              emissiveIntensity={0.05}
              roughness={0.2}
            />
          </mesh>
        </group>

        {/* 12. Four articulated wheels */}
        {wheelPositions.map((wp, idx) => renderWheel(idx, wp))}
      </group>
    );
  },
);
