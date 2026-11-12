import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { ITEMS } from '../data/room';
import { useGame } from '../game/store';
import { clearAttacks, aim } from '../physics/attacks';
import { Destructible, Fragment } from '../physics/Destructible';
import { Studios } from './Studios';
import { Room } from './Room';
import { Effects } from './Effects';
import { CameraRig } from './Camera';
import { focusOn } from './cameraInput';
import { Lighting } from './Lighting';
import { GRAPHICS } from './graphics';
import { AreaLabels } from './AreaLabels';

function World() {
  const round = useGame(s => s.round), debris = useGame(s => s.debris);
  useEffect(() => { clearAttacks(); useGame.setState({ ready: true }); return () => useGame.setState({ ready: false }); }, [round]);
  return <>
    <Physics key={round} gravity={[0, -9.81, 0]} timeStep={1 / 60} interpolate colliders={false}>
      <Room /><Studios />
      {ITEMS.map(item => <Destructible key={`${round}:${item.id}`} item={item} />)}
      {debris.map(fragment => <Fragment key={fragment.id} fragment={fragment} />)}
    </Physics>
    <Effects />
    <AreaLabels />
  </>;
}
export default function GameScene() {
  const quality = useGame(s => s.quality);
  useEffect(() => {
    const stop = () => { aim.holding = false; };
    window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop); window.addEventListener('blur', stop);
    return () => { window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); window.removeEventListener('blur', stop); };
  }, []);
  return <Canvas shadows={quality === 'high'} dpr={GRAPHICS[quality].dpr} camera={{ position: [8, 8.5, 10.5], fov: 36, near: .1, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onContextMenu={e => e.preventDefault()} onDoubleClick={() => focusOn(aim.point)}>
    <color attach="background" args={['#dfe2e4']} />
    <fog attach="fog" args={['#dfe2e4', 38, 90]} />
    <Lighting quality={quality} />
    <Suspense fallback={null}><World /></Suspense>
    <CameraRig />
  </Canvas>;
}
