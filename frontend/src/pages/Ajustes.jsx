import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { ROLE_LABEL, money } from '../format';
import { Alert, Badge, Field, Icon, ListSkeleton, PageHeader, Spinner, Tabs, useConfirm, useFetch, useToast } from '../components/ui';

export default function Ajustes() {
  const [tab, setTab] = useState('rangos');
  return (
    <div>
      <PageHeader eyebrow="Administración" title="Ajustes" subtitle="Configuración que afecta directamente a los precios de patrocinio, el personal de la plataforma y los datos de prueba." />
      <div className="mb-8"><Tabs label="Secciones" value={tab} onChange={setTab} tabs={[{ id: 'rangos', label: 'Rangos y tarifas' }, { id: 'personal', label: 'Personal' }, { id: 'demo', label: 'Datos de demostración' }]} /></div>
      {tab === 'rangos' && <Rangos />}
      {tab === 'personal' && <Personal />}
      {tab === 'demo' && <Demo />}
    </div>
  );
}

/* ---------- Rangos de aforo y tarifas base ---------- */
function Rangos() {
  const { data, loading, error, reload } = useFetch(() => api.get('/valuation/ranges').then((r) => r.data));
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { if (data) setRows(data.map((r) => ({ nombre: r.nombre, minAforo: r.minAforo, maxAforo: r.maxAforo ?? '', tarifaBase: r.tarifaBase }))); }, [data]);

  const set = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const add = () => {
    const last = rows[rows.length - 1];
    const lastMax = last ? Number(last.maxAforo) : -1;
    const fixed = rows.map((r, j) => (j === rows.length - 1 ? { ...r, maxAforo: r.maxAforo === '' ? lastMax + 1000 : r.maxAforo } : r));
    const prevMax = fixed.length ? Number(fixed[fixed.length - 1].maxAforo) : -1;
    setRows([...fixed, { nombre: '', minAforo: prevMax + 1, maxAforo: '', tarifaBase: '' }]);
  };
  const remove = (i) => setRows(rows.filter((_, j) => j !== i));

  const save = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      await api.put('/valuation/ranges', { rangos: rows.map((r) => ({ nombre: r.nombre, minAforo: Number(r.minAforo), maxAforo: r.maxAforo === '' ? null : Number(r.maxAforo), tarifaBase: Number(r.tarifaBase) })) });
      toast('Rangos guardados'); reload();
    } catch (e2) { setErr(errMsg(e2)); } finally { setSaving(false); }
  };

  if (loading && !data) return <ListSkeleton rows={2} />;
  return (
    <form onSubmit={save} className="card p-6">
      <div className="mb-5 flex items-start gap-3">
        <Badge tone="warn" icon="alert">Dato sensible</Badge>
        <p className="text-sm leading-relaxed text-muted">Estas tarifas fijan el precio de los paquetes de patrocinio. El servidor valida que los rangos empiecen en 0, no tengan huecos ni traslapes, y que el último quede sin límite superior.</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead><tr className="text-left"><th className="label pb-2 pr-3">Nombre</th><th className="label pb-2 pr-3">Aforo desde</th><th className="label pb-2 pr-3">Aforo hasta</th><th className="label pb-2 pr-3">Tarifa base (USD)</th><th className="w-10" /></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const last = i === rows.length - 1;
              return (
                <tr key={i}>
                  <td className="pb-3 pr-3"><input aria-label="Nombre" className="input" value={r.nombre} onChange={(e) => set(i, 'nombre', e.target.value)} required /></td>
                  <td className="pb-3 pr-3"><input aria-label="Aforo desde" className="input num" type="number" min="0" value={r.minAforo} onChange={(e) => set(i, 'minAforo', e.target.value)} required /></td>
                  <td className="pb-3 pr-3"><input aria-label="Aforo hasta" className="input num" type="number" min="0" value={last ? '' : r.maxAforo} placeholder={last ? 'Sin límite' : ''} disabled={last} onChange={(e) => set(i, 'maxAforo', e.target.value)} required={!last} /></td>
                  <td className="pb-3 pr-3"><input aria-label="Tarifa base" className="input num" type="number" min="0" step="0.01" value={r.tarifaBase} onChange={(e) => set(i, 'tarifaBase', e.target.value)} required /></td>
                  <td className="pb-3"><button type="button" className="btn btn-ghost btn-sm !px-2 hover:!text-bad" aria-label="Quitar rango" disabled={rows.length === 1} onClick={() => remove(i)}><Icon name="trash" size={16} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {err && <div className="mt-2"><Alert>{err}</Alert></div>}
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <button type="button" className="btn btn-outline" onClick={add}><Icon name="plus" size={16} />Agregar rango</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : 'Guardar cambios'}</button>
      </div>
      {data && <p className="mt-5 border-t border-line pt-4 text-xs text-muted">Vigente ahora: {data.map((r) => `${r.nombre} (${r.minAforo}${r.maxAforo === null ? '+' : '–' + r.maxAforo}) ${money(r.tarifaBase)}`).join(' · ')}</p>}
    </form>
  );
}

