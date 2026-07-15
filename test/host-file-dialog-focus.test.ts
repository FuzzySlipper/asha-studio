import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import {
  containHostFileDialogTabFocus,
  focusInitialHostFileDialogControl,
  hostFileDialogFocusableElements,
  restoreHostFileDialogFocus,
} from '../libs/studio-shell/src/host-file-dialog-focus.ts';

function createDialogDocument(): Document {
  const dom = new JSDOM(`
    <!doctype html>
    <button data-file-menu-trigger>File</button>
    <button data-dialog-opener>Open Scene</button>
    <section role="dialog" aria-modal="true" tabindex="-1">
      <button data-first>Close</button>
      <input data-file-dialog-initial-focus aria-label="Host directory">
      <button data-last>Open</button>
    </section>
  `);
  return dom.window.document;
}

test('host file dialog establishes initial focus and contains Tab in both directions', () => {
  const document = createDialogDocument();
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  assert.ok(dialog);

  const initial = focusInitialHostFileDialogControl(dialog);
  assert.equal(initial.getAttribute('aria-label'), 'Host directory');
  assert.equal(document.activeElement, initial);

  const focusable = hostFileDialogFocusableElements(dialog);
  const first = focusable[0];
  const last = focusable.at(-1);
  assert.ok(first);
  assert.ok(last);

  last.focus();
  assert.equal(containHostFileDialogTabFocus(dialog, false), true);
  assert.equal(document.activeElement, first);

  first.focus();
  assert.equal(containHostFileDialogTabFocus(dialog, true), true);
  assert.equal(document.activeElement, last);

  initial.focus();
  assert.equal(containHostFileDialogTabFocus(dialog, false), false);
  assert.equal(document.activeElement, initial);
});

test('host file dialog restores its opener or stable File-menu fallback', () => {
  const document = createDialogDocument();
  const opener = document.querySelector<HTMLElement>('[data-dialog-opener]');
  const fallback = document.querySelector<HTMLElement>('[data-file-menu-trigger]');
  assert.ok(opener);
  assert.ok(fallback);

  assert.equal(restoreHostFileDialogFocus(opener, fallback), opener);
  assert.equal(document.activeElement, opener);

  opener.remove();
  assert.equal(restoreHostFileDialogFocus(opener, fallback), fallback);
  assert.equal(document.activeElement, fallback);
});
