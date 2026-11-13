import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { Group, Quaternion, Vector3 } from 'three';
import { useGame } from '../game/store';
import { HitCombo, VOICE_STAGES } from '../game/hitCombo';
import { CharacterHealth, CHARACTER_BAT_HITS } from '../game/characterHealth';
import { playCharacterVoice, prepareCharacterVoice, stopCharacterVoice } from '../game/characterVoice';
import { aim, attack, targets } from '../physics/attacks';
import type { V3 } from '../data/types';
import { CharacterView } from './CharacterView';
import { CHARACTER_MASS, CHARACTER_EXIT_DELAY, CHARACTER_RECOVER_DELAY, kickCharacter, steadyCharacter } from '../physics/characterMotion';

import { CharacterWander } from '../physics/characterWander';

import type { CharacterProfile } from '../data/characters';

const UPRIGHT = new Quaternion(), standing = new Quaternion();
const STAND_UP_RATE = 3.2; // 클수록 빨리 일어난다(약 1초에 거의 다 섬)

export function Character({ profile }: { profile: CharacterProfile }) {
  const ID = profile.id;
  const body = useRef<RapierRigidBody>(null), view = useRef<Group>(null);
  const wander = useRef(new CharacterWander());
  const combo = useRef(new HitCombo()), flinch = useRef(0);
  const health = useRef(new CharacterHealth()), recoverAt = useRef(0), walkingLocked = useRef(false);
  const [stage, setStage] = useState(-1), [hits, setHits] = useState(0), [gone, setGone] = useState(false), [fallen, setFallen] = useState(false);
  const sound = useGame(s => s.sound);
  useEffect(() => {
    if (profile.voice) void prepareCharacterVoice();
    targets.set(ID, {
      facing: () => wander.current.heading,
      point: () => {
        const rb = body.current;
        if (!rb) return new Vector3(profile.pos[0], profile.pos[1] + 1.1, profile.pos[2]);
        const p = rb.translation(), q = rb.rotation();
        return new Vector3(0, 1.1, 0).applyQuaternion(q).add(p);
      },
      hit: (amount, impulse, _point, speed, fromContact, weapon) => {
        if (health.current.gone || fromContact || amount < 1) return;
        const before = health.current.batHits, now = performance.now();
        const down = health.current.hit(amount);
        const stumble = weapon === 'bat' || Math.floor(health.current.batHits / 5) > Math.floor(before / 5) || (speed ?? 0) > 3 || now < recoverAt.current;
        if (!down && stumble) recoverAt.current = now + CHARACTER_RECOVER_DELAY;
        setHits(health.current.batHits);
        flinch.current = now; wander.current.speed = 0;
        if (body.current) {
          body.current.setEnabledRotations(true, false, true, true); walkingLocked.current = false;
          kickCharacter(body.current, impulse, speed, down || stumble);
        }
        if (down) {
          targets.delete(ID); combo.current.reset(); if (profile.voice) stopCharacterVoice();
          if (aim.target === ID) { aim.target = ''; aim.holding = false; useGame.setState({ hovered: '' }); }
          setFallen(true); setStage(-1);
          useGame.setState({ hint: `${profile.name}가 쓰러졌습니다. 잠시 후 퇴장하며 맵 복구로 다시 등장합니다.` });
          return;
        }
        if (aim.target === ID) useGame.setState({ hovered: `${profile.name} · 누적 ${health.current.batHits} / ${CHARACTER_BAT_HITS}대 (배트 기준)` });
        const next = combo.current.hit(now);
        setStage(combo.current.stage);
        if (profile.voice && next !== null && useGame.getState().sound) playCharacterVoice(next);
      },
    });
    const clear = () => { combo.current.reset(); setStage(-1); if (profile.voice) stopCharacterVoice(); };
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', visibility);
    return () => { targets.delete(ID); if (profile.voice) stopCharacterVoice(); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility); };
  }, [profile, ID]);
  useEffect(() => { if (profile.voice && !sound) stopCharacterVoice(); }, [sound, profile.voice]);
  useEffect(() => {
    if (!fallen) return;
    const timer = setTimeout(() => setGone(true), CHARACTER_EXIT_DELAY);
    return () => clearTimeout(timer);
  }, [fallen]);
  useEffect(() => {
    if (!gone) return;
    const frame = requestAnimationFrame(() => body.current?.setEnabled(false));
    return () => cancelAnimationFrame(frame);
  }, [gone]);
  useBeforePhysicsStep(world => {
    const rb = body.current;
    if (!rb || health.current.gone) return;
    const now = performance.now(), q = rb.rotation();
    if (recoverAt.current && now >= recoverAt.current) { recoverAt.current = 0; rb.wakeUp(); }
    const recovering = now >= recoverAt.current;
    const upright = 1 - 2 * (q.x * q.x + q.z * q.z) > .997;
    const canWalk = recovering && now - flinch.current > 1600 && upright;
    if (canWalk && !walkingLocked.current) {
      // 남은 회전 속도를 지우지 않으면 회전을 잠근 뒤에도 그 속도로 계속 기울어 걷다가 다시 눕는다.
      rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      rb.setEnabledRotations(false, false, false, true); walkingLocked.current = true;
    }
    wander.current.step(world, rb, world.timestep, now, canWalk);
    if (recovering && !walkingLocked.current) {
      if (1 - 2 * (q.x * q.x + q.z * q.z) < .997 && now - flinch.current > 300) {
        // 맞고 0.3초 흔들린 뒤에는 스프링 대신 발을 축으로 몸을 직접 일으켜 세운다(가구에 기대거나 마찰이 커도 반드시 일어남).
        standing.set(q.x, q.y, q.z, q.w).slerp(UPRIGHT, 1 - Math.exp(-world.timestep * STAND_UP_RATE));
        rb.setRotation(standing, true); rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      } else if (!rb.isSleeping()) steadyCharacter(rb, world.timestep, now - flinch.current > 300);
    }
  });
  useFrame(() => {
    if (health.current.gone) return;
    if (view.current && walkingLocked.current) view.current.rotation.y = wander.current.heading;
    const now = performance.now();
    if (combo.current.expire(now)) { setStage(-1); if (profile.voice) stopCharacterVoice(); }
  });
  function onAim(e: ThreeEvent<PointerEvent>) {
    if (health.current.gone) return;
    e.stopPropagation(); aim.point = e.point.toArray() as V3; aim.target = ID;
    if (e.face) aim.normal = e.face.normal.clone().transformDirection(e.object.matrixWorld).toArray() as V3;
    useGame.setState({ hovered: `${profile.name} · 누적 ${hits} / ${CHARACTER_BAT_HITS}대 (배트 기준)` });
  }
  // 퇴장 때 물리 바디를 즉시 삭제하지 않고 비활성화해 Rapier 단계 중 해제를 피한다.
  return <RigidBody ref={body} name={ID} position={profile.pos} colliders={false} linearDamping={1.8} angularDamping={.65} friction={.7} restitution={.05} ccd>
    <CapsuleCollider args={[.65, .28]} position={[0, .94, 0]} mass={CHARACTER_MASS} collisionGroups={0x0001ffff} />
    <group ref={view} visible={!gone} name={ID} onPointerMove={onAim} onPointerOver={onAim}
      onPointerOut={() => { if (aim.target === ID) { aim.target = ''; useGame.setState({ hovered: '' }); } }}
      onPointerDown={e => { onAim(e); if (!health.current.gone && e.button === 0 && useGame.getState().weapon === 'laser') { aim.holding = true; attack(aim.point, ID); } }}
      onClick={e => { e.stopPropagation(); if (!health.current.gone && e.button === 0 && e.delta <= 5 && useGame.getState().weapon !== 'laser') attack(e.point.toArray() as V3, ID); }}>
      {!gone && <CharacterView profile={profile} motion={wander} />}
      {!gone && fallen && <Html center position={[0, 1.1, 0]} style={{ pointerEvents: 'none', whiteSpace: 'nowrap', background: '#1b2029ed', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 14 }}>누적 {CHARACTER_BAT_HITS}대 · 쓰러짐</Html>}
      {!gone && !fallen && stage >= 0 && <Html center position={[0, 2.18, 0]} style={{ pointerEvents: 'none', whiteSpace: 'nowrap', background: '#1b2029ed', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 14 }}>{profile.voice ? `연타 ${stage + 1} / ${VOICE_STAGES.length}` : profile.name}<small style={{ display: 'block', marginTop: 4, color: '#c0c6ce' }}>누적 {hits} / {CHARACTER_BAT_HITS}대 · 배트 기준</small></Html>}
    </group>
  </RigidBody>;
}
