import { VOICE_STAGES } from './hitCombo';
import { audioContext } from './audio';

let buffer: Promise<AudioBuffer> | undefined;
let source: AudioBufferSourceNode | undefined;
let generation = 0;
export function prepareCharacterVoice() {
  if (buffer) return buffer;
  const context = audioContext(false);
  if (!context) return undefined;
  buffer = fetch(`${import.meta.env.BASE_URL}characters/wonjae-39c7be9a.m4a`)
    .then(response => { if (!response.ok) throw new Error('음원을 불러오지 못했습니다.'); return response.arrayBuffer(); })
    .then(data => context.decodeAudioData(data));
  // 로딩 실패가 게임을 막지 않으며 다음 타격에서 재시도한다.
  void buffer.catch(() => { buffer = undefined; });
  return buffer;
}
export function stopCharacterVoice() {
  generation++;
  source?.stop(); source?.disconnect(); source = undefined;
}
export function playCharacterVoice(stage: number) {
  stopCharacterVoice();
  const context = audioContext(), pending = prepareCharacterVoice(), token = generation;
  if (!context || !pending) return;
  void pending.then(decoded => {
    if (token !== generation) return;
    const [start, end] = VOICE_STAGES[stage];
    const node = context.createBufferSource(), gain = context.createGain();
    node.buffer = decoded; gain.gain.value = .95;
    node.connect(gain); gain.connect(context.destination);
    source = node;
    node.onended = () => { node.disconnect(); gain.disconnect(); if (source === node) source = undefined; };
    node.start(0, start, Math.min(end, decoded.duration) - start);
  }).catch(() => { /* 다음 타격에서 재시도한다. */ });
}
