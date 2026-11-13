export const COMBO_GAP = 2000;
// 원본 녹음의 0.4초 이상 쉼을 기준으로 나눈 구간(초). 앞뒤 여백을 남긴다.
export const VOICE_STAGES = [
  [1.19, 1.71], [2.38, 3.29], [4.25, 4.93], [5.41, 6.21],
  [7.41, 8.98], [9.65, 11.06], [12.2, 12.75], [13.95, 15.32],
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

