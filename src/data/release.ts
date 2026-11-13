export const RELEASE = {
  id: '2026.11.13-2',
  date: '2026.11.13',
  changes: [
    { title: '캐릭터 입체 모델 재작업', detail: '얼굴 윤곽과 눈매, 긴 머리와 회색 털모자를 입체로 다시 만들었어요.' },
    { title: '연타 음성 9단계', detail: '연속 타격하면 다음 대사로 진행하고, 2초 쉬면 첫 단계로 돌아가요.' },
    { title: '업데이트 알림 추가', detail: '새 버전의 변경 내용을 접속할 때 확인할 수 있어요.' },
  ],
} as const;
export const RELEASE_SEEN_KEY = 'hnubs-smash:release-seen:v1';
export function hasUnreadRelease(version: string = RELEASE.id) {
  try { return localStorage.getItem(RELEASE_SEEN_KEY) !== version; } catch { return true; }
}
export function markReleaseRead(version: string = RELEASE.id) {
  try { localStorage.setItem(RELEASE_SEEN_KEY, version); } catch { /* 저장이 차단되어도 현재 화면에서는 닫는다. */ }
}
