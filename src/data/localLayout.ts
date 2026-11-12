// /edit 화면에서 저장한 배치(이 브라우저 전용). 서버 없이도 게임에 바로 반영된다.
export const LOCAL_LAYOUT_KEY = 'hnubs-smash:layout:v1';
export function readLocalLayout(): unknown | null {
  try { const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(LOCAL_LAYOUT_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function writeLocalLayout(layout: unknown) {
  try { localStorage.setItem(LOCAL_LAYOUT_KEY, JSON.stringify(layout)); return true; } catch { return false; }
}
export function clearLocalLayout() { try { localStorage.removeItem(LOCAL_LAYOUT_KEY); } catch { /* 저장소를 쓸 수 없는 브라우저 */ } }
