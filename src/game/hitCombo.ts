export const COMBO_GAP = 2000;
// 원본 녹음의 0.4초 이상 쉼을 기준으로 나눈 구간(초). 앞뒤 여백을 남긴다.
export const VOICE_STAGES = [
  [.56, 1.24], [1.72, 2.52], [3.72, 5.29],
  [5.96, 7.37], [8.51, 9.06], [10.26, 11.63],
] as const;
export class HitCombo {
  stage = -1;
  lastHit = -Infinity;
  playingUntil = -Infinity;
  reset() { this.stage = -1; this.lastHit = -Infinity; this.playingUntil = -Infinity; }
  expire(now: number) {
    if (this.stage < 0 || now < this.lastHit + COMBO_GAP) return false;
    this.reset(); return true;
  }
  hit(now: number) {
    this.expire(now);
    this.lastHit = now;
    // 빠른 연타는 현재 대사를 끝까지 들려준 뒤 다음 타격에서 한 단계 진행한다.
    if (now < this.playingUntil) return null;
    this.stage = Math.min(this.stage + 1, VOICE_STAGES.length - 1);
    const [start, end] = VOICE_STAGES[this.stage];
    this.playingUntil = now + (end - start) * 1000;
    return this.stage;
  }
}

