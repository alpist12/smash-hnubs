import { GRAPHICS } from './graphics';
import { MeshReflectorMaterial } from '@react-three/drei';
import type { Item } from '../data/types';
import { useGame } from '../game/store';

export function MirrorSurface({ item }: { item: Item }) {
  const quality = useGame(s => s.quality), reflection = GRAPHICS[quality].reflection;
  return <mesh name="실시간 거울 반사면" position={[0, 0, .023]}>
    <planeGeometry args={[(item.width ?? .85) - .075, (item.height ?? 1.4) - .075]} />
    {reflection ? <MeshReflectorMaterial resolution={reflection} mirror={1} mixStrength={1} roughness={0} metalness={0} color="#ffffff" depthWrite /> : <meshStandardMaterial color="#aebdc0" metalness={.9} roughness={.18} />}
  </mesh>;
}
