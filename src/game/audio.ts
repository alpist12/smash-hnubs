import meteor from '../weapons/meteor';
import type { Finish } from '../data/types';

/**
 * Web Audio로 직접 합성하는 효과음 (파일 없음).
 * 노이즈 버스트·필터·사인 톤·자글자글한 크래클을 섞어 타격/파괴/폭발 소리를 만든다.
 */
let ctx: AudioContext | undefined, master: GainNode | undefined, noiseBuffer: AudioBuffer | undefined;
let recent: number[] = [];
let rayquazaNodes:AudioScheduledSourceNode[]=[];
export function stopRayquaza(){for(const node of rayquazaNodes){try{node.stop();}catch{/* 이미 끝난 노드 */}}rayquazaNodes=[];}
let nuclearNodes: AudioScheduledSourceNode[] = [];
export function stopNuclear() { for (const node of nuclearNodes) { try { node.stop(); } catch { /* 이미 끝난 노드 */ } } nuclearNodes = []; }
let meteorFallNodes: AudioScheduledSourceNode[] = [];
export function stopMeteorFall() { for (const node of meteorFallNodes) { try { node.stop(); } catch { /* 이미 끝난 노드 */ } } meteorFallNodes = []; }
export function audioContext(resume = true) {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      master = ctx.createGain(); master.gain.value = .8;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (resume && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return undefined; }
}
/** 동시에 너무 많은 소리가 겹치면 귀가 아프니 100ms에 12개까지만. */
function budget() {
  const now = performance.now(); recent = recent.filter(t => now - t < 100);
  if (recent.length >= 12) return false;
  recent.push(now); return true;
}
const vary = (n: number, k = .12) => n * (1 + (Math.random() * 2 - 1) * k);
function env(c: AudioContext, t: number, peak: number, attack: number, dur: number, to: AudioNode = master!) {
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(to); return g;
}
function noise(c: AudioContext, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, peak: number, attack = .005, q = .8, to?: AudioNode) {
  const src = c.createBufferSource(); src.buffer = noiseBuffer!;
  const filter = c.createBiquadFilter(); filter.type = type; filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, t); filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  src.connect(filter); filter.connect(env(c, t, peak, attack, dur, to));
  src.start(t, Math.random() * 1.5); src.stop(t + dur + .05); return src;
}
function tone(c: AudioContext, t: number, dur: number, type: OscillatorType, f0: number, f1: number, peak: number, attack = .004, to?: AudioNode) {
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  o.connect(env(c, t, peak, attack, dur, to)); o.start(t); o.stop(t + dur + .05); return o;
}
/** 자글자글 부서지는 잔소리: 짧은 고역 노이즈 틱을 흩뿌린다. */
function crackle(c: AudioContext, t: number, dur: number, count: number, freq: number, peak: number) {
  return Array.from({ length: count }, () => noise(c, t + Math.random() * dur, .012 + Math.random() * .03, 'bandpass', vary(freq, .4), vary(freq * .6, .3), peak * (.4 + Math.random() * .6), .001, 2.5));
}

