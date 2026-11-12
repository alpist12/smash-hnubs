import { Suspense, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { DirectionalLight } from 'three';
import { Environment, Lightformer, SoftShadows } from '@react-three/drei';
import { WORLD } from '../data/studios';
import { GRAPHICS, type Quality } from './graphics';

export function Lighting({ quality = 'high' }: { quality?: Quality }) {
  const high = quality === 'high', shadow = GRAPHICS[quality].shadow;
  const sun = useRef<DirectionalLight>(null), scene = useThree(state => state.scene);
  useEffect(() => {
    const light = sun.current; if (!light) return;
    light.target.position.set(0, 0, WORLD.centerZ); scene.add(light.target);
    return () => { scene.remove(light.target); };
  }, [scene]);
  return <>
    <ambientLight intensity={high ? .55 : 1.1} color="#e7ebec" />
    <hemisphereLight args={['#fff3df', '#71838c', high ? 1.05 : 1.5]} />
    {/* 그림자 범위를 건물 크기에 맞춰 좁혀 해상도를 올리고(깜빡임 감소), 빛의 중심을 건물 가운데로 둔다. */}
    <directionalLight position={[-4, 15, WORLD.centerZ + 3]} intensity={2.6} color="#fff1dc" castShadow={high} shadow-mapSize={[shadow, shadow]} shadow-camera-left={-13} shadow-camera-right={13} shadow-camera-top={13} shadow-camera-bottom={-13} shadow-camera-near={1} shadow-camera-far={40} shadow-normalBias={.03} shadow-bias={-.0004} ref={sun} />
    <directionalLight position={[7, 5, -6]} intensity={.65} color="#d9e8f5" />
    {high && <Suspense fallback={null}>
      <SoftShadows size={8} samples={16} focus={.5} />
      <Environment resolution={256} frames={1} environmentIntensity={.55}>
        <Lightformer form="rect" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 6, 1]} intensity={3} color="#fff4df" />
        <Lightformer form="rect" position={[8, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[7, 3, 1]} intensity={2} color="#e0edf7" />
        <Lightformer form="rect" position={[-6, 3, -5]} rotation={[0, Math.PI / 4, 0]} scale={[5, 4, 1]} intensity={1} color="#fff7ec" />
      </Environment>
    </Suspense>}
  </>;
}
