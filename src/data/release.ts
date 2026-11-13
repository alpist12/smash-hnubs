export const RELEASE = {
  id: '2026.11.14-3',
  date: '2026.11.14',
  changes: [
    { title: '운석 무기 추가', detail: '6번 운석을 선택하고 지점을 지정해 보세요. 낙하 연출 뒤 강한 충격파가 퍼져요.' },
    { title: '운석 전용 연출', detail: '큰 운석을 따라가는 근접 장면부터 충돌까지, 효과음과 화면 연출을 강화했어요.' },
    { title: '캐릭터 음원 교체', detail: '새로 녹음한 음원에 맞춰 연타 음성을 6단계로 다시 구성했어요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
