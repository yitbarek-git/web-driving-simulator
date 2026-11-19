import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import {
  GUARDRAIL_OFFSET,
  HIGHWAY_TRACK,
  ROAD_WIDTH,
  SHOULDER_WIDTH,
} from '../../game/track';
import {
  createAsphaltTextures,
  createGrassTexture,
} from '../../game/proceduralTextures';
import { RoadsideStations } from './RoadsideStations';

interface HighwayEnvironmentProps {
  isSoftwareGl: boolean;
  night?: boolean;
  waitingStation?: number;
}

const SKY_VERTEX_SHADER = `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SKY_FRAGMENT_SHADER = `
  varying vec3 vWorldPos;
  uniform vec3 uSunDir;
  uniform float uNight;
  void main() {
    vec3 dir = normalize(vWorldPos);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 horizon = mix(vec3(0.79, 0.85, 0.91), vec3(0.075, 0.095, 0.14), uNight);
    vec3 midSky = mix(vec3(0.42, 0.63, 0.84), vec3(0.025, 0.045, 0.095), uNight);
    vec3 zenith = mix(vec3(0.18, 0.39, 0.65), vec3(0.004, 0.012, 0.038), uNight);

    vec3 col = mix(horizon, midSky, pow(h, 0.48));
    col = mix(col, zenith, smoothstep(0.25, 0.9, h));

    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    col += vec3(1.0, 0.93, 0.80) * pow(sunDot, 22.0) * 0.28 * (1.0 - uNight);
    col += vec3(1.0, 0.97, 0.90) * pow(sunDot, 280.0) * 0.75 * (1.0 - uNight);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Builds a continuous swept ribbon BufferGeometry along the highway spline.
 */
function buildRoadRibbonGeometry(
  halfWidth: number,
  yOffset: number,
  uvRepeatMeters: number,
): THREE.BufferGeometry {
  const samples = HIGHWAY_TRACK.samples;
  const count = samples.length;
  const positions = new Float32Array((count + 1) * 2 * 3);
  const uvs = new Float32Array((count + 1) * 2 * 2);
  const indices: number[] = [];

  let accumDist = 0;

  for (let i = 0; i <= count; i++) {
    const sample = samples[i % count];
    if (i > 0) {
      const prev = samples[(i - 1) % count];
      accumDist += sample.point.distanceTo(prev.point);
    }

    const leftX = sample.point.x - sample.right.x * halfWidth;
    const leftY = sample.point.y + yOffset;
    const leftZ = sample.point.z - sample.right.z * halfWidth;

    const rightX = sample.point.x + sample.right.x * halfWidth;
    const rightY = sample.point.y + yOffset;
    const rightZ = sample.point.z + sample.right.z * halfWidth;

    const vIdx = i * 2;
    positions[vIdx * 3] = leftX;
    positions[vIdx * 3 + 1] = leftY;
    positions[vIdx * 3 + 2] = leftZ;

    positions[(vIdx + 1) * 3] = rightX;
    positions[(vIdx + 1) * 3 + 1] = rightY;
    positions[(vIdx + 1) * 3 + 2] = rightZ;

    const vCoord = accumDist / uvRepeatMeters;
    uvs[vIdx * 2] = 0;
    uvs[vIdx * 2 + 1] = vCoord;
    uvs[(vIdx + 1) * 2] = 1;
    uvs[(vIdx + 1) * 2 + 1] = vCoord;

    if (i < count) {
      const a = vIdx;
      const b = vIdx + 1;
      const c = vIdx + 2;
      const d = vIdx + 3;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds continuous steel guardrail beam ribbons along both edges of the highway.
 */
function buildGuardrailBeamGeometry(sideSign: 1 | -1): THREE.BufferGeometry {
  const samples = HIGHWAY_TRACK.samples;
  const count = samples.length;
  const beamWidth = 0.08;
  const beamHeight = 0.28;
  const baseY = 0.56;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= count; i++) {
    const s = samples[i % count];
    const cx = s.point.x + s.right.x * GUARDRAIL_OFFSET * sideSign;
    const cy = s.point.y + baseY;
    const cz = s.point.z + s.right.z * GUARDRAIL_OFFSET * sideSign;

    const inX = s.right.x * beamWidth * sideSign;
    const inZ = s.right.z * beamWidth * sideSign;

    // 4 vertices per ring (inner bottom, inner top, outer top, outer bottom)
    positions.push(
      cx - inX, cy - beamHeight / 2, cz - inZ,
      cx - inX, cy + beamHeight / 2, cz - inZ,
      cx + inX, cy + beamHeight / 2, cz + inZ,
      cx + inX, cy - beamHeight / 2, cz + inZ,
    );

    if (i < count) {
      const r0 = i * 4;
      const r1 = (i + 1) * 4;
      for (let k = 0; k < 4; k++) {
        const nk = (k + 1) % 4;
        indices.push(r0 + k, r0 + nk, r1 + k);
        indices.push(r0 + nk, r1 + nk, r1 + k);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function HighwayEnvironment({
  isSoftwareGl,
  night = false,
  waitingStation,
}: HighwayEnvironmentProps) {
  const { gl } = useThree();
  const maxAnisotropy = useMemo(
    () => (isSoftwareGl ? 1 : Math.min(gl.capabilities.getMaxAnisotropy(), 8)),
    [gl, isSoftwareGl],
  );

  const textures = useMemo(() => {
    const asphalt = createAsphaltTextures(maxAnisotropy);
    const grass = createGrassTexture(maxAnisotropy);
    return { asphalt, grass };
  }, [maxAnisotropy]);

  const roadGeometry = useMemo(
    () => buildRoadRibbonGeometry(ROAD_WIDTH / 2 + SHOULDER_WIDTH, 0.02, 22),
    [],
  );

  const leftRailGeo = useMemo(() => buildGuardrailBeamGeometry(-1), []);
  const rightRailGeo = useMemo(() => buildGuardrailBeamGeometry(1), []);

  // Terrain mesh spanning 1900m x 1900m around the circuit center
  const terrainGeometry = useMemo(() => {
    const size = 1900;
    const segs = 136;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const cx = 250;
    const cz = -150;
    geo.translate(cx, 0, cz);

    const posAttr = geo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const grassCol = new THREE.Color('#6f8458');
    const rockCol = new THREE.Color('#686d73');
    const peakCol = new THREE.Color('#9ca3af');
    const tmpCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = HIGHWAY_TRACK.getTerrainHeight(vx, vz);
      posAttr.setY(i, vy);

      if (vy > 26) {
        tmpCol.copy(rockCol).lerp(peakCol, THREE.MathUtils.clamp((vy - 26) / 36, 0, 1));
      } else if (vy > 8) {
        tmpCol.copy(grassCol).lerp(rockCol, THREE.MathUtils.clamp((vy - 8) / 18, 0, 1));
      } else {
        tmpCol.copy(grassCol);
      }
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Scenery placements: trees, guardrail posts, boulders
  const scenery = useMemo(() => {
    let seed = 9001;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const trees: { x: number; y: number; z: number; scale: number; tint: number }[] = [];
    const rocks: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }[] = [];

    // Place trees & rocks outside road corridor across the valley
    let attempts = 0;
    while (trees.length < 440 && attempts < 3600) {
      attempts++;
      const tx = -520 + rand() * 1550;
      const tz = -960 + rand() * 1650;
      const closest = HIGHWAY_TRACK.findClosest(tx, tz);
      if (closest.distanceFromCenter < 18 || closest.distanceFromCenter > 320) {
        continue;
      }
      const ty = HIGHWAY_TRACK.getTerrainHeight(tx, tz);
      if (ty > 32) continue;

      trees.push({
        x: tx,
        y: ty - 0.15,
        z: tz,
        scale: 0.85 + rand() * 0.45, // natural scale variation
        tint: rand(),
      });
    }

    attempts = 0;
    while (rocks.length < 150 && attempts < 1500) {
      attempts++;
      const rx = -500 + rand() * 1500;
      const rz = -920 + rand() * 1600;
      const closest = HIGHWAY_TRACK.findClosest(rx, rz);
      if (closest.distanceFromCenter < 14 || closest.distanceFromCenter > 260) {
        continue;
      }
      const ry = HIGHWAY_TRACK.getTerrainHeight(rx, rz);
      rocks.push({
        x: rx,
        y: ry - 0.2,
        z: rz,
        sx: 1.0 + rand() * 2.2,
        sy: 0.6 + rand() * 1.3,
        sz: 1.0 + rand() * 2.2,
        ry: rand() * Math.PI * 2,
      });
    }

    // Guardrail posts every 4 samples on both sides
    const posts: { x: number; y: number; z: number; ry: number }[] = [];
    const samples = HIGHWAY_TRACK.samples;
    for (let i = 0; i < samples.length; i += 4) {
      const s = samples[i];
      const ry = Math.atan2(-s.tangent.x, -s.tangent.z);
      for (const side of [-1, 1] as const) {
        posts.push({
          x: s.point.x + s.right.x * (GUARDRAIL_OFFSET + 0.08 * side) * side,
          y: s.point.y + 0.34,
          z: s.point.z + s.right.z * (GUARDRAIL_OFFSET + 0.08 * side) * side,
          ry,
        });
      }
    }

    return { trees, rocks, posts };
  }, []);

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageLowRef = useRef<THREE.InstancedMesh>(null);
  const foliageHighRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const postRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    if (trunkRef.current && foliageLowRef.current && foliageHighRef.current) {
      scenery.trees.forEach((t, i) => {
        // Trunk
        dummy.position.set(t.x, t.y + 1.3 * t.scale, t.z);
        dummy.rotation.set(0, t.tint * Math.PI * 2, 0);
        dummy.scale.set(t.scale, t.scale, t.scale);
        dummy.updateMatrix();
        trunkRef.current!.setMatrixAt(i, dummy.matrix);

        // Lower pine canopy
        dummy.position.set(t.x, t.y + 3.6 * t.scale, t.z);
        dummy.scale.set(t.scale, t.scale, t.scale);
        dummy.updateMatrix();
        foliageLowRef.current!.setMatrixAt(i, dummy.matrix);

        // Upper pine canopy
        dummy.position.set(t.x, t.y + 5.7 * t.scale, t.z);
        dummy.scale.set(t.scale * 0.88, t.scale * 0.92, t.scale * 0.88);
        dummy.updateMatrix();
        foliageHighRef.current!.setMatrixAt(i, dummy.matrix);

        color.setHSL(0.28 + t.tint * 0.05, 0.36 + t.tint * 0.12, 0.2 + t.tint * 0.08);
        foliageLowRef.current!.setColorAt(i, color);
        color.offsetHSL(0, 0, 0.03);
        foliageHighRef.current!.setColorAt(i, color);
      });

      trunkRef.current.instanceMatrix.needsUpdate = true;
      foliageLowRef.current.instanceMatrix.needsUpdate = true;
      foliageHighRef.current.instanceMatrix.needsUpdate = true;
      if (foliageLowRef.current.instanceColor) {
        foliageLowRef.current.instanceColor.needsUpdate = true;
      }
      if (foliageHighRef.current.instanceColor) {
        foliageHighRef.current.instanceColor.needsUpdate = true;
      }
      trunkRef.current.computeBoundingSphere();
      foliageLowRef.current.computeBoundingSphere();
      foliageHighRef.current.computeBoundingSphere();
    }

    if (rockRef.current) {
      scenery.rocks.forEach((r, i) => {
        dummy.position.set(r.x, r.y + r.sy * 0.4, r.z);
        dummy.rotation.set(0.1 * i, r.ry, 0.05 * i);
        dummy.scale.set(r.sx, r.sy, r.sz);
        dummy.updateMatrix();
        rockRef.current!.setMatrixAt(i, dummy.matrix);
        const shade = 0.38 + (i % 5) * 0.04;
        color.setRGB(shade, shade * 1.01, shade * 1.04);
        rockRef.current!.setColorAt(i, color);
      });
      rockRef.current.instanceMatrix.needsUpdate = true;
      if (rockRef.current.instanceColor) {
        rockRef.current.instanceColor.needsUpdate = true;
      }
      rockRef.current.computeBoundingSphere();
    }

    if (postRef.current) {
      scenery.posts.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.ry, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postRef.current!.setMatrixAt(i, dummy.matrix);
      });
      postRef.current.instanceMatrix.needsUpdate = true;
      postRef.current.computeBoundingSphere();
    }
  }, [scenery]);

  useEffect(() => {
    return () => {
      textures.asphalt.map.dispose();
      textures.asphalt.roughnessMap.dispose();
      textures.grass.dispose();
      roadGeometry.dispose();
      leftRailGeo.dispose();
      rightRailGeo.dispose();
      terrainGeometry.dispose();
    };
  }, [textures, roadGeometry, leftRailGeo, rightRailGeo, terrainGeometry]);

  const skyUniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(0.45, 0.38, -0.78).normalize() },
      uNight: { value: night ? 1 : 0 },
    }),
    [night],
  );

  return (
    <group>
      {/* Atmospheric Sky Dome */}
      <mesh frustumCulled={false}>
        <sphereGeometry args={[1450, 32, 20]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={skyUniforms}
          vertexShader={SKY_VERTEX_SHADER}
          fragmentShader={SKY_FRAGMENT_SHADER}
        />
      </mesh>

      {/* Rolling Valley & Mountain Terrain */}
      <mesh geometry={terrainGeometry} receiveShadow={!isSoftwareGl}>
        <meshStandardMaterial
          map={textures.grass}
          vertexColors
          roughness={0.94}
          metalness={0.02}
        />
      </mesh>

      {/* Highway Asphalt Ribbon */}
      <mesh geometry={roadGeometry} receiveShadow={!isSoftwareGl}>
        <meshStandardMaterial
          map={textures.asphalt.map}
          roughnessMap={textures.asphalt.roughnessMap}
          roughness={0.82}
          metalness={0.08}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Left & Right Continuous Steel Guardrails */}
      <mesh geometry={leftRailGeo} receiveShadow={!isSoftwareGl}>
        <meshStandardMaterial color="#b4bcc6" metalness={0.78} roughness={0.34} />
      </mesh>
      <mesh geometry={rightRailGeo} receiveShadow={!isSoftwareGl}>
        <meshStandardMaterial color="#b4bcc6" metalness={0.78} roughness={0.34} />
      </mesh>

      {/* Instanced Guardrail Steel Posts */}
      <instancedMesh
        ref={postRef}
        args={[undefined, undefined, scenery.posts.length]}
        castShadow={!isSoftwareGl}
      >
        <boxGeometry args={[0.1, 0.72, 0.1]} />
        <meshStandardMaterial color="#6b7280" metalness={0.65} roughness={0.45} />
      </instancedMesh>

      {/* Instanced Multi-Part Pine Trees */}
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, scenery.trees.length]}
        castShadow={!isSoftwareGl}
      >
        <cylinderGeometry args={[0.2, 0.3, 2.7, 7]} />
        <meshStandardMaterial color="#4a3728" roughness={0.92} metalness={0.0} />
      </instancedMesh>

      <instancedMesh
        ref={foliageLowRef}
        args={[undefined, undefined, scenery.trees.length]}
        castShadow={!isSoftwareGl}
        receiveShadow={!isSoftwareGl}
      >
        <coneGeometry args={[2.1, 4.2, 8]} />
        <meshStandardMaterial roughness={0.86} metalness={0.0} />
      </instancedMesh>

      <instancedMesh
        ref={foliageHighRef}
        args={[undefined, undefined, scenery.trees.length]}
        castShadow={!isSoftwareGl}
      >
        <coneGeometry args={[1.55, 3.6, 8]} />
        <meshStandardMaterial roughness={0.84} metalness={0.0} />
      </instancedMesh>

      {/* Instanced Roadside Boulders */}
      <instancedMesh
        ref={rockRef}
        args={[undefined, undefined, scenery.rocks.length]}
        castShadow={!isSoftwareGl}
        receiveShadow={!isSoftwareGl}
      >
        <dodecahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial roughness={0.9} metalness={0.05} />
      </instancedMesh>

      <RoadsideStations waitingStation={waitingStation} />
    </group>
  );
}
