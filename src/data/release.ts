export const RELEASE = {
  id: '2026.11.16-1',
  date: '2026.11.16',
  // 한 배포분만 요약한다. 다음 배포 때 이전 항목에 덧붙이지 말고 교체한다.
  changes: [
    { title: '핵폭탄 투하', detail: '7번 무기로 경고음과 폭탄 추적 카메라 뒤 방송국에 꽂혀 폭발해요. 섬광·충격파·버섯구름을 추가했어요.' },
    { title: '온라인 랭킹', detail: '닉네임으로 TOP 20에 등록하고, 다시 등록하면 기존 점수를 갱신해요. 핵폭탄을 사용한 판은 자동으로 랭킹에서 제외해요.' },
    { title: '운석 첫 클릭 수정', detail: '배트를 치다가 운석으로 바꿔도 바로 발사할 수 있어요. 무기별 대기시간을 분리하고 남은 시간을 표시해요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
