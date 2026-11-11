let audio: AudioContext | undefined;
export function playImpact(type: string) {
  try {
    audio ??= new AudioContext(); void audio.resume();
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.connect(gain); gain.connect(audio.destination);
    const t = audio.currentTime;
    osc.type = type === 'laser' || type === 'launch' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(type === 'sonic' ? 180 : type === 'bomb' || type === 'missile' ? 70 : type === 'launch' ? 520 : 240, t);
    osc.frequency.exponentialRampToValueAtTime(type === 'launch' ? 140 : 30, t + .22);
    gain.gain.setValueAtTime(.11, t); gain.gain.exponentialRampToValueAtTime(.001, t + .25);
    osc.start(); osc.stop(t + .26);
  } catch { /* 사운드 장치가 없어도 게임은 계속 실행한다. */ }
}
