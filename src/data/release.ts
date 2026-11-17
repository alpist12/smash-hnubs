export const RELEASE = {
  id: '2026.11.17-1',
  date: '2026.11.17',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: '핵폭탄 자동 복구 안내', detail: '폭발 후 10초 뒤 맵을 복구해요. 그대로 두기로 취소하거나 지금 복구하기로 바로 복구할 수 있어요.' },
    { title: '선배별 이동 패턴', detail: '시작하자마자 부스로 몰리지 않도록 출발 시간과 휴식·목적지를 나눴어요. 원재 선배는 메인룸↔기술부스, 유진 선배는 메인룸↔아나부스를 65% 확률로 선택해요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
