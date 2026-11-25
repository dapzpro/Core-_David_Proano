import { useState } from 'react';
import api, { errMsg, getUser } from '../api';
import { fmtDate, pct } from '../format';
import { Alert, Badge, Empty, Field, Icon, ListSkeleton, Meter, Modal, PageHeader, Spinner, useConfirm, useFetch, useToast } from '../components/ui';

const TREND = {
  en_alza: { tone: 'ok', label: 'En alza', icon: 'up' },
  en_baja: { tone: 'bad', label: 'En baja', icon: 'down' },
  estable: { tone: 'neutral', label: 'Estable' },
  sin_datos: { tone: 'neutral', label: 'Sin datos suficientes' },
};

function Spark({ points, tone }) {
  if (points.length < 2) return <span className="text-xs text-faint">Pocos eventos</span>;
  const w = 120, h = 34, p = 3;
  const xs = (i) => p + (i * (w - 2 * p)) / (points.length - 1);
  const ys = (v) => h - p - (v / 100) * (h - 2 * p);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' ');
  const color = { ok: 'var(--color-ok)', bad: 'var(--color-bad)', neutral: 'var(--color-faint)' }[tone];
  return (
    <svg width={w} height={h} role="img" aria-label={`Ocupación en sus últimos ${points.length} eventos`}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs(points.length - 1)} cy={ys(points[points.length - 1])} r="3" fill={color} />
    </svg>
  );
}

export default function Artistas() {
  const isAdmin = getUser().role === 'admin';
  const { data, loading, error, reload } = useFetch(() => api.get('/valuation/artists').then((r) => r.data));
  const [edit, setEdit] = useState(undefined); // undefined = cerrado, null = nuevo, objeto = editar
  const [open, setOpen] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();

  const remove = async (a) => {
    if (!(await confirm({ title: 'Eliminar artista', body: `¿Eliminar a “${a.nombre}”? Se quitará de los eventos donde participa.`, danger: true, confirmLabel: 'Eliminar' }))) return;
    try { await api.delete(`/artists/${a.id}`); toast('Artista eliminado'); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  const counts = (data || []).reduce((m, a) => ({ ...m, [a.tendencia]: (m[a.tendencia] || 0) + 1 }), {});

  return (
    <div>
      <PageHeader eyebrow="Trayectoria" title="Artistas"
        subtitle="Comparación por popularidad y tendencia. La tendencia compara la ocupación de sus últimos 3 eventos contra los anteriores."
        actions={isAdmin && <button className="btn btn-primary" onClick={() => setEdit(null)}><Icon name="plus" size={16} />Nuevo artista</button>} />

      {error && <Alert>{error}</Alert>}
      {loading && !data ? <ListSkeleton rows={4} /> : !data?.length ? (
        <Empty icon="music" title="Aún no hay artistas" action={isAdmin && <button className="btn btn-primary" onClick={() => setEdit(null)}>Crear artista</button>}>Los artistas se asignan a los eventos desde la sección Eventos.</Empty>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2 text-sm">
            <Badge tone="ok" icon="up">{counts.en_alza || 0} en alza</Badge>
            <Badge tone="bad" icon="down">{counts.en_baja || 0} en baja</Badge>
            <Badge>{counts.estable || 0} estables</Badge>
            <Badge>{counts.sin_datos || 0} sin datos suficientes</Badge>
          </div>
          <ul className="space-y-3">
            {data.map((a, i) => {
              const t = TREND[a.tendencia];
              const isOpen = open === a.id;
              return (
                <li key={a.id} className="card anim-up p-5 sm:p-6">
                  <div className="grid items-center gap-5 md:grid-cols-[2.5rem_1fr_9rem_8rem]">
                    <span className="display num hidden text-3xl text-faint md:block">{a.popularidad === null ? '—' : i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="display text-xl">{a.nombre}</h2>
                        <Badge tone={t.tone} icon={t.icon}>{t.label}{a.cambioOcupacion !== null && ` ${a.cambioOcupacion > 0 ? '+' : ''}${a.cambioOcupacion} pts`}</Badge>
                      </div>
                      {a.descripcion && <p className="mt-1 text-sm text-muted">{a.descripcion}</p>}
                      <p className="mt-1 text-xs text-muted">{a.eventosFinalizados} evento{a.eventosFinalizados !== 1 && 's'} finalizado{a.eventosFinalizados !== 1 && 's'}</p>
                    </div>
                    <div className="hidden md:block"><Spark points={a.trayectoria.map((x) => x.ocupacion)} tone={t.tone} /></div>
                    <div className="flex items-end justify-between md:block md:text-right">
                      <div><p className="eyebrow">Popularidad</p><p className="display num text-[38px] leading-none">{pct(a.popularidad)}</p></div>
                    </div>
                  </div>

                  {a.popularidad !== null && (
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <Meter label="Ocupación promedio" value={a.ocupacionPromedio} display={`${pct(a.ocupacionPromedio)} %`} />
                      <Meter label="Calificación promedio" value={a.calificacionPromedio} display={`${pct(a.calificacionPromedio)} %`} tone="warn" />
                      <Meter label="Rapidez de agotamiento" value={a.rapidezAgotamiento} display={pct(a.rapidezAgotamiento)} tone="ok" />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <button className="btn btn-ghost btn-sm -ml-2" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen} disabled={!a.trayectoria.length}>
                      <Icon name={isOpen ? 'up' : 'down'} size={15} />Trayectoria
                    </button>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEdit(a)}><Icon name="edit" size={15} />Editar</button>
                        <button className="btn btn-ghost btn-sm hover:!text-bad" onClick={() => remove(a)}><Icon name="trash" size={15} />Eliminar</button>
                      </div>
                    )}
                  </div>
                  {isOpen && (
                    <ol className="anim-in mt-3 divide-y divide-line text-sm">
                      {a.trayectoria.map((t2, k) => (
                        <li key={k} className="flex items-center justify-between gap-4 py-2.5"><span className="min-w-0 truncate">{t2.evento}</span><span className="num shrink-0 text-muted">{fmtDate(t2.fecha)} · {pct(t2.ocupacion)} % ocupación</span></li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {edit !== undefined && <ArtistaModal data={edit} onClose={() => setEdit(undefined)} onSaved={() => { toast(edit ? 'Artista actualizado' : 'Artista creado'); setEdit(undefined); reload(); }} />}
    </div>
  );
}

function ArtistaModal({ data, onClose, onSaved }) {
  const [f, setF] = useState({ nombre: data?.nombre || '', descripcion: data?.descripcion || '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try { data ? await api.patch(`/artists/${data.id}`, f) : await api.post('/artists', f); onSaved(); } catch (e2) { setErr(errMsg(e2)); } finally { setSaving(false); }
  };
  return (
    <Modal title={data ? 'Editar artista' : 'Nuevo artista'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre"><input className="input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required /></Field>
        <Field label="Descripción (opcional)"><textarea className="input" rows={3} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Field>
        {err && <Alert>{err}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
