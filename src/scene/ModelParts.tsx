import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import type { Part } from '../data/types';
import { useGame } from '../game/store';
import { PartMesh, partGeometry, partMaterial } from './PartMesh';
import { partBatches } from './partBatches';

const InstanceBatch = memo(function InstanceBatch({ parts, damaged }: { parts: Part[]; damaged: boolean }) {
  const ref = useRef<InstancedMesh>(null), quality = useGame(s => s.quality);
  const geometry = partGeometry(parts[0], quality), material = partMaterial(parts[0], damaged);
  useLayoutEffect(() => {
    const mesh = ref.current; if (!mesh) return;
    const transform = new Object3D();
    parts.forEach((part, i) => {
      transform.position.set(...part.pos); transform.rotation.set(...(part.rotation ?? [0, 0, 0])); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    return () => { mesh.dispose(); };
  }, [parts, geometry, material]);
  return <instancedMesh ref={ref} name={parts[0].name} args={[geometry, material, parts.length]} castShadow receiveShadow dispose={null} />;
});
export const ModelParts = memo(function ModelParts({ parts, damaged = false }: { parts: Part[]; damaged?: boolean }) {
  const batches = useMemo(() => partBatches(parts), [parts]);
  return <>{batches.map((group, index) => group.length >= 3 ? <InstanceBatch key={index} parts={group} damaged={damaged} /> : group.map((part, i) => <PartMesh key={`${index}:${i}`} part={part} damaged={damaged} />))}</>;
});
