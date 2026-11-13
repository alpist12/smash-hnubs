import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Splash } from '../src/ui/Splash';

test('ON AIR splash remains accessible while preparing and announces readiness before leaving', () => {
  const loading = renderToStaticMarkup(createElement(Splash, { ready: false, restoring: false }));
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-label="ON AIR"/);
  assert.match(loading, /방송 준비 중/);
  assert.equal((loading.match(/--level/g) ?? []).length, 7);
  const ready = renderToStaticMarkup(createElement(Splash, { ready: true, restoring: false }));
  assert.match(ready, /방송을 시작합니다/);
  assert.match(ready, /onair-splash/);
});
