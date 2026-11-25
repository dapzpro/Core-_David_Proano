import { cloneElement, createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

/* ---------- Iconos (trazo simple, 20px) ---------- */
const paths = {
  x: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12 5 5 9-10',
  alert: 'M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 11v5m0-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  plus: 'M12 5v14M5 12h14',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  ticket: 'M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1a2 2 0 0 1 0-4v0a2 2 0 0 1 0-4V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1Zm10-1v10',
  menu: 'M4 7h16M4 12h16M4 17h16',
  edit: 'm4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z',
  trash: 'M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13M10 11v6m4-6v6',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16',
  up: 'M7 14l5-5 5 5',
  down: 'M7 10l5 5 5-5',
  chevron: 'm9 6 6 6-6 6',
  logout: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l-4-4 4-4M6 12h10',
  access: 'M12 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5 8.5l7 1.5 7-1.5M12 10v4.5m0 0-3.5 5m3.5-5 3.5 5',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  chart: 'M4 20V10m6 10V4m6 16v-7m6 7H2',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-2a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5Z',
  msg: 'M4 5h16v11H9l-5 4V5Z',
};
export function Icon({ name, size = 18, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`} {...rest}>
      <path d={paths[name]} />
    </svg>
  );
}

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink">
        <span className="h-3.5 w-3.5 rounded-full border-[2.5px] border-white" />
      </span>
      <span className="display text-[22px] leading-none">Aforo</span>
    </span>
  );
}

/* ---------- Contenedor de notificaciones + confirmaciones ---------- */
const UiCtx = createContext(null);
export const useToast = () => useContext(UiCtx).toast;
export const useConfirm = () => useContext(UiCtx).confirm;

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const toast = useCallback((message, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'bad' ? 6000 : 3800);
  }, []);
  toast.error = (m) => toast(m, 'bad');

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setDialog({ ...opts, resolve })),
    [],
  );
  const close = (v) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <UiCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="anim-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm shadow-[0_8px_30px_rgba(24,24,27,.12)]">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${t.type === 'bad' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>
              <Icon name={t.type === 'bad' ? 'alert' : 'check'} size={13} />
            </span>
            <p className="flex-1 leading-snug">{t.message}</p>
          </div>
        ))}
      </div>
      {dialog && (
        <Modal title={dialog.title} onClose={() => close(false)} size="sm">
          <p className="text-sm leading-relaxed text-muted">{dialog.body}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-outline" onClick={() => close(false)}>Cancelar</button>
            <button className={`btn ${dialog.danger ? 'bg-bad text-white hover:bg-bad/90' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
              {dialog.confirmLabel || 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </UiCtx.Provider>
  );
}

/* ---------- Modal accesible (Esc, clic fuera, bloquea scroll, devuelve el foco) ---------- */
export function Modal({ title, onClose, children, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        const items = [...f].filter((x) => !x.disabled);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!ref.current.contains(document.activeElement)) ref.current.querySelector('input,select,textarea,button:not([aria-label="Cerrar"])')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];
  return (
    <div className="anim-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`anim-up flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl ${width}`}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id={titleId} className="display text-xl">{title}</h2>
          <button aria-label="Cerrar" onClick={onClose} className="btn btn-ghost btn-sm -mr-2 !px-2"><Icon name="x" /></button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Bloques de página ---------- */
export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-[34px] leading-[1.1] sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  const id = useId();
  const child = cloneElement(children, { id });
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {child}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Alert({ type = 'bad', children }) {
  const cls = { bad: 'bg-bad-soft text-bad', ok: 'bg-ok-soft text-ok', info: 'bg-accent-soft text-accent', warn: 'bg-warn-soft text-warn' }[type];
  return (
    <div role={type === 'bad' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-snug ${cls}`}>
      <Icon name={type === 'ok' ? 'check' : type === 'info' ? 'info' : 'alert'} size={16} className="mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon = 'calendar', title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-sunken text-muted"><Icon name={icon} size={22} /></span>
      <h3 className="display text-xl">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = 'h-24' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />;
}

export function Badge({ tone = 'neutral', children, icon }) {
  return <span className={`badge badge-${tone}`}>{icon && <Icon name={icon} size={12} />}{children}</span>;
}

/* Barra de progreso fina con etiqueta */
export function Meter({ label, value, display, tone = 'accent', hint }) {
  const v = value === null || value === undefined ? null : Math.max(0, Math.min(100, value));
  const color = { accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', ink: 'bg-ink' }[tone];
  return (
    <div title={hint}>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="num font-medium text-ink">{v === null ? '—' : display ?? `${v.toFixed(1)}`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label={label} aria-valuenow={v ?? 0} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${v ?? 0}%` }} />
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-sunken p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${value === t.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
          {t.label}{t.count !== undefined && <span className="num ml-1.5 text-xs text-faint">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stars({ value, onChange, size = 22 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= shown;
        const star = <Icon name="star" size={size} className={on ? 'fill-warn text-warn' : 'text-line'} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)} className="rounded p-0.5">{star}</button>
        ) : <span key={n}>{star}</span>;
      })}
    </div>
  );
}

/* Hook de carga: { data, loading, error, reload } */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const seq = useRef(0);
  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    Promise.resolve(fn())
      .then((data) => id === seq.current && setState({ data, loading: false, error: '' }))
      .catch((e) => id === seq.current && setState({ data: null, loading: false, error: e?.response?.data?.message || 'No se pudo cargar la información' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
