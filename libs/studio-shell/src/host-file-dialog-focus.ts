const HOST_FILE_DIALOG_FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function hostFileDialogFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(HOST_FILE_DIALOG_FOCUSABLE_SELECTOR))
    .filter(element => !element.hasAttribute('hidden'));
}

export function focusInitialHostFileDialogControl(dialog: HTMLElement): HTMLElement {
  const initial = dialog.querySelector<HTMLElement>('[data-file-dialog-initial-focus]')
    ?? hostFileDialogFocusableElements(dialog)[0]
    ?? dialog;
  initial.focus();
  return initial;
}

export function containHostFileDialogTabFocus(dialog: HTMLElement, shiftKey: boolean): boolean {
  const focusable = hostFileDialogFocusableElements(dialog);
  if (focusable.length === 0) {
    dialog.focus();
    return true;
  }
  const [first, ...remaining] = focusable;
  if (first === undefined) return false;
  const last = remaining.at(-1) ?? first;
  const active = dialog.ownerDocument.activeElement;
  if (shiftKey && (active === first || !dialog.contains(active))) {
    last.focus();
    return true;
  }
  if (!shiftKey && (active === last || !dialog.contains(active))) {
    first.focus();
    return true;
  }
  return false;
}

export function restoreHostFileDialogFocus(
  returnTarget: HTMLElement | null,
  fallback: HTMLElement | null,
): HTMLElement | null {
  const target = returnTarget?.isConnected ? returnTarget : fallback;
  target?.focus();
  return target;
}
