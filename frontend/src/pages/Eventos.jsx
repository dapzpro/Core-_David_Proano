import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, getUser } from '../api';
import { fmtDateTime, fmtDate, hasStarted, isFinished, money, toLocalInput } from '../format';
import { Alert, Badge, Empty, Field, Icon, ListSkeleton, Meter, Modal, PageHeader, Spinner, Stars, useConfirm, useToast } from '../components/ui';

const emptyEvent = { nombre: '', ubicacion: '', descripcion: '', fechaInicio: '', fechaFin: '', accesibilidad: false, categoriaId: '' };

export default function Eventos() {
  const user = getUser();
  const isAdmin = user.role === 'admin';
  const toast = useToast();
  const confirm = useConfirm();

  const [categorias, setCategorias] = useState([]);
  const [todos, setTodos] = useState(null); // todos los eventos (tarjetas de inicio)
  const [loadError, setLoadError] = useState('');

  // Cascada: categoría → evento → zona (cada nivel se pide al backend con el valor del anterior)
  const [categoriaId, setCategoriaId] = useState('');
  const [eventos, setEventos] = useState([]);
  const [eventoId, setEventoId] = useState('');
  const [zonas, setZonas] = useState([]);
  const [zonaId, setZonaId] = useState('');

  const [mine, setMine] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // {type:'evento'|'zona'|'artistas', data}

  const loadTodos = useCallback(() => {
    api.get('/events').then(({ data }) => setTodos(data)).catch((e) => setLoadError(errMsg(e)));
  }, []);
  const loadMine = useCallback(() => {
    if (user.role === 'user') api.get('/registrations/mine').then(({ data }) => setMine(data)).catch(() => {});
  }, [user.role]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategorias(data)).catch((e) => setLoadError(errMsg(e)));
    loadTodos();
    loadMine();
  }, [loadTodos, loadMine]);

  // Nivel 2
  useEffect(() => {
    setEventoId('');
    setEventos([]);
    if (categoriaId) api.get('/events', { params: { categoryId: categoriaId } }).then(({ data }) => setEventos(data));
  }, [categoriaId]);

  const loadZonas = useCallback(async (id) => {
    const { data } = await api.get('/registrations/availability', { params: { eventId: id } });
    setZonas(data);
  }, []);

  // Nivel 3
  useEffect(() => {
    setZonas([]);
    setZonaId('');
    setReviews([]);
    if (!eventoId) return;
    loadZonas(eventoId);
    api.get(`/reviews/event/${eventoId}`).then(({ data }) => setReviews(data)).catch(() => {});
  }, [eventoId, loadZonas]);

  const evento = useMemo(
    () => eventos.find((e) => String(e.id) === String(eventoId)) || (todos || []).find((e) => String(e.id) === String(eventoId)),
    [eventos, todos, eventoId],
  );
  const zona = zonas.find((z) => String(z.zonaId) === String(zonaId));
  const aforoTotal = zonas.reduce((s, z) => s + z.aforo, 0);
  const ocupados = zonas.reduce((s, z) => s + z.ocupados, 0);
  const locked = !!evento && hasStarted(evento); // el backend no deja tocar datos/zonas de un evento ya iniciado
  const miInscripcion = mine.find((m) => m.evento.id === Number(eventoId) && m.estado !== 'Cancelada');

  const openFromCard = (ev) => {
    // Al abrir desde una tarjeta, rellenamos la cascada completa
    window.scrollTo({ top: 0 });
    setCategoriaId(String(ev.categoriaId));
    api.get('/events', { params: { categoryId: ev.categoriaId } }).then(({ data }) => {
      setEventos(data);
      setEventoId(String(ev.id));
    });
  };
  const backToList = () => { setEventoId(''); setZonaId(''); };
  const showAll = () => { setCategoriaId(''); backToList(); window.scrollTo({ top: 0 }); };

  const signup = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/registrations', { zonaId: Number(zonaId) });
      toast(data.estado === 'EnEspera' ? 'Quedaste en lista de espera. Te avisaremos en “Mis entradas” si se libera un cupo.' : '¡Listo! Tu entrada está confirmada.');
      await Promise.all([loadZonas(eventoId), loadMine()]);
    } catch (e) {
      toast.error(errMsg(e));
      loadZonas(eventoId);
    } finally {
      setBusy(false);
    }
  };

  const refreshAll = async (keepEvent = true) => {
    loadTodos();
    if (categoriaId) {
      const { data } = await api.get('/events', { params: { categoryId: categoriaId } });
      setEventos(data);
    }
    if (keepEvent && eventoId) loadZonas(eventoId);
  };

  const deleteEvento = async () => {
    if (!(await confirm({ title: 'Eliminar evento', body: `Se eliminará “${evento.nombre}” con todas sus zonas e inscripciones. Esta acción no se puede deshacer.`, danger: true, confirmLabel: 'Eliminar' }))) return;
    try {
      await api.delete(`/events/${eventoId}`);
      toast('Evento eliminado');
      backToList();
      refreshAll(false);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const deleteZona = async (z) => {
    if (!(await confirm({ title: 'Eliminar zona', body: `¿Eliminar la zona “${z.nombre}”?`, danger: true, confirmLabel: 'Eliminar' }))) return;
    try {
      await api.delete(`/zones/${z.zonaId}`);
      toast('Zona eliminada');
      if (String(zonaId) === String(z.zonaId)) setZonaId('');
      loadZonas(eventoId);
    } catch (e) { toast.error(errMsg(e)); }
  };

  /* ---------- Vista: listado ---------- */
  const visibles = (todos || []).filter((e) => !categoriaId || String(e.categoriaId) === String(categoriaId));
  const proximos = visibles.filter((e) => !isFinished(e)).sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
  const pasados = visibles.filter(isFinished).sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? 'Administración' : 'Descubre'}
        title="Eventos"
        subtitle={isAdmin ? 'Crea eventos, define sus zonas de entrada y asigna artistas.' : 'Elige una categoría, un evento y una zona de entrada. Si una zona está llena, te anotamos en lista de espera.'}
        actions={isAdmin && <button className="btn btn-primary" onClick={() => setModal({ type: 'evento', data: null })}><Icon name="plus" size={16} />Nuevo evento</button>}
      />

      {/* Cascada de dropdowns */}
      <section aria-label="Filtros en cascada" className="card mb-8 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="1 · Categoría">
            <select className="input" value={categoriaId} onChange={(e) => { setCategoriaId(e.target.value); backToList(); }}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="2 · Evento" hint={!categoriaId ? 'Primero elige una categoría' : undefined}>
            <select className="input" value={eventoId} disabled={!categoriaId} onChange={(e) => setEventoId(e.target.value)}>
              <option value="">{!categoriaId ? '—' : eventos.length ? 'Selecciona un evento' : 'No hay eventos en esta categoría'}</option>
              {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
            </select>
          </Field>
          <Field label="3 · Zona de entrada" hint={!eventoId ? 'Primero elige un evento' : undefined}>
            <select className="input" value={zonaId} disabled={!eventoId || !zonas.length} onChange={(e) => setZonaId(e.target.value)}>
              <option value="">{!eventoId ? '—' : zonas.length ? 'Selecciona una zona' : 'Este evento aún no tiene zonas'}</option>
              {zonas.map((z) => (
                <option key={z.zonaId} value={z.zonaId}>{z.nombre} · {money(z.precio)} · {z.disponibles > 0 ? `${z.disponibles} libres` : 'llena'}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {loadError && <Alert>{loadError}</Alert>}

      {!eventoId ? (
        todos === null ? <ListSkeleton rows={3} /> : visibles.length === 0 ? (
          <Empty icon="calendar" title="Aún no hay eventos" action={isAdmin && <button className="btn btn-primary" onClick={() => setModal({ type: 'evento', data: null })}>Crear el primer evento</button>}>
            {isAdmin ? 'Crea tu primer evento para empezar a recibir inscripciones.' : 'Vuelve pronto: el administrador publicará nuevos eventos.'}
          </Empty>
        ) : (
          <div className="space-y-12">
            {proximos.length > 0 && <Grid title="Próximos" items={proximos} onOpen={openFromCard} />}
            {pasados.length > 0 && <Grid title="Finalizados" items={pasados} onOpen={openFromCard} muted />}
          </div>
        )
      ) : !evento ? <ListSkeleton rows={2} /> : (
        <div className="anim-up">
          <button onClick={showAll} className="btn btn-ghost btn-sm -ml-3 mb-5"><Icon name="chevron" size={14} className="rotate-180" />Todos los eventos</button>

          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
            <div className="min-w-0 space-y-8">
              <header>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge tone="accent">{evento.categoria?.nombre}</Badge>
                  {isFinished(evento) ? <Badge>Finalizado</Badge> : hasStarted(evento) ? <Badge tone="warn">En curso</Badge> : <Badge tone="ok">Inscripciones abiertas</Badge>}
                  {evento.accesibilidad && <Badge tone="ok">Accesible</Badge>}
                </div>
                <h2 className="display text-[38px] leading-[1.1]">{evento.nombre}</h2>
                <dl className="mt-4 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:gap-6">
                  <div className="flex items-center gap-2"><Icon name="calendar" size={16} /><dd>{fmtDateTime(evento.fechaInicio)}</dd></div>
                  <div className="flex items-center gap-2"><Icon name="pin" size={16} /><dd>{evento.ubicacion}</dd></div>
                </dl>
                {evento.descripcion && <p className="mt-5 max-w-2xl text-[15px] leading-relaxed">{evento.descripcion}</p>}
              </header>

              {evento.artistas?.length > 0 && (
                <section aria-labelledby="art">
                  <h3 id="art" className="eyebrow mb-3">Artistas</h3>
                  <ul className="flex flex-wrap gap-2">
                    {evento.artistas.map((a) => (
                      <li key={a.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3.5 text-sm">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="music" size={13} /></span>{a.nombre}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="zonas">
                <div className="mb-3 flex items-center justify-between">
                  <h3 id="zonas" className="eyebrow">Zonas de entrada · aforo total {aforoTotal}</h3>
                  {isAdmin && <button className="btn btn-outline btn-sm" disabled={locked} onClick={() => setModal({ type: 'zona', data: null })}><Icon name="plus" size={14} />Zona</button>}
                </div>
                {zonas.length === 0 ? (
                  <Empty icon="ticket" title="Sin zonas todavía">{isAdmin ? 'Agrega al menos una zona para recibir inscripciones.' : 'El administrador aún no definió las zonas de este evento.'}</Empty>
                ) : (
                  <ul className="card divide-y divide-line overflow-hidden">
                    {zonas.map((z) => {
                      const sel = String(z.zonaId) === String(zonaId);
                      const llena = z.disponibles === 0;
                      return (
                        <li key={z.zonaId} className={`flex items-center gap-2 pr-3 transition-colors ${sel ? 'bg-accent-soft/50' : ''}`}>
                          <button onClick={() => setZonaId(String(z.zonaId))} aria-pressed={sel} className="flex min-w-0 flex-1 flex-col gap-3 p-5 text-left sm:flex-row sm:items-center sm:gap-6">
                            <div className="sm:w-44">
                              <p className="font-medium">{z.nombre}</p>
                              <p className="num text-sm text-muted">{money(z.precio)}</p>
                            </div>
                            <div className="flex-1"><Meter label={`${z.ocupados} de ${z.aforo} cupos`} value={(z.ocupados / z.aforo) * 100} display={llena ? 'Llena' : `${z.disponibles} libres`} tone={llena ? 'bad' : z.disponibles / z.aforo < 0.2 ? 'warn' : 'accent'} /></div>
                            {z.enEspera > 0 && <Badge tone="warn">{z.enEspera} en espera</Badge>}
                          </button>
                          {isAdmin && !locked && (
                            <div className="flex shrink-0 gap-1">
                              <button className="btn btn-ghost btn-sm !px-2" aria-label={`Editar zona ${z.nombre}`} onClick={() => setModal({ type: 'zona', data: z })}><Icon name="edit" size={16} /></button>
                              <button className="btn btn-ghost btn-sm !px-2 hover:!text-bad" aria-label={`Eliminar zona ${z.nombre}`} onClick={() => deleteZona(z)}><Icon name="trash" size={16} /></button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {reviews.length > 0 && (
                <section aria-labelledby="rev">
                  <h3 id="rev" className="eyebrow mb-3">Lo que dijeron quienes asistieron</h3>
                  <ul className="space-y-3">
                    {reviews.slice(0, 6).map((r) => (
                      <li key={r.id} className="card p-5">
                        <div className="flex items-center justify-between"><Stars value={r.calificacion} size={16} /><span className="text-xs text-muted">{r.autor} · {fmtDate(r.createdAt)}</span></div>
                        {r.comentario && <p className="mt-3 text-[15px] leading-relaxed">“{r.comentario}”</p>}
                        {r.respuestaAdmin && <p className="mt-3 border-l-2 border-accent pl-3 text-sm text-muted"><span className="font-medium text-ink">Organización:</span> {r.respuestaAdmin}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Panel lateral */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              {isAdmin ? (
                <div className="card space-y-3 p-6">
                  <h3 className="display text-xl">Gestión del evento</h3>
                  <p className="num text-sm text-muted">{ocupados} de {aforoTotal} cupos ocupados</p>
                  {locked && <Alert type="info">Este evento ya inició: sus datos y zonas quedan bloqueados porque las métricas de ocupación dependen del aforo.</Alert>}
                  <button className="btn btn-outline w-full justify-start" disabled={locked} onClick={() => setModal({ type: 'evento', data: evento })}><Icon name="edit" size={16} />Editar datos</button>
                  <button className="btn btn-outline w-full justify-start" onClick={() => setModal({ type: 'artistas', data: evento })}><Icon name="music" size={16} />Asignar artistas</button>
                  <button className="btn btn-danger w-full justify-start" onClick={deleteEvento}><Icon name="trash" size={16} />Eliminar evento</button>
                </div>
              ) : (
                <SignupPanel evento={evento} zona={zona} miInscripcion={miInscripcion} busy={busy} onSignup={signup} />
              )}
            </aside>
          </div>
        </div>
      )}

      {modal?.type === 'evento' && (
        <EventoModal data={modal.data} categorias={categorias} onClose={() => setModal(null)}
          onSaved={async (saved) => { setModal(null); toast(modal.data ? 'Evento actualizado' : 'Evento creado'); await refreshAll(); if (!modal.data) openFromCard(saved); }} />
      )}
      {modal?.type === 'zona' && (
        <ZonaModal data={modal.data} eventoId={Number(eventoId)} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); toast(modal.data ? 'Zona actualizada' : 'Zona creada'); loadZonas(eventoId); }} />
      )}
      {modal?.type === 'artistas' && (
        <ArtistasModal evento={modal.data} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); toast('Artistas actualizados'); refreshAll(); }} />
      )}
    </div>
  );
}

/* ---------- Tarjetas ---------- */
function Grid({ title, items, onOpen, muted }) {
  return (
    <section>
      <h2 className="eyebrow mb-4">{title} <span className="num ml-1 text-faint">{items.length}</span></h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => (
          <li key={e.id}>
            <button onClick={() => onOpen(e)} className={`card group flex h-full w-full flex-col p-6 text-left transition hover:-translate-y-0.5 hover:border-faint hover:shadow-[0_10px_30px_rgba(24,24,27,.07)] ${muted ? 'opacity-75' : ''}`}>
              <div className="mb-5 flex items-center justify-between gap-2">
                <Badge tone={muted ? 'neutral' : 'accent'}>{e.categoria?.nombre}</Badge>
                <span className="num text-xs text-muted">{fmtDate(e.fechaInicio)}</span>
              </div>
              <h3 className="display text-[22px] leading-snug">{e.nombre}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Icon name="pin" size={14} />{e.ubicacion}</p>
              {e.artistas?.length > 0 && <p className="mt-4 line-clamp-1 text-sm text-muted">{e.artistas.map((a) => a.nombre).join(' · ')}</p>}
              <span className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium text-ink">Ver detalle<Icon name="chevron" size={14} className="transition group-hover:translate-x-0.5" /></span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SignupPanel({ evento, zona, miInscripcion, busy, onSignup }) {
  const cerrado = hasStarted(evento);
  return (
    <div className="card p-6">
      <h3 className="display text-xl">Tu entrada</h3>
      {miInscripcion ? (
        <div className="mt-4 space-y-4">
          <Alert type={miInscripcion.estado === 'EnEspera' ? 'warn' : 'ok'}>
            {miInscripcion.estado === 'EnEspera' ? `Estás en lista de espera (puesto ${miInscripcion.posicionEnEspera}).` : miInscripcion.estado === 'Ingresada' ? 'Ya ingresaste a este evento.' : 'Ya tienes tu entrada confirmada.'}
          </Alert>
          <Link to="/entradas" className="btn btn-primary w-full">Ver mi entrada</Link>
        </div>
      ) : cerrado ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">Las inscripciones de este evento ya cerraron.</p>
      ) : !zona ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">Selecciona una zona en el filtro o en la lista para ver el precio y reservar tu lugar.</p>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted">{zona.nombre}</p>
          <p className="display num text-[40px] leading-tight">{money(zona.precio)}</p>
          <div className="mt-4"><Meter label={`${zona.ocupados} de ${zona.aforo} cupos`} value={(zona.ocupados / zona.aforo) * 100} display={zona.disponibles ? `${zona.disponibles} libres` : 'Llena'} tone={zona.disponibles ? 'accent' : 'bad'} /></div>
          {zona.disponibles === 0 && <div className="mt-4"><Alert type="warn">Esta zona está llena. Puedes anotarte en la lista de espera: si alguien cancela, pasas a confirmado automáticamente.</Alert></div>}
          <button onClick={onSignup} disabled={busy} className="btn btn-primary btn-lg mt-5 w-full">
            {busy ? <><Spinner />Procesando…</> : zona.disponibles ? 'Inscribirme' : 'Unirme a la lista de espera'}
          </button>
          <p className="hint text-center">Puedes cancelar cuando quieras desde “Mis entradas”.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Modales de administración ---------- */
function EventoModal({ data, categorias, onClose, onSaved }) {
  const [f, setF] = useState(data ? {
    nombre: data.nombre, ubicacion: data.ubicacion, descripcion: data.descripcion || '', accesibilidad: !!data.accesibilidad,
    categoriaId: String(data.categoriaId), fechaInicio: toLocalInput(data.fechaInicio), fechaFin: toLocalInput(data.fechaFin),
  } : emptyEvent);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const on = (e) => setF({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setSaving(true);
    const body = {
      nombre: f.nombre, ubicacion: f.ubicacion, descripcion: f.descripcion, accesibilidad: f.accesibilidad,
      categoriaId: Number(f.categoriaId), fechaInicio: new Date(f.fechaInicio).toISOString(), fechaFin: new Date(f.fechaFin).toISOString(),
    };
    try {
      const res = data ? await api.patch(`/events/${data.id}`, body) : await api.post('/events', body);
      onSaved(res.data);
    } catch (e2) { setErr(errMsg(e2)); } finally { setSaving(false); }
  };

  return (
    <Modal title={data ? 'Editar evento' : 'Nuevo evento'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2"><input className="input" name="nombre" value={f.nombre} onChange={on} required /></Field>
        <Field label="Categoría">
          <select className="input" name="categoriaId" value={f.categoriaId} onChange={on} required>
            <option value="" disabled>Selecciona…</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Ubicación"><input className="input" name="ubicacion" value={f.ubicacion} onChange={on} required /></Field>
        <Field label="Inicio"><input className="input" type="datetime-local" name="fechaInicio" value={f.fechaInicio} onChange={on} required /></Field>
        <Field label="Fin"><input className="input" type="datetime-local" name="fechaFin" value={f.fechaFin} onChange={on} required /></Field>
        <Field label="Descripción (opcional)" className="sm:col-span-2"><textarea className="input" rows={3} name="descripcion" value={f.descripcion} onChange={on} /></Field>
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2"><input type="checkbox" name="accesibilidad" checked={f.accesibilidad} onChange={on} className="h-4 w-4 accent-[var(--color-accent)]" />Accesible para personas con movilidad reducida</label>
        {err && <div className="sm:col-span-2"><Alert>{err}</Alert></div>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : data ? 'Guardar cambios' : 'Crear evento'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ZonaModal({ data, eventoId, onClose, onSaved }) {
  const [f, setF] = useState(data ? { nombre: data.nombre, aforo: data.aforo, precio: data.precio } : { nombre: '', aforo: '', precio: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const on = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setSaving(true);
    const body = { nombre: f.nombre, aforo: Number(f.aforo), precio: Number(f.precio) };
    try {
      if (data) await api.patch(`/zones/${data.zonaId}`, body);
      else await api.post('/zones', { ...body, eventoId });
      onSaved();
    } catch (e2) { setErr(errMsg(e2)); } finally { setSaving(false); }
  };
  return (
    <Modal title={data ? 'Editar zona' : 'Nueva zona'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre"><input className="input" name="nombre" value={f.nombre} onChange={on} placeholder="VIP, General…" required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Aforo"><input className="input" type="number" min="1" step="1" name="aforo" value={f.aforo} onChange={on} required /></Field>
          <Field label="Precio (USD)"><input className="input" type="number" min="0" step="0.01" name="precio" value={f.precio} onChange={on} required /></Field>
        </div>
        {err && <Alert>{err}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ArtistasModal({ evento, onClose, onSaved }) {
  const [all, setAll] = useState(null);
  const [sel, setSel] = useState(new Set((evento.artistas || []).map((a) => a.id)));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get('/artists').then(({ data }) => setAll(data)).catch((e) => setErr(errMsg(e))); }, []);
  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const save = async () => {
    setSaving(true); setErr('');
    try { await api.put(`/events/${evento.id}/artists`, { artistaIds: [...sel] }); onSaved(); } catch (e) { setErr(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Modal title="Artistas del evento" onClose={onClose} size="sm">
      {all === null ? <ListSkeleton rows={3} /> : all.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay artistas. Créalos primero en la sección <Link to="/artistas" className="underline">Artistas</Link>.</p>
      ) : (
        <ul className="-mx-2 max-h-72 space-y-0.5 overflow-y-auto">
          {all.map((a) => (
            <li key={a.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-sunken">
                <input type="checkbox" checked={sel.has(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 accent-[var(--color-accent)]" />
                <span className="text-sm">{a.nombre}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {err && <div className="mt-4"><Alert>{err}</Alert></div>}
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !all?.length}>{saving ? <Spinner /> : 'Guardar'}</button>
      </div>
    </Modal>
  );
}
