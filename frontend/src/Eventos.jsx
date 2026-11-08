import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-400';

const emptyEvent = {
  nombre: '',
  ubicacion: '',
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  accesibilidad: false,
  categoriaId: '',
};
const emptyZone = { nombre: '', aforo: '', precio: '' };

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => new Date(d).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
const errMsg = (err) => {
  const m = err.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || 'Error de conexión con el servidor';
};

export default function Eventos() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [eventos, setEventos] = useState([]);
  const [eventoId, setEventoId] = useState('');
  const [zonas, setZonas] = useState([]);

  const [eventForm, setEventForm] = useState(emptyEvent);
  const [zoneForm, setZoneForm] = useState(emptyZone);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [eventError, setEventError] = useState('');
  const [zoneError, setZoneError] = useState('');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAuth = (err) => {
    if (err.response?.status === 401) logout();
  };

  const loadEventos = async (catId) => {
    try {
      const { data } = await api.get('/events', { params: { categoryId: catId } });
      setEventos(data);
    } catch (err) {
      handleAuth(err);
    }
  };

  const loadZonas = async (evId) => {
    try {
      const { data } = await api.get('/zones', { params: { eventId: evId } });
      setZonas(data);
    } catch (err) {
      handleAuth(err);
    }
  };

  const cancelZone = () => {
    setEditingZoneId(null);
    setZoneForm(emptyZone);
    setZoneError('');
  };

  // Nivel 1: las categorías se cargan al abrir la página
  useEffect(() => {
    api
      .get('/categories')
      .then(({ data }) => setCategorias(data))
      .catch(handleAuth);
  }, []);

  // Nivel 2: al cambiar la categoría se cargan SUS eventos y se limpia lo de abajo
  useEffect(() => {
    setEventoId('');
    setEventos([]);
    setZonas([]);
    if (categoriaId) loadEventos(categoriaId);
  }, [categoriaId]);

  // Nivel 3: al cambiar el evento se cargan SUS zonas
  useEffect(() => {
    setZonas([]);
    cancelZone();
    if (eventoId) loadZonas(eventoId);
  }, [eventoId]);

  const evento = eventos.find((e) => String(e.id) === String(eventoId));
  const aforoTotal = zonas.reduce((sum, z) => sum + z.aforo, 0);

  const onEventChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventForm({ ...eventForm, [name]: type === 'checkbox' ? checked : value });
  };

  const onCreateEvent = async (e) => {
    e.preventDefault();
    setEventError('');
    try {
      await api.post('/events', {
        nombre: eventForm.nombre,
        ubicacion: eventForm.ubicacion,
        descripcion: eventForm.descripcion,
        fechaInicio: new Date(eventForm.fechaInicio).toISOString(),
        fechaFin: new Date(eventForm.fechaFin).toISOString(),
        accesibilidad: eventForm.accesibilidad,
        categoriaId: Number(eventForm.categoriaId),
      });
      const nuevaCategoria = String(eventForm.categoriaId);
      setEventForm(emptyEvent);
      if (nuevaCategoria === categoriaId) {
        loadEventos(nuevaCategoria);
      } else {
        setCategoriaId(nuevaCategoria);
      }
    } catch (err) {
      setEventError(errMsg(err));
    }
  };

  const onDeleteEvent = async () => {
    if (!confirm('¿Eliminar este evento y todas sus zonas?')) return;
    try {
      await api.delete(`/events/${eventoId}`);
      setEventoId('');
      loadEventos(categoriaId);
    } catch (err) {
      setZoneError(errMsg(err));
    }
  };

  const onZoneChange = (e) => setZoneForm({ ...zoneForm, [e.target.name]: e.target.value });

  const onSubmitZone = async (e) => {
    e.preventDefault();
    setZoneError('');
    const body = {
      nombre: zoneForm.nombre,
      aforo: Number(zoneForm.aforo),
      precio: Number(zoneForm.precio),
    };
    try {
      if (editingZoneId) {
        await api.patch(`/zones/${editingZoneId}`, body);
      } else {
        await api.post('/zones', { ...body, eventoId: Number(eventoId) });
      }
      cancelZone();
      loadZonas(eventoId);
    } catch (err) {
      setZoneError(errMsg(err));
    }
  };

  const onEditZone = (z) => {
    setEditingZoneId(z.id);
    setZoneForm({ nombre: z.nombre, aforo: z.aforo, precio: z.precio });
    setZoneError('');
  };

  const onDeleteZone = async (id) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    try {
      await api.delete(`/zones/${id}`);
      loadZonas(eventoId);
    } catch (err) {
      setZoneError(errMsg(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xl">🎟️</div>
            <h1 className="text-xl font-bold text-slate-800">Plataforma de eventos</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-700">{user.name}</p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isAdmin ? 'Administrador' : 'Usuario'}
              </span>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {isAdmin && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Nuevo evento</h2>
            <form onSubmit={onCreateEvent} className="grid gap-4 sm:grid-cols-2">
              <input name="nombre" placeholder="Nombre del evento" value={eventForm.nombre} onChange={onEventChange} required className={inputClass} />
              <select name="categoriaId" value={eventForm.categoriaId} onChange={onEventChange} required className={inputClass}>
                <option value="" disabled>
                  Selecciona una categoría
                </option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <input name="ubicacion" placeholder="Ubicación" value={eventForm.ubicacion} onChange={onEventChange} required className={inputClass} />
              <input name="descripcion" placeholder="Descripción (opcional)" value={eventForm.descripcion} onChange={onEventChange} className={inputClass} />
              <label className="text-sm text-slate-500">
                Inicio
                <input name="fechaInicio" type="datetime-local" value={eventForm.fechaInicio} onChange={onEventChange} required className={`${inputClass} mt-1`} />
              </label>
              <label className="text-sm text-slate-500">
                Fin
                <input name="fechaFin" type="datetime-local" value={eventForm.fechaFin} onChange={onEventChange} required className={`${inputClass} mt-1`} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                <input name="accesibilidad" type="checkbox" checked={eventForm.accesibilidad} onChange={onEventChange} />
                Accesible para personas con movilidad reducida
              </label>

              {eventError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2">{eventError}</p>
              )}

              <div className="sm:col-span-2">
                <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow transition hover:bg-indigo-700">
                  Crear evento
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Explorar eventos</h2>
          <p className="mb-4 text-sm text-slate-500">Elige una categoría, luego un evento, y verás sus zonas de entrada.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputClass}>
              <option value="">1. Selecciona una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} disabled={!categoriaId} className={inputClass}>
              <option value="">
                {!categoriaId ? '2. Primero elige una categoría' : eventos.length === 0 ? 'No hay eventos en esta categoría' : '2. Selecciona un evento'}
              </option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.nombre}
                </option>
              ))}
            </select>
          </div>

          {evento && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{evento.nombre}</h3>
                    <p className="text-sm text-slate-500">
                      📍 {evento.ubicacion} · {fmtDate(evento.fechaInicio)} → {fmtDate(evento.fechaFin)}
                    </p>
                    {evento.descripcion && <p className="mt-1 text-sm text-slate-600">{evento.descripcion}</p>}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">{evento.categoria?.nombre}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">{evento.estado}</span>
                      {evento.accesibilidad && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">♿ Accesible</span>}
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Aforo total: {aforoTotal}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={onDeleteEvent} className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100">
                      Eliminar evento
                    </button>
                  )}
                </div>
              </div>

              <h4 className="font-semibold text-slate-800">Zonas de entrada</h4>
              {zonas.length === 0 ? (
                <p className="text-sm text-slate-400">Este evento aún no tiene zonas.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {zonas.map((z) => (
                    <article key={z.id} className="rounded-xl border border-slate-200 p-4">
                      <h5 className="font-semibold text-slate-800">{z.nombre}</h5>
                      <p className="mt-1 text-sm text-slate-500">Aforo: {z.aforo}</p>
                      <p className="text-xl font-bold text-indigo-600">{money.format(z.precio)}</p>
                      {isAdmin && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => onEditZone(z)} className="flex-1 rounded-lg bg-indigo-50 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100">
                            Editar
                          </button>
                          <button onClick={() => onDeleteZone(z.id)} className="flex-1 rounded-lg bg-red-50 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">
                            Eliminar
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {isAdmin && (
                <form onSubmit={onSubmitZone} className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:grid-cols-3">
                  <h5 className="font-semibold text-slate-700 sm:col-span-3">{editingZoneId ? 'Editar zona' : 'Nueva zona para este evento'}</h5>
                  <input name="nombre" placeholder="Nombre (VIP, General...)" value={zoneForm.nombre} onChange={onZoneChange} required className={inputClass} />
                  <input name="aforo" type="number" min="1" step="1" placeholder="Aforo" value={zoneForm.aforo} onChange={onZoneChange} required className={inputClass} />
                  <input name="precio" type="number" min="0" step="0.01" placeholder="Precio" value={zoneForm.precio} onChange={onZoneChange} required className={inputClass} />
                  {zoneError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-3">{zoneError}</p>}
                  <div className="flex gap-3 sm:col-span-3">
                    <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white shadow transition hover:bg-indigo-700">
                      {editingZoneId ? 'Actualizar zona' : 'Agregar zona'}
                    </button>
                    {editingZoneId && (
                      <button type="button" onClick={cancelZone} className="rounded-lg border border-slate-300 px-5 py-2 font-medium text-slate-600 transition hover:bg-slate-50">
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              )}
              {!isAdmin && zoneError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{zoneError}</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
