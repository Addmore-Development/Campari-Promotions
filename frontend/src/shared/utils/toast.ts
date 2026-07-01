// Simple global toast utility - no context needed
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toasts: Toast[] = [];
let container: HTMLDivElement | null = null;
let timeoutIds: Record<string, number> = {};

const COLORS = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#C4973A',
};

const createContainer = () => {
  if (container) return;
  container = document.createElement('div');
  container.id = 'hg-toast-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  `;
  document.body.appendChild(container);
};

const render = () => {
  if (!container) return;
  container.innerHTML = '';
  toasts.forEach(toast => {
    const el = document.createElement('div');
    el.style.cssText = `
      padding: 12px 20px;
      border-radius: 8px;
      background: ${COLORS[toast.type]};
      color: ${toast.type === 'info' ? '#080808' : '#fff'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 250px;
      pointer-events: auto;
      animation: slideIn 0.2s ease;
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 13px;
      font-weight: 500;
    `;
    el.innerHTML = `
      <span style="flex: 1;">${toast.message}</span>
      <button style="background: none; border: none; color: inherit; cursor: pointer; font-size: 16px;">✕</button>
    `;
    const btn = el.querySelector('button');
    btn?.addEventListener('click', () => removeToast(toast.id));
    container?.appendChild(el);
  });
};

const removeToast = (id: string) => {
  toasts = toasts.filter(t => t.id !== id);
  if (timeoutIds[id]) {
    window.clearTimeout(timeoutIds[id]);
    delete timeoutIds[id];
  }
  render();
};

export const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
  createContainer();
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  toasts.push({ id, message, type });
  render();
  timeoutIds[id] = window.setTimeout(() => removeToast(id), duration);
};

// Inject animation keyframes once
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}