/* ---------- Personal: puerta y patrocinadores ---------- */
const emptyStaff = { role: 'door', name: '', email: '', password: '', empresa: '', sector: '', contacto: '' };
function Personal() {
  const { data, loading, error, reload } = useFetch(() => api.get('/staff').then((r) => r.data));
  const [f, setF] = useState(emptyStaff);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const on = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    const body = { role: f.role, name: f.name, email: f.email, password: f.password };
    if (f.role === 'stakeholder') Object.assign(body, { empresa: f.empresa, sector: f.sector, contacto: f.contacto });
    try { await api.post('/staff', body); toast(`${ROLE_LABEL[f.role]} creado`); setF(emptyStaff); reload(); } catch (e2) { setErr(errMsg(e2)); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={submit} className="card h-fit space-y-4 p-6">
        <h2 className="display text-xl">Crear usuario de staff</h2>
        <Field label="Tipo de usuario">
          <select className="input" name="role" value={f.role} onChange={on}><option value="door">Personal de puerta</option><option value="stakeholder">Patrocinador (stakeholder)</option></select>
        </Field>
        <Field label="Nombre"><input className="input" name="name" value={f.name} onChange={on} required /></Field>
        <Field label="Correo"><input className="input" type="email" name="email" value={f.email} onChange={on} required /></Field>
        <Field label="Contraseña inicial" hint="Mínimo 6 caracteres."><input className="input" type="password" name="password" value={f.password} onChange={on} minLength={6} required autoComplete="new-password" /></Field>
        {f.role === 'stakeholder' && (
          <div className="space-y-4 border-t border-line pt-4">
            <Field label="Empresa"><input className="input" name="empresa" value={f.empresa} onChange={on} required /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sector"><input className="input" name="sector" value={f.sector} onChange={on} required /></Field>
              <Field label="Contacto"><input className="input" name="contacto" value={f.contacto} onChange={on} required /></Field>
            </div>
          </div>
        )}
        {err && <Alert>{err}</Alert>}
        <button className="btn btn-primary w-full" disabled={saving}>{saving ? <Spinner /> : 'Crear usuario'}</button>
      </form>

      <section>
        <h2 className="eyebrow mb-3">Usuarios del staff</h2>
        {error && <Alert>{error}</Alert>}
        {loading && !data ? <ListSkeleton rows={2} /> : (
          <ul className="card divide-y divide-line">
            {(data || []).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{u.name}</p><p className="truncate text-xs text-muted">{u.email}</p></div>
                <Badge tone={u.role === 'admin' ? 'accent' : u.role === 'stakeholder' ? 'ok' : 'neutral'}>{ROLE_LABEL[u.role] || u.role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- Datos de demostración ---------- */
function Demo() {
  const { data, loading, error, reload } = useFetch(() => api.get('/demo').then((r) => r.data));
  const [busy, setBusy] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  const load = async () => {
    setBusy('load');
    try { const { data: d } = await api.post('/demo'); toast(`Datos cargados: ${d.eventos} eventos, ${d.artistas} artistas.`); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const clear = async () => {
    if (!(await confirm({ title: 'Borrar datos de demostración', body: 'Se eliminarán solo los eventos, artistas, asistentes e inscripciones de ejemplo. Tus datos reales no se tocan.', danger: true, confirmLabel: 'Borrar' }))) return;
    setBusy('clear');
    try { await api.delete('/demo'); toast('Datos de demostración eliminados'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };

  if (loading && !data) return <ListSkeleton rows={1} />;
  return (
    <div className="card max-w-2xl p-6">
      <h2 className="display text-xl">Historial de ejemplo</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Para que el motor de valoración tenga qué analizar, puedes cargar un historial ficticio: 19 eventos finalizados con miles de asistentes y reseñas, 7 artistas con distintas trayectorias y 2 eventos futuros (uno con aforo 5 para probar la lista de espera). Todo queda marcado como demostración y se puede borrar sin afectar tus datos.</p>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {data && (
        <p className="mt-5 text-sm">{data.cargados ? <Badge tone="ok" icon="check">{data.eventos} eventos · {data.artistas} artistas · {data.asistentes} asistentes de ejemplo cargados</Badge> : <Badge>Sin datos de demostración</Badge>}</p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={load} disabled={!!busy || data?.cargados}>{busy === 'load' ? <><Spinner />Cargando…</> : 'Cargar datos de demostración'}</button>
        <button className="btn btn-danger" onClick={clear} disabled={!!busy || !data?.cargados}>{busy === 'clear' ? <Spinner /> : 'Borrar datos de demostración'}</button>
      </div>
    </div>
  );
}
