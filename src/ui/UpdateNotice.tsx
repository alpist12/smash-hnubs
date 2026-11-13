import { useCallback, useEffect, useState } from 'react';
import { hasUnreadRelease, markReleaseRead, RELEASE } from '../data/release';
import { Icon } from './Icon';

export function UpdateNotice({ active }: { active: boolean }) {
  const [unread, setUnread] = useState(hasUnreadRelease);
  const dismiss = useCallback(() => { markReleaseRead(); setUnread(false); }, []);
  useEffect(() => {
    if (!active || !unread) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active, unread, dismiss]);
  if (!active || !unread) return null;
  return <section className="update-notice" aria-labelledby="update-title" aria-live="polite">
    <button className="update-close" aria-label="업데이트 알림 닫기" onClick={dismiss}><Icon name="close" size={18}/></button>
    <div className="update-eyebrow"><span>UPDATE</span><time dateTime={RELEASE.date.replaceAll('.', '-')}>{RELEASE.date}</time></div>
    <h2 id="update-title">방송국이 업데이트됐어요</h2>
    <p className="update-intro">이번에 달라진 내용을 확인해 보세요.</p>
    <ul>{RELEASE.changes.map(change => <li key={change.title}><strong>{change.title}</strong><p>{change.detail}</p></li>)}</ul>
    <button className="update-confirm" onClick={dismiss}>확인했어요<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg></button>
  </section>;
}
