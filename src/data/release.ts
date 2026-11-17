export const RELEASE = {
  id: '2026.11.17-3',
  date: '2026.11.17',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: '레쿠쟈 소환 연출 개선', detail: '우주에서 강림해 방송국을 한 바퀴 선회해요. 몸통·꼬리·팔을 직접 움직이는 기술별 모션을 적용했어요.' },
    { title: '용성군 · 화룡점정 강화', detail: '8발 대형 유성우와 에너지 충전을 추가했어요. 화룡점정은 급강하 뒤 섬광·충격파·파편과 묵직한 충돌음이 이어져요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
