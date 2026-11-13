import type { Finish } from '../data/types';

/**
 * Web Audio로 직접 합성하는 효과음 (파일 없음).
 * 노이즈 버스트·필터·사인 톤·자글자글한 크래클을 섞어 타격/파괴/폭발 소리를 만든다.
 */
let ctx: AudioContext | undefined, master: GainNode | undefined, noiseBuffer: AudioBuffer | undefined;
let recent: number[] = [];
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
function env(c: AudioContext, t: number, peak: number, attack: number, dur: number) {
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(master!); return g;
}
function noise(c: AudioContext, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, peak: number, attack = .005, q = .8) {
  const src = c.createBufferSource(); src.buffer = noiseBuffer!;
  const filter = c.createBiquadFilter(); filter.type = type; filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, t); filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  src.connect(filter); filter.connect(env(c, t, peak, attack, dur));
  src.start(t, Math.random() * 1.5); src.stop(t + dur + .05);
}
function tone(c: AudioContext, t: number, dur: number, type: OscillatorType, f0: number, f1: number, peak: number, attack = .004) {
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  o.connect(env(c, t, peak, attack, dur)); o.start(t); o.stop(t + dur + .05);
}
/** 자글자글 부서지는 잔소리: 짧은 고역 노이즈 틱을 흩뿌린다. */
function crackle(c: AudioContext, t: number, dur: number, count: number, freq: number, peak: number) {
  for (let i = 0; i < count; i++) noise(c, t + Math.random() * dur, .012 + Math.random() * .03, 'bandpass', vary(freq, .4), vary(freq * .6, .3), peak * (.4 + Math.random() * .6), .001, 2.5);
}

const on = () => { const c = audioContext(); return c && master && budget() ? c : undefined; };

/** 무기 발사·명중음. */
export function playImpact(type: string) {
  const c = on(); if (!c) return; const t = c.currentTime;
  switch (type) {
    case 'bat': // 딱! 나무 배트 타격 + 묵직한 쿵
      noise(c, t, .06, 'bandpass', vary(2400), 900, .9, .001, 1.4);
      tone(c, t, .16, 'triangle', vary(190), 70, .55);
      noise(c, t + .01, .25, 'lowpass', 900, 120, .35, .004);
      break;
    case 'bomb': case 'missile': // 콰광: 저역 폭발 + 길게 무너지는 잔향
      noise(c, t, 1.6, 'lowpass', 1400, 50, 1, .004);
      tone(c, t, .9, 'sine', 95, 28, 1, .003);
      noise(c, t, .12, 'highpass', 3000, 1500, .5, .001);
      crackle(c, t + .05, 1.2, type === 'bomb' ? 60 : 45, 1800, .35);
      break;
    case 'laser': // 지잉 레이저
      tone(c, t, .14, 'sawtooth', vary(1600, .05), 380, .22, .002);
      tone(c, t, .14, 'square', vary(800, .05), 190, .08, .002);
      noise(c, t, .1, 'highpass', 5000, 3000, .12, .002);
      break;
    case 'sonic': // 우우웅 음파
      tone(c, t, .7, 'sine', 140, 48, .7, .02);
      tone(c, t, .7, 'triangle', 280, 96, .25, .02);
      noise(c, t, .6, 'bandpass', 600, 150, .35, .03, 1.5);
      break;
    case 'launch': // 슈우욱 미사일 발사
      noise(c, t, .7, 'bandpass', 500, 2600, .55, .03, 1.2);
      tone(c, t, .5, 'sawtooth', 140, 420, .08, .02);
      break;
    case 'fuse': // 치익 도화선
      noise(c, t, .75, 'highpass', 4500, 6000, .18, .02);
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
