export const RELEASE = {
  id: '2026.11.14-4',
  date: '2026.11.14',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: '캐릭터 추가·행동 개선', detail: '유진 선배를 추가했어요. 두 캐릭터가 방을 랜덤으로 오가고, 배트에 맞으면 넘어졌다 일어나요. 누적 25대에서는 퇴장하며 얼굴 사진은 사용하지 않아요.' },
    { title: '시점·공간 배치 수정', detail: 'W/S로 상하, A/D로 좌우 시점을 바꿔요. 메인룸과 기술부스 경계 벽을 복구하고 겹친 책상·칸막이와 복사 위치를 수정했어요.' },
    { title: '타격·벽 파괴 개선', detail: '배트는 직접 맞은 물체만 손상시켜요. 벽은 배트 10대까지 구멍이 나지 않고 같은 구간에 25대가 누적되면 무너져요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
