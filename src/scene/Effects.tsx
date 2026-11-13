import { GRAPHICS } from './graphics';
import { Meteor } from './Meteor';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, PointLight, Quaternion, Vector3 } from 'three';
import type { Effect, V3 } from '../data/types';
import { useGame } from '../game/store';
import { WEAPONS } from '../weapons/config';
import { aim, tickAttacks } from '../physics/attacks';

const UP = new Vector3(0, 1, 0);
function effectColor(effect: Effect) {
  if (effect.type === 'fuse') return '#e8a86b';
  if (effect.type === 'rocket') return '#ff7a3d';
  if (effect.type === 'shatter' || effect.type === 'dust') return effect.colors?.[0] ?? '#9a9a90';
  return WEAPONS[effect.type].color;
}
/** 미사일 비행: from → point 포물선, 몸체는 진행 방향을 향하고 뒤로 연기 꼬리. */
function Rocket({ effect }: { effect: Effect }) {
  const body = useRef<Group>(null), trail = useRef<Group>(null);
  const from = new Vector3(...(effect.from ?? effect.point)), to = new Vector3(...effect.point), duration = effect.duration ?? .6;
  const arc = Math.min(2.2, from.distanceTo(to) * .12);
  const at = (t: number) => from.clone().lerp(to, t).add(new Vector3(0, Math.sin(Math.PI * t) * arc, 0));
  useFrame(() => {
    const t = Math.min(1, (performance.now() - effect.born) / 1000 / duration);
    if (body.current) {
      body.current.visible = t < 1;
      const p = at(t), next = at(Math.min(1, t + .02));
      body.current.position.copy(p);
      if (next.distanceToSquared(p) > 1e-8) body.current.quaternion.setFromUnitVectors(UP, next.sub(p).normalize());
    }
    if (trail.current) trail.current.children.forEach((puff, i) => {
      const age = i * .045, pt = Math.max(0, t - age);
      puff.position.copy(at(pt)); puff.visible = t < 1 + age * 2 && pt > 0;
      const fade = Math.max(.01, 1 - (t - pt) * 6);
      puff.scale.setScalar(.05 + (1 - fade) * .12);
      ((puff as Mesh).material as MeshBasicMaterial).opacity = fade * .6;
    });
  });
  return <>
    <group ref={body}>
      <mesh castShadow><cylinderGeometry args={[.045, .055, .42, 10]} /><meshStandardMaterial color="#e7e5dc" metalness={.4} roughness={.4} /></mesh>
      <mesh position={[0, .26, 0]}><coneGeometry args={[.045, .12, 10]} /><meshStandardMaterial color="#d8492f" /></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.sin(i * Math.PI / 2) * .06, -.17, Math.cos(i * Math.PI / 2) * .06]} rotation={[0, i * Math.PI / 2, 0]}><boxGeometry args={[.008, .1, .07]} /><meshStandardMaterial color="#d8492f" /></mesh>)}
      <mesh position={[0, -.27, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[.05, .18, 8]} /><meshBasicMaterial color="#ffc46b" /></mesh>
    </group>
    <group ref={trail}>{Array.from({ length: 12 }, (_, i) => <mesh key={i}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={i < 2 ? '#ffb15e' : '#d6d1c6'} transparent opacity={.5} depthWrite={false} /></mesh>)}</group>
  </>;
}
/** 부서질 때 튀는 작은 조각(시각 효과 전용): 포물선 + 회전 + 바닥에서 멈춤. */
function Shatter({ effect }: { effect: Effect }) {
  const group = useRef<Group>(null);
  const count = GRAPHICS[useGame.getState().quality].chips;
  const chips = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = i * 2.39996 + effect.id, speed = (1.6 + (i * 53 % 17) / 6) * (.6 + effect.radius * .5);
    return { v: new Vector3(Math.cos(a) * speed, 2.2 + (i * 31 % 13) / 4, Math.sin(a) * speed), spin: new Vector3((i % 5) - 2, (i % 3) - 1, (i % 4) - 1.5).multiplyScalar(6), size: .025 + (i * 17 % 9) / 220 * Math.min(1.4, effect.radius + .4), color: effect.colors![i % effect.colors!.length] };
  }), [count, effect]);
  useFrame(() => {
    const t = (performance.now() - effect.born) / 1000;
    if (!group.current) return;
    group.current.visible = t < 1.5;
    group.current.children.forEach((chip, i) => {
      const c = chips[i], y = Math.max(.02 - effect.point[1], c.v.y * t - 4.9 * t * t);
      const landed = y <= .02 - effect.point[1], tt = landed ? Math.min(t, (c.v.y + Math.sqrt(c.v.y ** 2 + 19.6 * Math.max(0, effect.point[1]))) / 9.8) : t;
      chip.position.set(c.v.x * tt * .55, y, c.v.z * tt * .55);
      chip.rotation.set(c.spin.x * tt, c.spin.y * tt, c.spin.z * tt);
      chip.scale.setScalar(t > 1.1 ? Math.max(.001, 1 - (t - 1.1) / .4) : 1);
    });
  });
  return <group ref={group} position={effect.point}>{chips.map((c, i) => <mesh key={i} castShadow scale={1}><tetrahedronGeometry args={[c.size, 0]} /><meshStandardMaterial color={c.color} roughness={.8} flatShading /></mesh>)}</group>;
}
/** 타격 가루: 부품 색의 작은 입자가 퍼졌다가 천천히 가라앉으며 사라진다. */
function Dust({ effect }: { effect: Effect }) {
  const group = useRef<Group>(null), count = GRAPHICS[useGame.getState().quality].dust;
  const motes = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = i * 2.39996 + effect.id * .7, sp = (.35 + (i * 37 % 11) / 14) * effect.radius;
    return { v: new Vector3(Math.cos(a) * sp, .25 + (i * 13 % 7) / 9, Math.sin(a) * sp), size: .012 + (i * 29 % 9) / 400, color: i % 3 === 0 ? '#d9d4c8' : effect.colors![i % effect.colors!.length] };
  }), [count, effect]);
  useFrame(() => {
    const t = (performance.now() - effect.born) / 1000;
    if (!group.current) return;
    group.current.visible = t < 1.1;
    group.current.children.forEach((mote, i) => {
      const m = motes[i], drag = 1 - Math.exp(-t * 3);
      mote.position.set(m.v.x * drag / 3, m.v.y * drag / 3 - .35 * t * t, m.v.z * drag / 3);
      mote.scale.setScalar(Math.max(.01, 1 + t * 1.5));
      ((mote as Mesh).material as MeshBasicMaterial).opacity = Math.max(0, .75 * (1 - t / 1.1));
    });
  });
  return <group ref={group} position={effect.point}>{motes.map((m, i) => <mesh key={i}><icosahedronGeometry args={[m.size, 0]} /><meshBasicMaterial color={m.color} transparent opacity={.75} depthWrite={false} /></mesh>)}</group>;
}
function Impact({ effect }: { effect: Effect }) {
  const camera = useThree(state => state.camera);
  const group = useRef<Group>(null), ring = useRef<Mesh>(null), cloud = useRef<Group>(null), flash = useRef<Mesh>(null), sparks = useRef<Group>(null), burst = useRef<Group>(null);
  const color = effectColor(effect), big = effect.type === 'bomb' || effect.type === 'missile' || effect.type === 'meteor';
  useFrame(() => {
    const elapsed = (performance.now() - effect.born) / 1000;
    const duration = effect.type === 'meteor' ? 1.7 : effect.type === 'fuse' ? .8 : effect.type === 'laser' ? .35 : .8;
    if (!group.current) return;
    group.current.visible = elapsed < duration;
    if (sparks.current) sparks.current.children.forEach((spark, i) => {
      const a = i * 2.39996 + effect.id, v = new Vector3(Math.cos(a) * 1.4, 1.6 + (i % 3) * .5, Math.sin(a) * 1.4), tt = elapsed;
      spark.position.set(v.x * tt, v.y * tt - 4.9 * tt * tt, v.z * tt); spark.lookAt(spark.position.clone().add(new Vector3(v.x, v.y - 9.8 * tt, v.z)));
      spark.scale.setScalar(Math.max(.01, 1 - tt / .35));
    });
    if (burst.current) {
      // 카메라를 향한 '퍽' 별 모양: 빠르게 커졌다 사라진다.
      const bt = Math.min(1, elapsed / .22); burst.current.scale.setScalar(.4 + bt * 1.1);
      burst.current.quaternion.copy(camera.quaternion);
      burst.current.children.forEach((line, i) => { ((line as Mesh).material as MeshBasicMaterial).opacity = (1 - bt) * .9; line.position.set(Math.cos(i * Math.PI / 4) * .14, Math.sin(i * Math.PI / 4) * .14, 0); });
    }
    if (effect.type === 'fuse') { group.current.scale.setScalar(1 + Math.sin(elapsed * 30) * .1); return; }
    const t = elapsed / duration;
    if (ring.current) { ring.current.scale.setScalar(Math.max(.05, t * effect.radius)); (ring.current.material as MeshBasicMaterial).opacity = (1 - t) * .75; }
    if (flash.current) { const ft = Math.min(1, elapsed / .35); flash.current.scale.setScalar(Math.max(.01, effect.radius * .55 * Math.sqrt(ft))); (flash.current.material as MeshBasicMaterial).opacity = Math.max(0, 1 - ft) * .85; }
    if (cloud.current) cloud.current.children.forEach((particle, index) => {
      const a = index * 2.39996;
      particle.position.set(Math.cos(a) * t * effect.radius * .6, Math.sin(index * 13.7) * .2 + t * (index % 3 + 1) * (big ? .45 : .25), Math.sin(a) * t * effect.radius * .6);
      particle.scale.setScalar(Math.max(.01, (1 - t) * (big ? .09 : .045)));
    });
  });
  return <group ref={group} position={effect.point}>
    {effect.type === 'fuse' ? <group position={[0, .12, 0]}>
      <mesh castShadow><sphereGeometry args={[.12, 12, 8]} /><meshStandardMaterial color="#30363a" /></mesh>
      <mesh position={[.04, .15, 0]}><sphereGeometry args={[.027, 6, 6]} /><meshBasicMaterial color="#f6b15d" /></mesh>
    </group> : <>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, .035, 0]}><ringGeometry args={[.93, 1, 48]} /><meshBasicMaterial color={color} transparent opacity={.8} depthWrite={false} side={2} /></mesh>
      {big && <mesh ref={flash}><sphereGeometry args={[1, 20, 14]} /><meshBasicMaterial color="#ffd08a" transparent opacity={.8} depthWrite={false} /></mesh>}
      <group ref={cloud}>{Array.from({ length: big || effect.type === 'sonic' ? 18 : 6 }, (_, i) => <mesh key={i}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color={i % 3 ? '#c1b8a3' : color} /></mesh>)}</group>
      {effect.type === 'laser' && <group ref={sparks}>{Array.from({ length: 7 }, (_, i) => <mesh key={i}><boxGeometry args={[.008, .008, .07]} /><meshBasicMaterial color={i % 2 ? '#ffd29a' : '#ff8a5c'} toneMapped={false} /></mesh>)}</group>}
      {effect.type === 'bat' && <group ref={burst}>{Array.from({ length: 8 }, (_, i) => <mesh key={i} rotation={[0, 0, i * Math.PI / 4]}><boxGeometry args={[.22, .022, .01]} /><meshBasicMaterial color="#fff6e0" transparent opacity={.9} depthWrite={false} /></mesh>)}</group>}
    </>}
  </group>;
}
function EffectView({ effect }: { effect: Effect }) {
  if (effect.type === 'rocket') return <Rocket effect={effect} />;
  if (effect.type === 'shatter') return <Shatter effect={effect} />;
  if (effect.type === 'dust') return <Dust effect={effect} />;
  return <Impact effect={effect} />;
}
const SWING = { from: -1.5, to: 1.1, duration: .26 };
/** 야구 배트: 손잡이(테이프)·노브·가늘어지는 원목 배럴. 타격점 앞에서 가로로 휘두르고 흰 궤적을 남긴다. */
function BatSwing({ effects }: { effects: Effect[] }) {
  const pivot = useRef<Group>(null), swing = useRef<Group>(null), trail = useRef<Mesh>(null);
  const hands = useRef(new Vector3()), lastId = useRef(-1);
  useFrame(({ camera }) => {
    const recent = [...effects].reverse().find(e => e.type === 'bat');
    const t = recent ? (performance.now() - recent.born) / 1000 / SWING.duration : 9;
    if (!pivot.current || !swing.current || !trail.current) return;
    pivot.current.visible = t < 1.25;
    if (!recent || t >= 1.25) return;
    if (recent.id !== lastId.current) {
      lastId.current = recent.id;
      const hit = new Vector3(...recent.point), toCam = camera.position.clone().sub(hit); toCam.y = 0; toCam.normalize();
      hands.current.copy(hit).addScaledVector(toCam, .62).add(new Vector3(0, .32, 0));
      pivot.current.position.copy(hands.current); pivot.current.lookAt(hit);
    }
    // 빠르게 휘두르고(ease-out) 마지막에 살짝 멈춤.
    const k = Math.min(1, t), eased = 1 - (1 - k) ** 3;
    swing.current.rotation.set(-.18 + eased * .25, SWING.from + (SWING.to - SWING.from) * eased, (1 - eased) * .5);
    const m = trail.current.material as MeshBasicMaterial; m.opacity = Math.max(0, .55 * Math.sin(Math.min(1, t * 1.15) * Math.PI));
  });
  return <group ref={pivot} visible={false}>
    <group ref={swing}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, .02, 0]}><cylinderGeometry args={[.03, .03, .035, 14]} /><meshStandardMaterial color="#2b2d30" /></mesh>
        <mesh position={[0, .16, 0]}><cylinderGeometry args={[.017, .02, .26, 12]} /><meshStandardMaterial color="#1f2124" roughness={.9} /></mesh>
        <mesh position={[0, .5, 0]} castShadow><cylinderGeometry args={[.045, .019, .44, 16]} /><meshStandardMaterial color="#c9965a" roughness={.45} /></mesh>
        <mesh position={[0, .78, 0]} castShadow><cylinderGeometry args={[.047, .045, .14, 16]} /><meshStandardMaterial color="#c9965a" roughness={.45} /></mesh>
        <mesh position={[0, .855, 0]}><sphereGeometry args={[.047, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#b9874e" /></mesh>
        <mesh position={[0, .62, .001]}><cylinderGeometry args={[.0455, .0455, .05, 16]} /><meshStandardMaterial color="#8e2f2a" /></mesh>
      </group>
    </group>
    <mesh ref={trail} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.42, .9, 40, 1, SWING.from - Math.PI / 2, SWING.to - SWING.from]} /><meshBasicMaterial color="#ffffff" transparent opacity={0} side={2} depthWrite={false} /></mesh>
  </group>;
}
/** 레이저: 하얀 코어 + 붉은 발광층, 총구 빛, 타격점의 빛과 열기. */
function LaserBeam() {
  const weapon = useGame(s => s.weapon);
  const core = useRef<Mesh>(null), glow = useRef<Mesh>(null), muzzle = useRef<Mesh>(null), hit = useRef<Group>(null), light = useRef<PointLight>(null);
  useFrame(({ camera }) => {
    const on = weapon === 'laser' && aim.holding, now = performance.now() / 1000;
    for (const obj of [core.current, glow.current, muzzle.current, hit.current]) if (obj) obj.visible = on;
    if (light.current) light.current.intensity = on ? 2.2 + Math.sin(now * 40) * .6 : 0;
    if (!on || !core.current || !glow.current || !muzzle.current || !hit.current) return;
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1), forward = new Vector3(); camera.getWorldDirection(forward);
    const start = camera.position.clone().addScaledVector(right, .45).addScaledVector(up, -.35).addScaledVector(forward, .9), end = new Vector3(...aim.point);
    const mid = start.clone().add(end).multiplyScalar(.5), length = start.distanceTo(end), q = new Quaternion().setFromUnitVectors(UP, end.clone().sub(start).normalize());
    const flicker = 1 + Math.sin(now * 55) * .18 + Math.sin(now * 23) * .1;
    for (const beam of [core.current, glow.current]) { beam.position.copy(mid); beam.quaternion.copy(q); }
    core.current.scale.set(flicker, length, flicker); glow.current.scale.set(flicker * 1.2, length, flicker * 1.2);
    muzzle.current.position.copy(start); muzzle.current.scale.setScalar(.9 + Math.sin(now * 37) * .25);
    hit.current.position.copy(end); hit.current.scale.setScalar(flicker); hit.current.rotation.y = now * 6;
    light.current?.position.copy(end).add(new Vector3(0, .08, 0));
  });
  return <>
    <mesh ref={core} visible={false}><cylinderGeometry args={[.006, .006, 1, 8]} /><meshBasicMaterial color="#fff4ea" toneMapped={false} /></mesh>
    <mesh ref={glow} visible={false}><cylinderGeometry args={[.028, .028, 1, 12]} /><meshBasicMaterial color="#ff4a33" transparent opacity={.32} blending={AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    <mesh ref={muzzle} visible={false}><sphereGeometry args={[.035, 12, 8]} /><meshBasicMaterial color="#ff7a5c" transparent opacity={.85} blending={AdditiveBlending} depthWrite={false} /></mesh>
    <group ref={hit} visible={false}>
      <mesh><sphereGeometry args={[.045, 12, 8]} /><meshBasicMaterial color="#fff1dc" toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[.11, 14, 10]} /><meshBasicMaterial color="#ff5236" transparent opacity={.35} blending={AdditiveBlending} depthWrite={false} /></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} rotation={[0, i * Math.PI / 4, Math.PI / 2]}><planeGeometry args={[.32, .012]} /><meshBasicMaterial color="#ffb08a" transparent opacity={.6} blending={AdditiveBlending} side={2} depthWrite={false} /></mesh>)}
    </group>
    <pointLight ref={light} color="#ff5a3c" intensity={0} distance={2.4} decay={2} />
  </>;
}
export function Effects() {
  const effects = useGame(s => s.effects), cursor = useRef<Group>(null);
  const weapon = useGame(s => s.weapon);
  const lastCleanup = useRef(0);
  useFrame(({ camera }) => {
    aim.camera = camera.position.toArray() as V3;
    tickAttacks();
    if (cursor.current) {
      const normal = new Vector3(...aim.normal).normalize();
      cursor.current.position.lerp(new Vector3(...aim.point).addScaledVector(normal, .02), .4); cursor.current.visible = !!aim.target && !useGame.getState().meteor;
      cursor.current.quaternion.slerp(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal), .35);
    }
    if (performance.now() - lastCleanup.current > 1000) {
      lastCleanup.current = performance.now(); const state = useGame.getState(), now = performance.now();
      const debris = state.debris.filter(d => now - d.born < GRAPHICS[state.quality].lifetime);
      const keep = state.effects.filter(e => now - e.born < (e.type === 'shatter' || e.type === 'meteor' ? 1900 : 1200));
      if (debris.length !== state.debris.length || keep.length !== state.effects.length) useGame.setState({ debris, effects: keep });
    }
  });
  return <>
    {effects.map(effect => <EffectView key={effect.id} effect={effect} />)}
    <group ref={cursor}>
      <mesh><ringGeometry args={[.17, .187, 32]} /><meshBasicMaterial color={WEAPONS[weapon].color} transparent opacity={.85} depthTest={false} side={2} /></mesh>
      <mesh><circleGeometry args={[.035, 16]} /><meshBasicMaterial color={WEAPONS[weapon].color} transparent opacity={.85} depthTest={false} side={2} /></mesh>
    </group>
    <BatSwing effects={effects} />
    <LaserBeam />
    <Meteor />
  </>;
}
