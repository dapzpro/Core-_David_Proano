import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, getUser } from '../api';
import { fmtDate, money, pct } from '../format';
import { Alert, Badge, Empty, Field, Icon, ListSkeleton, Meter, Modal, PageHeader, Spinner, useFetch, useToast } from '../components/ui';

const iso = (d) => d.toISOString().slice(0, 10);
const PRESETS = [
  { id: 'all', label: 'Todo el historial', range: () => ['', ''] },
  { id: '6m', label: 'Últimos 6 meses', range: () => { const t = new Date(), f = new Date(); f.setMonth(f.getMonth() - 6); return [iso(f), iso(t)]; } },
  { id: 'y', label: 'Este año', range: () => [`${new Date().getFullYear()}-01-01`, iso(new Date())] },
];

export default function Valoracion() {
  const user = getUser();
  const isAdmin = user.role === 'admin';
  const [range, setRange] = useState({ from: '', to: '' });
  const [draft, setDraft] = useState({ from: '', to: '' });
  const [preset, setPreset] = useState('all');
  const [offerFor, setOfferFor] = useState(null);
  const toast = useToast();

  const { data, loading, error, reload } = useFetch(
    () => api.get('/valuation/events', { params: { from: range.from || undefined, to: range.to || undefined } }).then((r) => r.data),
    [range.from, range.to],
  );

  const apply = (e) => { e?.preventDefault(); setPreset(''); setRange(draft); };
  const usePreset = (p) => { const [from, to] = p.range(); setPreset(p.id); setDraft({ from, to }); setRange({ from, to }); };

  const groups = useMemo(() => {
    if (!data) return [];
    const out = [];
    for (const r of data.rangos) {
      const items = data.eventos.filter((e) => e.rango?.id === r.id);
      if (items.length) out.push({ rango: r, items });
    }
    const sin = data.eventos.filter((e) => !e.rango);
    if (sin.length) out.push({ rango: { id: 0, nombre: 'Sin rango configurado', tarifaBase: 0 }, items: sin });
    return out;
  }, [data]);

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? 'Motor de valoración' : 'Para patrocinadores'}
        title={isAdmin ? 'Valoración de eventos' : 'Eventos recomendados'}
        subtitle="Cada evento finalizado recibe un índice de valor de 0 a 100 según su ocupación real (check-in por QR), sus reseñas aprobadas y la popularidad de sus artistas. Ese índice define el precio del paquete de patrocinio."
      />

      <form onSubmit={apply} className="card mb-8 p-5">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Rangos rápidos">
          {PRESETS.map((p) => (
            <button type="button" key={p.id} onClick={() => usePreset(p)} aria-pressed={preset === p.id}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${preset === p.id ? 'border-ink bg-ink text-white' : 'border-line text-muted hover:border-faint hover:text-ink'}`}>{p.label}</button>
          ))}
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Desde (fecha de fin del evento)"><input className="input" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></Field>
          <Field label="Hasta"><input className="input" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></Field>
          <button className="btn btn-primary">Aplicar rango</button>
        </div>
      </form>

      <details className="card mb-10 px-6 py-4 text-sm">
        <summary className="cursor-pointer font-medium">¿Cómo se calcula el índice y el precio?</summary>
        <div className="mt-4 grid gap-6 text-muted sm:grid-cols-2">
          <ul className="space-y-2 leading-relaxed">
            <li><b className="text-ink">Ocupación</b> = asistentes con ingreso validado ÷ aforo total × 100.</li>
            <li><b className="text-ink">Calificación</b> = promedio de reseñas aprobadas ÷ 5 × 100.</li>
            <li><b className="text-ink">Popularidad de artistas</b> = 40 % ocupación + 30 % calificación + 20 % rapidez de agotamiento + 10 % tendencia, usando solo sus eventos anteriores.</li>
          </ul>
          <ul className="space-y-2 leading-relaxed">
            <li><b className="text-ink">Índice de valor</b> = 35 % ocupación + 25 % calificación + 40 % popularidad media de artistas.</li>
            <li><b className="text-ink">Precio del paquete</b> = tarifa base del rango de aforo × (1 + índice ÷ 100).</li>
            <li>Un evento sin asistentes o sin reseñas aprobadas figura como <i>No disponible</i>.</li>
          </ul>
        </div>
      </details>

      {error && <Alert>{error}</Alert>}
      {loading && !data ? <ListSkeleton rows={4} /> : data && groups.length === 0 ? (
        <Empty icon="chart" title="No hay eventos finalizados en este rango">Prueba con otro rango de fechas o carga los datos de demostración desde <Link to="/ajustes" className="underline">Ajustes</Link>.</Empty>
      ) : (
        <div className={`space-y-12 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
          {groups.map(({ rango, items }) => (
            <section key={rango.id} aria-label={`Rango ${rango.nombre}`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <h2 className="display text-[26px]">{rango.nombre}</h2>
                <p className="num text-sm text-muted">Tarifa base {money(rango.tarifaBase)} · {items.length} evento{items.length !== 1 && 's'}</p>
              </div>
              <ul className="space-y-3">
                {items.map((e) => <EventRow key={e.eventoId} e={e} isAdmin={isAdmin} onOffer={() => setOfferFor(e)} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      {offerFor && <OfferModal evento={offerFor} onClose={() => setOfferFor(null)} onDone={() => { setOfferFor(null); toast('Oferta publicada. El patrocinador podrá aceptarla o rechazarla.'); }} />}
    </div>
  );
}

function EventRow({ e, isAdmin, onOffer }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`card anim-up p-5 sm:p-6 ${e.disponible ? '' : 'bg-transparent'}`}>
      <div className="grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="hidden w-10 sm:block">
          {e.disponible ? <span className="display num text-3xl text-faint">{e.ranking}</span> : <span className="text-faint">—</span>}
        </div>
        <div className="min-w-0">
          <h3 className="display text-xl leading-snug">{e.nombre}</h3>
          <p className="mt-1 text-sm text-muted">{e.categoria} · {fmtDate(e.fechaFin)} · <span className="num">{e.asistentes}</span> asistentes de <span className="num">{e.aforoTotal}</span></p>
          {e.disponible ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Meter label="Ocupación" value={e.ocupacion} display={`${pct(e.ocupacion)} %`} />
              <Meter label={`Calificación · ${e.resenasAprobadas} reseñas`} value={e.calificacion} display={`${pct(e.calificacion)} %`} tone="warn" />
              <Meter label="Popularidad de artistas" value={e.popularidadArtistas} display={pct(e.popularidadArtistas)} tone="ok" hint={e.artistasSinHistorial ? `${e.artistasSinHistorial} artista(s) sin historial no cuentan` : undefined} />
            </div>
          ) : <div className="mt-3"><Badge>{e.motivo}</Badge></div>}
        </div>
        {e.disponible && (
          <div className="flex items-center justify-between gap-6 border-t border-line pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">
            <div><p className="eyebrow">Índice</p><p className="display num text-[44px] leading-none">{pct(e.indiceValor)}</p></div>
            <div className="sm:mt-3 sm:text-right"><p className="eyebrow">Paquete</p><p className="num text-lg font-semibold">{money(e.precioPaquete)}</p></div>
          </div>
        )}
      </div>

      {e.disponible && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <button className="btn btn-ghost btn-sm -ml-2" onClick={() => setOpen(!open)} aria-expanded={open}>
            <Icon name={open ? 'up' : 'down'} size={15} />{open ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
          {isAdmin && <button className="btn btn-outline btn-sm" onClick={onOffer}><Icon name="mail" size={15} />Ofrecer a un patrocinador</button>}
        </div>
      )}

      {open && (
        <div className="anim-in mt-5 grid gap-8 border-t border-line pt-5 md:grid-cols-2">
          <div>
            <h4 className="eyebrow mb-3">Ocupación por zona</h4>
            <div className="space-y-3">{e.zonas.map((z) => <Meter key={z.id} label={`${z.nombre} · ${z.asistentes}/${z.aforo}`} value={z.ocupacion} display={`${pct(z.ocupacion)} %`} />)}</div>
          </div>
          <div>
            <h4 className="eyebrow mb-3">Artistas</h4>
            {e.artistas.length === 0 ? <p className="text-sm text-muted">Sin artistas asignados.</p> : (
              <ul className="space-y-2 text-sm">
                {e.artistas.map((a) => (
                  <li key={a.id} className="flex justify-between"><span>{a.nombre}</span><span className="num text-muted">{a.popularidad === null ? 'sin historial previo' : `popularidad ${pct(a.popularidad)}`}</span></li>
                ))}
              </ul>
            )}
            <p className="num mt-5 rounded-lg bg-sunken p-3 text-xs leading-relaxed text-muted">
              Índice = 0,35 × {pct(e.ocupacion)} + 0,25 × {pct(e.calificacion)} + 0,40 × {pct(e.popularidadArtistas)} = <b className="text-ink">{pct(e.indiceValor)}</b><br />
              Precio = {money(e.rango?.tarifaBase)} × (1 + {pct(e.indiceValor)} ÷ 100) = <b className="text-ink">{money(e.precioPaquete)}</b>
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

function OfferModal({ evento, onClose, onDone }) {
  const { data, loading } = useFetch(() => api.get('/staff/stakeholders').then((r) => r.data));
  const [sid, setSid] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try { await api.post('/offers', { eventoId: evento.eventoId, stakeholderId: Number(sid) }); onDone(); } catch (e2) { setErr(errMsg(e2)); } finally { setSaving(false); }
  };
  return (
    <Modal title="Ofrecer paquete de patrocinio" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl bg-sunken p-4">
          <p className="text-sm text-muted">{evento.nombre}</p>
          <p className="display num mt-1 text-3xl">{money(evento.precioPaquete)}</p>
          <p className="num mt-1 text-xs text-muted">Índice de valor {pct(evento.indiceValor)} · rango {evento.rango?.nombre}</p>
        </div>
        {loading ? <Spinner /> : !data?.length ? (
          <Alert type="info">Aún no hay patrocinadores. Créalos en <Link to="/ajustes" className="underline">Ajustes → Personal</Link>.</Alert>
        ) : (
          <Field label="Patrocinador" hint="El precio final lo recalcula el servidor, no el navegador.">
            <select className="input" value={sid} onChange={(e) => setSid(e.target.value)} required>
              <option value="" disabled>Selecciona…</option>
              {data.map((s) => <option key={s.id} value={s.id}>{s.empresa} · {s.sector}</option>)}
            </select>
          </Field>
        )}
        {err && <Alert>{err}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !sid}>{saving ? <Spinner /> : 'Publicar oferta'}</button>
        </div>
      </form>
    </Modal>
  );
}
