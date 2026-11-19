export const RELEASE = {
  id: '2026.11.20-3',
  date: '2026.11.20',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: '새 스킬 · 타노스 핑거스냅 (8)', detail: '스페이스 스톤 포털에서 타노스가 걸어 나와 손가락을 튕기면, 벽·가구 가리지 않고 방송국의 절반이 가루가 되어 흩어져요.' },
    { title: '핑거스냅 연출 강화', detail: '손가락을 튕기는 순간을 크게 보여 주고, 마지막에 사람들이 한 명씩 가루가 되어 사라져요. 쿨타임 없이 바로 다시 쓸 수 있어요.' },
    { title: '휴대폰 로딩 가속', detail: '캐릭터·타노스 모델을 압축해 내려받는 양을 약 21MB에서 3.6MB로 줄였어요. 받침이 사라진 물건은 이제 바닥으로 떨어져요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
