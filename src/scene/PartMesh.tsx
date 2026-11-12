import { memo } from 'react';
import { BoxGeometry, CylinderGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Part } from '../data/types';
import { material, texturedMaterial } from './materials';
import { useGame } from '../game/store';
import { GRAPHICS } from './graphics';
const geometries = new Map<string, BoxGeometry | CylinderGeometry | RoundedBoxGeometry>();
export const PartMesh = memo(function PartMesh({ part, damaged = false }: { part: Part; damaged?: boolean }) {
  const quality = useGame(s => s.quality), settings = GRAPHICS[quality];
  const key = `${quality}:${part.shape}:${part.size.join(',')}:${part.round}`;
  if (!geometries.has(key)) {
    geometries.set(key, part.shape === 'cylinder' ? new CylinderGeometry(part.size[0] / 2, part.size[2] / 2, part.size[1], settings.cylinderSegments) : part.round ? new RoundedBoxGeometry(...part.size, settings.roundedSegments, Math.min(part.round, ...part.size.map(n => n / 2))) : new BoxGeometry(...part.size));
  }
  return <mesh name={part.name} position={part.pos} rotation={part.rotation} geometry={geometries.get(key)} material={part.texture ? texturedMaterial(part.texture, damaged) : material(part.finish, part.color, damaged, part.finish === 'wood' && part.size[1] > part.size[0])} castShadow receiveShadow dispose={null} />;
});
