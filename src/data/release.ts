export const RELEASE = {
  id: '2026.11.17-2',
  date: '2026.11.17',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: '레쿠쟈 · 용성군', detail: '8번 무기로 레쿠쟈를 소환해 12발 유성우를 떨어뜨려요. 낙하 지점을 따라 주변 가구가 파괴돼요.' },
    { title: '레쿠쟈 · 화룡점정', detail: '9번 무기로 상승 후 조준 지점에 급강하해요. 전용 카메라와 충돌 효과음·충격파를 추가했어요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