type Src = AudioScheduledSourceNode;
let wet: GainNode | undefined, heavy: WaveShaperNode | undefined;
/** 궁극기 전용 버스: 4.5초 합성 잔향 + tanh 포화. 처음 쓸 때 한 번 만든다. */
function cinema(c: AudioContext) {
  if (!wet || !heavy) {
    const length = Math.floor(c.sampleRate * 4.5), ir = c.createBuffer(2, length, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3; }
    const verb = c.createConvolver(), back = c.createGain(); verb.buffer = ir; back.gain.value = .5; verb.connect(back); back.connect(master!);
    wet = c.createGain(); wet.connect(master!); wet.connect(verb);
    heavy = c.createWaveShaper(); const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 511.5 - 1) * 3.5);
    heavy.curve = curve; heavy.oversample = '4x'; heavy.connect(wet);
  }
  return { wet, heavy };
}
/** 대폭발: 고역 파열 + 서브 드롭 + 포화된 저역 굉음 + 뒤늦은 여진 + 잔해. size 1 = 운석. */
function boom(c: AudioContext, t: number, size: number): Src[] {
  const { wet, heavy } = cinema(c), d = 2.2 * size;
  const rumble = noise(c, t, d * 1.6, 'lowpass', 2600, 40, .9, .004, .7, heavy); rumble.loop = true;
  return [
    noise(c, t, .14, 'highpass', 3500, 900, .8, .001, .8, wet),
    tone(c, t, d, 'sine', 120, 24, 1, .003, heavy),
    tone(c, t, d * .7, 'triangle', 62, 22, .6, .006, heavy),
    rumble,
    noise(c, t + .05, d * .8, 'bandpass', 900, 120, .45, .02, 1, wet),
    tone(c, t + .35 * size, d * 1.2, 'sine', 46, 20, .5, .3, wet),
    ...crackle(c, t + .06, d, Math.round(30 * size), 1700, .3),
  ];
}
/** 충돌 직전까지 차오르다 뚝 끊기는 상승음: 열리는 노이즈 + 디튠 톱니 3겹. */
function riser(c: AudioContext, t: number, dur: number, from: number, to: number): Src[] {
  const { wet } = cinema(c), air = noise(c, t, dur, 'bandpass', 250, 5200, .38, dur * .92, 1.2, wet); air.loop = true;
  return [air, ...[-9, 0, 9].map(cents => tone(c, t, dur, 'sawtooth', from * 2 ** (cents / 1200), to * 2 ** (cents / 1200), .05, dur * .9, wet))];
}
/** 예고편식 '브라암': 저음 톱니 화음이 로우패스를 확 열었다 닫는다. */
function braam(c: AudioContext, t: number, dur: number, root: number): Src[] {
  const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 2;
  filter.frequency.setValueAtTime(140, t); filter.frequency.exponentialRampToValueAtTime(2200, t + .35); filter.frequency.exponentialRampToValueAtTime(180, t + dur);
  filter.connect(env(c, t, .32, .06, dur, cinema(c).heavy));
  return [.5, 1, 1.007, 1.5, 2].map(k => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(root * k, t); o.connect(filter); o.start(t); o.stop(t + dur + .05); return o; });
}
/** 용의 포효: 비브라토 톱니를 두 포먼트로 거르고 거친 숨과 저음을 얹는다. */
function roar(c: AudioContext, t: number, dur: number): Src[] {
  const { heavy } = cinema(c), voice = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), out = env(c, t, .55, .12, dur, heavy);
  voice.type = 'sawtooth'; voice.frequency.setValueAtTime(150, t); voice.frequency.exponentialRampToValueAtTime(240, t + dur * .25); voice.frequency.exponentialRampToValueAtTime(85, t + dur);
  lfo.frequency.value = 7; depth.gain.value = 14; lfo.connect(depth); depth.connect(voice.frequency);
  for (const [f, q] of [[650, 4], [1400, 6]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; voice.connect(b); b.connect(out); }
  for (const n of [voice, lfo]) { n.start(t); n.stop(t + dur + .05); }
  return [voice, lfo, noise(c, t, dur, 'bandpass', 900, 400, .35, .1, 1.5, heavy), tone(c, t, dur, 'sine', 75, 42, .35, .1, heavy)];
}
/** 머리 위를 스쳐 지나가는 바람. */
function whoosh(c: AudioContext, t: number, dur: number, peak: number): Src[] {
  const { wet } = cinema(c);
  return [noise(c, t, dur, 'bandpass', 300, 2800, peak, dur * .6, 1.4, wet), tone(c, t, dur, 'sine', 180, 60, peak * .35, dur * .6, wet)];
}
/** 공습 사이렌: 사각파를 삼각 LFO로 오르내린다. */
function siren(c: AudioContext, t: number, dur: number): Src[] {
  const o = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), filter = c.createBiquadFilter();
  o.type = 'square'; o.frequency.value = 720; lfo.type = 'triangle'; lfo.frequency.value = 1.4; depth.gain.value = 220;
  filter.type = 'lowpass'; filter.frequency.value = 1800;
  lfo.connect(depth); depth.connect(o.frequency); o.connect(filter); filter.connect(env(c, t, .12, .15, dur, cinema(c).wet));
  for (const n of [o, lfo]) { n.start(t); n.stop(t + dur); }
  return [o, lfo];
}

const on = () => { const c = audioContext(); return c && master && budget() ? c : undefined; };

