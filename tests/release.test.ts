import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { hasUnreadRelease, markReleaseRead, RELEASE, RELEASE_SEEN_KEY } from '../src/data/release';
import { UpdateNotice } from '../src/ui/UpdateNotice';

test('update notice appears once per release after loading and preserves other browser data', () => {
  const memory = new Map([['hnubs-smash:best:v1', '2435'], ['hnubs-smash:layout:v1', 'saved-layout']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) } });
  assert.equal(hasUnreadRelease(), true);
  assert.equal(renderToStaticMarkup(createElement(UpdateNotice, { active: false })), '');
  const notice = renderToStaticMarkup(createElement(UpdateNotice, { active: true }));
  assert.match(notice, /업데이트 알림 닫기/);
  assert.match(notice, /aria-live="polite"/);
  for (const change of RELEASE.changes) assert.ok(notice.includes(change.title));
  markReleaseRead();
  assert.equal(memory.get(RELEASE_SEEN_KEY), RELEASE.id);
  assert.equal(hasUnreadRelease(), false);
  assert.equal(renderToStaticMarkup(createElement(UpdateNotice, { active: true })), '');
  assert.equal(hasUnreadRelease('next-release'), true);
  assert.equal(memory.get('hnubs-smash:best:v1'), '2435');
  assert.equal(memory.get('hnubs-smash:layout:v1'), 'saved-layout');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  assert.equal(hasUnreadRelease(), true);
  assert.doesNotThrow(() => markReleaseRead());
});
