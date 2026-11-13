export const RELEASE = {
  id: '2026.11.14-2',
  date: '2026.11.14',
  changes: [
    { title: '캐릭터 누적 타격 규칙', detail: '배트 기준 25대를 맞으면 캐릭터가 퇴장해요. 누적 횟수는 쉬어도 유지되며, 맵 복구로 다시 등장해요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