/** 무기 발사·명중음. */
export function playImpact(type: string) {
  const c = ['meteor','draco','draco-finale','ascent'].includes(type) || type.startsWith('rayquaza-') || type.startsWith('nuke') ? audioContext() : on(); if (!c) return; const t = c.currentTime;
  switch (type) {
    case 'bat': // 딱! 나무 배트 타격 + 묵직한 쿵
      noise(c, t, .06, 'bandpass', vary(2400), 900, .9, .001, 1.4);
      tone(c, t, .16, 'triangle', vary(190), 70, .55);
      noise(c, t + .01, .25, 'lowpass', 900, 120, .35, .004);
      break;
    case 'rayquaza-draco': case 'rayquaza-ascent': {
      stopRayquaza(); const { wet } = cinema(c);
      const entry = noise(c, t + .8, 2.2, 'bandpass', 120, 1700, .35, 1.6, 1, wet); entry.loop = true;
      rayquazaNodes.push(...braam(c, t, 4.5, 41), tone(c, t, 8.8, 'sine', 38, 55, .3, 2, wet), entry);
      for (const at of [3.1, 5.3, 6.6]) rayquazaNodes.push(...whoosh(c, t + at, .9, .45));
      rayquazaNodes.push(...roar(c, t + 7.2, 2.2), ...braam(c, t + 7.25, 2.6, 55));
      if (type === 'rayquaza-draco') rayquazaNodes.push(
        ...riser(c, t + 8.8, 1.6, 110, 880),
        noise(c, t + 10.4, .9, 'highpass', 600, 6000, .45, .02, .8, wet), tone(c, t + 10.4, 1.2, 'sine', 300, 1800, .18, .02, wet),
        ...boom(c, t + 11.4, .7), ...braam(c, t + 11.4, 4.2, 30.9),
        ...whoosh(c, t + 11.2, 1.1, .5),
      );
      else rayquazaNodes.push(tone(c, t + 8.8, 2.8, 'sawtooth', 55, 110, .06, 1.2, wet), ...riser(c, t + 9.9, 1.4, 90, 520), ...roar(c, t + 11.15, .9), ...riser(c, t + 11.6, .85, 200, 1600));
      break;
    }
    case 'draco':
      boom(c, t, .75); break;
    case 'draco-finale':
      boom(c, t + .04, 1.5); braam(c, t, 3.4, 36.7); break;
    case 'ascent': {
      const { wet } = cinema(c);
      boom(c, t, 1.6); boom(c, t + .45, .9); braam(c, t + .02, 3.2, 36.7);
      tone(c, t, 2.4, 'sine', 1800, 900, .12, .005, wet); tone(c, t, 2.4, 'sine', 2700, 1350, .07, .005, wet); break;
    }
    case 'nuke-arm': {
      stopNuclear(); const { wet } = cinema(c);
      for (let i = 0; i < 3; i++) nuclearNodes.push(tone(c, t + i * .9, .3, 'square', 880, 660, .14, .01, wet));
      nuclearNodes.push(...siren(c, t, 2.75), ...braam(c, t + .1, 2.8, 36.7), ...riser(c, t + .55, 2.4, 50, 300), tone(c, t + 1, 1.95, 'sine', 1400, 500, .08, .3, wet));
      break;
    }
    case 'nuke': {
      stopNuclear(); const { wet } = cinema(c);
      const wind = noise(c, t + .4, 7, 'lowpass', 800, 60, .5, 1.2, .7, wet); wind.loop = true;
      nuclearNodes.push(...boom(c, t, 2.4), ...boom(c, t + 1.1, 1.2), ...braam(c, t + .05, 5, 27.5), wind);
      break;
    }
    case 'meteor':
      boom(c, t, 1.25); break;
    case 'meteor-fall': {
      stopMeteorFall(); const f = meteor.flight;
      const wind = noise(c, t, f, 'bandpass', 140, 2400, .35, f * .75, .7, cinema(c).wet); wind.loop = true;
      meteorFallNodes = [wind, ...braam(c, t, 2.4, 46), ...riser(c, t + .4, f - .4, 60, 360), tone(c, t, f, 'sine', 35, 210, .25, f * .7)];
      break;
    }
    case 'missile': // 콰광: 저역 폭발 + 길게 무너지는 잔향
      noise(c, t, 1.6, 'lowpass', 1400, 50, 1, .004);
      tone(c, t, .9, 'sine', 95, 28, 1, .003);
      noise(c, t, .12, 'highpass', 3000, 1500, .5, .001);
      crackle(c, t + .05, 1.2, 45, 1800, .35);
      break;
    case 'laser': // 지잉 레이저
      tone(c, t, .14, 'sawtooth', vary(1600, .05), 380, .22, .002);
      tone(c, t, .14, 'square', vary(800, .05), 190, .08, .002);
      noise(c, t, .1, 'highpass', 5000, 3000, .12, .002);
      break;
    case 'launch': // 슈우욱 미사일 발사
      noise(c, t, .7, 'bandpass', 500, 2600, .55, .03, 1.2);
      tone(c, t, .5, 'sawtooth', 140, 420, .08, .02);
      break;
  }
}

