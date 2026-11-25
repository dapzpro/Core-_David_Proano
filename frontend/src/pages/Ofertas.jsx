import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, getUser } from '../api';
import { fmtDate, money, pct } from '../format';
import { Alert, Badge, Empty, Icon, ListSkeleton, PageHeader, Spinner, Tabs, useConfirm, useFetch, useToast } from '../components/ui';

const ESTADO = { Publicada: ['warn', 'Pendiente de respuesta'], Aceptada: ['ok', 'Aceptada'], Rechazada: ['bad', 'Rechazada'] };

export default function Ofertas() {
  const isAdmin = getUser().role === 'admin';
  const { data, loading, error, reload } = useFetch(() => api.get(isAdmin ? '/offers' : '/offers/mine').then((r) => r.data), [isAdmin]);
  const [tab, setTab] = useState('Publicada');
  const [busy, setBusy] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();

  const respond = async (o, accion) => {
    const ok = await confirm({
      title: accion === 'aceptar' ? 'Aceptar oferta' : 'Rechazar oferta',
      body: accion === 'aceptar' ? `Aceptas el paquete de “${o.evento.nombre}” por ${money(o.precio)}.` : `Rechazarás el paquete de “${o.evento.nombre}”. No se puede deshacer.`,
      danger: accion === 'rechazar', confirmLabel: accion === 'aceptar' ? 'Aceptar' : 'Rechazar',
    });
    if (!ok) return;
    setBusy(o.id);
    try { await api.patch(`/offers/${o.id}/respond`, { accion }); toast(accion === 'aceptar' ? 'Oferta aceptada' : 'Oferta rechazada'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };

  const count = (s) => (data || []).filter((o) => o.estado === s).length;
  const list = (data || []).filter((o) => o.estado === tab);

  return (
    <div>
      <PageHeader eyebrow="Patrocinios" title={isAdmin ? 'Ofertas publicadas' : 'Mis ofertas'}
        subtitle={isAdmin ? 'Seguimiento de los paquetes ofrecidos a cada patrocinador. Se publican desde la sección Valoración.' : 'Paquetes que la organización preparó para ti, con el precio calculado según el valor real de cada evento.'} />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <ListSkeleton /> : (
        <>
          <div className="mb-6"><Tabs label="Estado" value={tab} onChange={setTab} tabs={Object.keys(ESTADO).map((k) => ({ id: k, label: ESTADO[k][1], count: count(k) }))} /></div>
          {list.length === 0 ? (
            <Empty icon="mail" title="Nada por aquí" action={isAdmin && tab === 'Publicada' && <Link to="/valoracion" className="btn btn-primary">Ir a Valoración</Link>}>
              {isAdmin ? 'No hay ofertas en este estado.' : tab === 'Publicada' ? 'Cuando la organización publique una oferta para ti, aparecerá aquí.' : 'No hay ofertas en este estado.'}
            </Empty>
          ) : (
            <ul className="space-y-3">
              {list.map((o) => (
                <li key={o.id} className="card anim-up flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Badge tone={ESTADO[o.estado][0]}>{ESTADO[o.estado][1]}</Badge>
                    <h2 className="display mt-3 text-2xl leading-snug">{o.evento.nombre}</h2>
                    <p className="mt-1 text-sm text-muted">{isAdmin && <>Para <b className="font-medium text-ink">{o.stakeholder.empresa}</b> · </>}Evento del {fmtDate(o.evento.fechaInicio)} · publicada el {fmtDate(o.createdAt)}{o.respondedAt && ` · respondida el ${fmtDate(o.respondedAt)}`}</p>
                  </div>
                  <div className="flex items-center gap-6 sm:flex-col sm:items-end sm:gap-3">
                    <div className="sm:text-right"><p className="eyebrow">Paquete</p><p className="display num text-3xl">{money(o.precio)}</p><p className="num text-xs text-muted">Índice de valor {pct(o.indiceValor)}</p></div>
                    {!isAdmin && o.estado === 'Publicada' && (
                      <div className="ml-auto flex gap-2 sm:ml-0">
                        <button className="btn btn-outline btn-sm" disabled={busy === o.id} onClick={() => respond(o, 'rechazar')}>Rechazar</button>
                        <button className="btn btn-primary btn-sm" disabled={busy === o.id} onClick={() => respond(o, 'aceptar')}>{busy === o.id ? <Spinner /> : <><Icon name="check" size={14} />Aceptar</>}</button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
