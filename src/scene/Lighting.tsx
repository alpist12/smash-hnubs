import { Suspense } from 'react';
import { Environment, Lightformer, SoftShadows } from '@react-three/drei';
import { WORLD } from '../data/studios';
import { GRAPHICS, type Quality } from './graphics';

export function Lighting({ quality = 'high' }: { quality?: Quality }) {
  const high = quality === 'high', shadow = GRAPHICS[quality].shadow;
  return <>
    <ambientLight intensity={high ? .55 : 1.1} color="#e7ebec" />
    <hemisphereLight args={['#fff3df', '#71838c', high ? 1.05 : 1.5]} />
    <directionalLight position={[-4, 15, 3]} intensity={2.6} color="#fff1dc" castShadow={high} shadow-mapSize={[shadow, shadow]} shadow-camera-left={-WORLD.depth} shadow-camera-right={WORLD.depth} shadow-camera-top={WORLD.depth} shadow-camera-bottom={-WORLD.depth} shadow-normalBias={.025} shadow-bias={-.00015} />
    <directionalLight position={[7, 5, -6]} intensity={.65} color="#d9e8f5" />
    {high && <Suspense fallback={null}>
      <SoftShadows size={12} samples={8} focus={.35} />
      <Environment resolution={256} frames={1} environmentIntensity={.55}>
        <Lightformer form="rect" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 6, 1]} intensity={3} color="#fff4df" />
        <Lightformer form="rect" position={[8, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[7, 3, 1]} intensity={2} color="#e0edf7" />
        <Lightformer form="rect" position={[-6, 3, -5]} rotation={[0, Math.PI / 4, 0]} scale={[5, 4, 1]} intensity={1} color="#fff7ec" />
      </Environment>
    </Suspense>}
  </>;
}
