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
import { Performance } from './Performance';
import { renderDpr } from './graphics';
import { AreaLabels } from './AreaLabels';
import { Character } from './Character';
import { CHARACTERS } from '../data/characters';

function World() {
  const round = useGame(s => s.round), debris = useGame(s => s.debris);
  useEffect(() => { clearAttacks(); useGame.setState({ ready: true }); return () => useGame.setState({ ready: false }); }, [round]);
  return <>
    <Physics key={round} gravity={[0, -9.81, 0]} timeStep={1 / 60} interpolate colliders={false}>
      <Room /><Studios />{CHARACTERS.map(profile => <Character key={`${profile.id}:${round}`} profile={profile} />)}
      {ITEMS.map(item => <Destructible key={`${round}:${item.id}`} item={item} />)}
      {debris.map(fragment => <Fragment key={fragment.id} fragment={fragment} />)}
    </Physics>
    <Effects />
    <AreaLabels />
  </>;
}
export default function GameScene() {
  const quality = useGame(s => s.quality), ready = useGame(s => s.ready);
  useEffect(() => {
    const stop = () => { aim.holding = false; };
    window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop); window.addEventListener('blur', stop);
    return () => { window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); window.removeEventListener('blur', stop); };
  }, []);
  return <Canvas tabIndex={0} onPointerDownCapture={event => event.currentTarget.focus()} shadows={quality !== 'low'} dpr={renderDpr(quality, window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)} camera={{ position: [8, 8.5, 10.5], fov: 36, near: .1, far: 120 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onContextMenu={e => e.preventDefault()} onDoubleClick={() => { if (!aim.target) focusOn(aim.point); }}>
    <color attach="background" args={['#dfe2e4']} />
    <fog attach="fog" args={['#dfe2e4', 38, 90]} />
    <Lighting quality={quality} /><Performance active={ready} />
    <Suspense fallback={null}><World /></Suspense>
    <CameraRig />
  </Canvas>;
}
