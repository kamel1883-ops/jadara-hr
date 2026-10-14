import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveDocumentWindow, finishDocumentWindow } from '../../src/lib/documentWindow.js';

test('يحجز تبويب المستند قبل انتظار الرابط ويفصل النافذة الأصلية', () => {
  const tab = { opener: {}, closed: false };
  let opened = null;
  globalThis.window = { open: (...args) => { opened = args; return tab; } };
  assert.equal(reserveDocumentWindow(), tab);
  assert.deepEqual(opened, ['about:blank', '_blank']);
  assert.equal(tab.opener, null);
});

test('يفتح الرابط المؤقت في التبويب المحجوز دون نافذة مؤجلة', () => {
  let target = null;
  const tab = { closed: false, location: { replace: url => { target = url; } } };
  globalThis.window = { open: () => { throw new Error('لا تفتح نافذة بعد الانتظار'); } };
  assert.equal(finishDocumentWindow(tab, 'https://example.test/document'), true);
  assert.equal(target, 'https://example.test/document');
});

test('يغلق التبويب الفارغ عند فشل طلب المستند', () => {
  let closed = false;
  assert.equal(finishDocumentWindow({ closed: false, close: () => { closed = true; } }, null), false);
  assert.equal(closed, true);
});

test('يفتح المستند في الصفحة الحالية عندما يمنع المتصفح التبويب', () => {
  let target = null;
  globalThis.window = { location: { assign: url => { target = url; } } };
  assert.equal(finishDocumentWindow(null, 'https://example.test/document'), true);
  assert.equal(target, 'https://example.test/document');
});