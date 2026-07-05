export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let nextId = 0;
let listeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function notify() {
  for (const fn of listeners) fn(toasts);
}

export function showToast(type: ToastType, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, type, message }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 5000);
}

export function removeToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  notify();
}

export function subscribe(fn: (toasts: ToastItem[]) => void) {
  listeners.push(fn);
  fn(toasts);
  return () => {
    listeners = listeners.filter(f => f !== fn);
  };
}
