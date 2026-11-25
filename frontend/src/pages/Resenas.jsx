import { useState } from 'react';
import api, { errMsg } from '../api';
import { fmtDate } from '../format';
import { Alert, Badge, Empty, Icon, ListSkeleton, PageHeader, Spinner, Stars, Tabs, useFetch, useToast } from '../components/ui';

const TONE = { Pendiente: 'warn', Aprobada: 'ok', Rechazada: 'bad' };

export default function Resenas() {
  const [tab, setTab] = useState('Pendiente');
  const { data, loading, error, reload } = useFetch(() => api.get('/reviews', { params: { estado: tab } }).then((r) => r.data), [tab]);
  const { data: all } = useFetch(() => api.get('/reviews').then((r) => r.data));
  const countOf = (s) => (all || []).filter((r) => r.estado === s).length;
  const refreshAll = () => reload();

  return (
    <div>
      <PageHeader eyebrow="Moderación" title="Reseñas" subtitle="Solo las reseñas aprobadas se publican y cuentan para el índice de valor del evento. Puedes responder públicamente al aprobar." />
      <div className="mb-6"><Tabs label="Estado" value={tab} onChange={setTab} tabs={['Pendiente', 'Aprobada', 'Rechazada'].map((s) => ({ id: s, label: s === 'Pendiente' ? 'Pendientes' : s === 'Aprobada' ? 'Aprobadas' : 'Rechazadas', count: all ? countOf(s) : undefined }))} /></div>
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <ListSkeleton /> : !data?.length ? (
        <Empty icon="msg" title={tab === 'Pendiente' ? 'Todo al día' : 'Sin reseñas'}>{tab === 'Pendiente' ? 'No hay reseñas esperando moderación.' : 'No hay reseñas en este estado.'}</Empty>
      ) : (
        <ul className="space-y-3">{data.map((r) => <Item key={r.id} r={r} onDone={refreshAll} />)}</ul>
      )}
    </div>
  );
}

function Item({ r, onDone }) {
  const [resp, setResp] = useState(r.respuestaAdmin || '');
  const [busy, setBusy] = useState('');
  const toast = useToast();
  const act = async (estado) => {
    setBusy(estado);
    try { await api.patch(`/reviews/${r.id}/moderate`, { estado, respuestaAdmin: resp.trim() || undefined }); toast(estado === 'Aprobada' ? 'Reseña aprobada' : 'Reseña rechazada'); onDone(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  return (
    <li className="card anim-up p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3"><Stars value={r.calificacion} size={17} /><Badge tone={TONE[r.estado]}>{r.estado}</Badge></div>
        <span className="text-xs text-muted">{r.autor} · {fmtDate(r.createdAt)}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-muted">{r.evento.nombre}</p>
      <p className="mt-2 text-[15px] leading-relaxed">{r.comentario ? `“${r.comentario}”` : <span className="text-muted">Sin comentario</span>}</p>
      <div className="mt-4">
        <label className="label" htmlFor={`resp-${r.id}`}>Respuesta pública (opcional)</label>
        <textarea id={`resp-${r.id}`} className="input" rows={2} value={resp} onChange={(e) => setResp(e.target.value)} placeholder="Agradece o aclara algo a quien reseñó" />
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {r.estado !== 'Rechazada' && <button className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => act('Rechazada')}>{busy === 'Rechazada' ? <Spinner /> : 'Rechazar'}</button>}
        {r.estado !== 'Aprobada' ? (
          <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => act('Aprobada')}>{busy === 'Aprobada' ? <Spinner /> : <><Icon name="check" size={14} />Aprobar</>}</button>
        ) : <button className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => act('Aprobada')}>Guardar respuesta</button>}
      </div>
    </li>
  );
}
