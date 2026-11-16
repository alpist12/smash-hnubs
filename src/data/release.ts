export const RELEASE = {
  id: '2026.11.16-2',
  date: '2026.11.16',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: 'TOP 3 미니 랭킹', detail: '화질 카드 아래에서 상위 3명의 닉네임과 점수를 확인해요. 반투명 패널로 작게 표시하고 기록이 갱신되면 반영해요.' },
    { title: '무기별 피해 범위', detail: '조준 위치에 각 무기의 피해 반경을 표시해요. 배트는 물체 하나, 핵폭탄은 방송국 전체를 대상으로 해요.' },
    { title: '부스 내부 벽 복구', detail: '기술부스와 아나부스 사이 벽·관찰창이 카메라 시점에 따라 숨겨지던 조건을 제거했어요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
