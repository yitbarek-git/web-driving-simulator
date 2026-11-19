import { getStationPosition, STATION_PROGRESS } from '../../game/career';

export function RoadsideStations({
  waitingStation,
}: {
  waitingStation?: number;
}) {
  return (
    <>
      {STATION_PROGRESS.map((_, index) => {
        const station = getStationPosition(index);
        return (
          <group
            key={index}
            position={[station.x, station.y + 0.025, station.z]}
            rotation={[0, station.yaw, 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[6.5, 8]} />
              <meshStandardMaterial color="#464b4f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.18, 1.5]} castShadow>
              <boxGeometry args={[0.12, 2.36, 0.12]} />
              <meshStandardMaterial color="#d5d7d9" metalness={0.45} roughness={0.52} />
            </mesh>
            <mesh position={[0, 2.48, 1.5]}>
              <boxGeometry args={[0.72, 0.52, 0.16]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#a65c08"
                emissiveIntensity={0.3}
              />
            </mesh>
            <group visible={waitingStation === index}>
              <mesh position={[-1.3, 1.5, -0.25]} castShadow>
                <cylinderGeometry args={[0.34, 0.42, 0.9, 8]} />
                <meshStandardMaterial color={index % 2 ? '#526c91' : '#9d4c40'} />
              </mesh>
              <mesh position={[-1.3, 2.12, -0.25]} castShadow>
                <sphereGeometry args={[0.27, 10, 8]} />
                <meshStandardMaterial color="#d3a27c" roughness={0.82} />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
}
