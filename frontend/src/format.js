export const money = (n) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(n) || 0);
export const fmtDate = (d) => new Date(d).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const pct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(1)}`);
export const toLocalInput = (iso) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
export const isFinished = (e) => new Date(e.fechaFin) < new Date();
export const hasStarted = (e) => new Date(e.fechaInicio) <= new Date();

export const ROLE_LABEL = { admin: 'Administrador', user: 'Asistente', door: 'Personal de puerta', stakeholder: 'Patrocinador' };
