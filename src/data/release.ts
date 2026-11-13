export const RELEASE = {
  id: '2026.11.14-6',
  date: '2026.11.14',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: '유진 선배 복귀', detail: '유진 선배가 새 3D 모델로 돌아왔어요. 얼굴·목·손의 얼룩과 튀어나온 조각을 다듬었고, 원재 선배와 함께 방을 걸어 다녀요.' },
    { title: '넘어졌다 일어나기', detail: '두 선배 모두 배트에 맞으면 쓰러졌다가 스스로 일어나 다시 걸어요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
