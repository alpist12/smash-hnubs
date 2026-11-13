export const RELEASE = {
  id: '2026.11.14-1',
  date: '2026.11.14',
  changes: [
    { title: '연타 음성을 8단계로 정리', detail: '마지막 감사합니다 구간을 제외했어요. 8단계까지 진행하며, 2초 쉬면 첫 단계로 돌아가요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