/** 맞아서 조각이 떨어질 때: 재질별 깨짐 소리. amount=조각 수 또는 세기(0~1). */
export function playCrack(finish: Finish, strength: number) {
  const c = on(); if (!c) return; const t = c.currentTime, k = Math.min(1, Math.max(.15, strength));
  if (finish === 'glass' || finish === 'screen') {
    noise(c, t, .35, 'highpass', 6000, 2500, .55 * k, .001);
    for (let i = 0; i < 5; i++) tone(c, t + Math.random() * .15, .12 + Math.random() * .2, 'sine', vary(3200, .4), vary(2600, .3), .09 * k, .001);
    crackle(c, t, .3, 14, 5000, .25 * k);
  } else if (finish === 'metal' || finish === 'white') {
    for (const f of [vary(420), vary(1130), vary(2310)]) tone(c, t, .35 + Math.random() * .25, 'sine', f, f * .97, .16 * k, .001);
    noise(c, t, .06, 'bandpass', 2800, 1400, .45 * k, .001, 2);
  } else if (finish === 'fabric' || finish === 'leather') {
    noise(c, t, .18, 'lowpass', 700, 150, .55 * k, .003);
    tone(c, t, .12, 'sine', 110, 55, .3 * k);
  } else if (finish === 'paper') {
    noise(c, t, .14, 'bandpass', 2000, 900, .35 * k, .002, 1.2);
    crackle(c, t, .12, 6, 2600, .2 * k);
  } else { // 나무·검은 플라스틱: 우지끈
    noise(c, t, .05, 'bandpass', vary(1800), 700, .7 * k, .001, 1.6);
    tone(c, t, .12, 'triangle', vary(160), 70, .35 * k);
    crackle(c, t + .02, .22, 10, 1500, .3 * k);
  }
}

/** 통째로 와르르 무너질 때. pieces=무너진 조각 수. */
export function playCrumble(finish: Finish, pieces: number) {
  const c = on(); if (!c) return; const t = c.currentTime, dur = Math.min(2.2, .5 + pieces * .03), k = Math.min(1, .35 + pieces * .02);
  noise(c, t, dur, 'lowpass', 900, 70, .7 * k, .01);
  tone(c, t, dur * .6, 'sine', 62, 30, .45 * k, .01);
  crackle(c, t, dur, Math.min(50, 10 + pieces), finish === 'glass' ? 4200 : 1600, .28 * k);
  if (finish === 'glass' || finish === 'screen') {
    // 쨍그랑: 날카로운 파열음 + 유리 조각들이 떨어지며 내는 맑은 울림
    noise(c, t, .6, 'highpass', 6500, 2600, .8, .001);
    noise(c, t, .08, 'bandpass', 3800, 2400, .7, .001, 1.5);
    for (let i = 0; i < 14; i++) tone(c, t + Math.random() * .7, .1 + Math.random() * .35, 'sine', vary(3800, .5), vary(3000, .4), .07 + Math.random() * .06, .001);
    crackle(c, t + .05, .9, 30, 5200, .3);
  }
}

/** 바닥에 떨어진 물건(카메라·마이크 등)이 부딪히는 소리. */
export function playThud(heavy: number) {
  const c = on(); if (!c) return; const t = c.currentTime;
  tone(c, t, .12, 'sine', vary(120), 50, .3 * Math.min(1, heavy));
  noise(c, t, .08, 'bandpass', vary(900), 300, .25 * Math.min(1, heavy), .001, 1.2);
}
