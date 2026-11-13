import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Group, Vector3 } from 'three';
import { useGame } from '../game/store';
import { HitCombo, VOICE_STAGES } from '../game/hitCombo';
import { CharacterHealth, CHARACTER_BAT_HITS } from '../game/characterHealth';
import { playCharacterVoice, prepareCharacterVoice, stopCharacterVoice } from '../game/characterVoice';
import { aim, attack, targets } from '../physics/attacks';
import type { V3 } from '../data/types';
import { CharacterModel } from './CharacterModel';

const ID = 'character-wonjae';
export function Character() {
  const body = useRef<RapierRigidBody>(null), view = useRef<Group>(null);
  const combo = useRef(new HitCombo()), flinch = useRef(0);
  const health = useRef(new CharacterHealth());
  const [stage, setStage] = useState(-1), [hits, setHits] = useState(0), [gone, setGone] = useState(false);
  const sound = useGame(s => s.sound);
  useEffect(() => {
    void prepareCharacterVoice();
    targets.set(ID, {
      point: () => { const p = body.current?.translation(); return new Vector3(p?.x ?? -3.6, (p?.y ?? 0) + 1.1, p?.z ?? 2.5); },
      hit: (amount, impulse, _point, _speed, fromContact) => {
        if (health.current.gone || fromContact || amount < 1) return;
        if (health.current.hit(amount)) {
          targets.delete(ID); combo.current.reset(); stopCharacterVoice();
          if (aim.target === ID) { aim.target = ''; aim.holding = false; useGame.setState({ hovered: '' }); }
          setGone(true);
          useGame.setState({ hint: '원재 선배가 퇴장했습니다. 맵 복구로 다시 등장합니다.' });
          return;
        }
        setHits(health.current.batHits);
        if (aim.target === ID) useGame.setState({ hovered: `원재 선배 · 누적 ${health.current.batHits} / ${CHARACTER_BAT_HITS}대 (배트 기준)` });
        const now = performance.now(), next = combo.current.hit(now);
        flinch.current = now;
        body.current?.applyImpulse({ x: Math.max(-8, Math.min(8, impulse[0])), y: .4, z: Math.max(-8, Math.min(8, impulse[2])) }, true);
        setStage(combo.current.stage);
        if (next !== null && useGame.getState().sound) playCharacterVoice(next);
      },
    });
    const clear = () => { combo.current.reset(); setStage(-1); stopCharacterVoice(); };
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', visibility);
    return () => { targets.delete(ID); stopCharacterVoice(); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => { if (!sound) stopCharacterVoice(); }, [sound]);
  useEffect(() => {
    if (!gone) return;
    const frame = requestAnimationFrame(() => body.current?.setEnabled(false));
    return () => cancelAnimationFrame(frame);
  }, [gone]);
  useFrame(() => {
    if (gone) return;
    const now = performance.now();
    if (combo.current.expire(now)) { setStage(-1); stopCharacterVoice(); }
    const group = view.current, p = body.current?.translation();
    if (!group || !p) return;
    const elapsed = (now - flinch.current) / 1000;
    group.rotation.x = elapsed < .4 ? -Math.sin(elapsed * Math.PI / .4) * .16 : 0;
    group.position.y = elapsed < .4 ? Math.sin(elapsed * Math.PI / .4) * .05 : 0;
  });
  function onAim(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation(); aim.point = e.point.toArray() as V3; aim.target = ID;
    if (e.face) aim.normal = e.face.normal.clone().transformDirection(e.object.matrixWorld).toArray() as V3;
    useGame.setState({ hovered: `원재 선배 · 누적 ${hits} / ${CHARACTER_BAT_HITS}대 (배트 기준)` });
  }
  // 퇴장 때 물리 바디를 즉시 삭제하지 않고 비활성화해 Rapier 단계 중 해제를 피한다.
  return <RigidBody ref={body} name={ID} position={[-3.6, 0, 2.5]} colliders={false} enabledRotations={[false, false, false]} linearDamping={7} friction={1}>
    <CapsuleCollider args={[.65, .28]} position={[0, .94, 0]} mass={70} collisionGroups={0x0001ffff} />
    <group ref={view} visible={!gone} name="character-wonjae" rotation={[0,.22,0]} onPointerMove={onAim} onPointerOver={onAim}
      onPointerOut={() => { if (aim.target === ID) { aim.target = ''; useGame.setState({ hovered: '' }); } }}
      onPointerDown={e => { onAim(e); if (e.button === 0 && useGame.getState().weapon === 'laser') { aim.holding = true; attack(aim.point, ID); } }}
      onClick={e => { e.stopPropagation(); if (e.button === 0 && e.delta <= 5 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3, ID); }}>
      {!gone && <CharacterModel />}
      {!gone && stage >= 0 && <Html center position={[0, 2.18, 0]} style={{ pointerEvents: 'none', whiteSpace: 'nowrap', background: '#1b2029ed', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 14 }}>연타 {stage + 1} / {VOICE_STAGES.length}<small style={{ display: 'block', marginTop: 4, color: '#c0c6ce' }}>누적 {hits} / {CHARACTER_BAT_HITS}대 · 배트 기준</small></Html>}
    </group>
  </RigidBody>;
}
