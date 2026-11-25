import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import api, { errMsg } from '../api';
import { fmtDateTime, fmtTime, money } from '../format';
import { Alert, Badge, Empty, Field, Icon, ListSkeleton, Modal, PageHeader, Spinner, Stars, Tabs, useConfirm, useFetch, useToast } from '../components/ui';

const ESTADO = {
  Confirmada: { tone: 'ok', label: 'Confirmada' },
  EnEspera: { tone: 'warn', label: 'En lista de espera' },
  Ingresada: { tone: 'accent', label: 'Ingresaste' },
  Cancelada: { tone: 'neutral', label: 'Cancelada' },
};
const RESENA = { Pendiente: ['warn', 'Reseña en revisión'], Aprobada: ['ok', 'Reseña publicada'], Rechazada: ['bad', 'Reseña rechazada'] };

function Qr({ token }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(token, { margin: 1, width: 360, color: { dark: '#18181b', light: '#ffffff' } }).then(setSrc); }, [token]);
  return src ? <img src={src} alt="Código QR de tu entrada" className="h-44 w-44 rounded-xl border border-line" /> : <div className="skeleton h-44 w-44" />;
}

export default function MisEntradas() {
  const { data, loading, error, reload } = useFetch(() => api.get('/registrations/mine').then((r) => r.data));
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('activas');
  const [reviewing, setReviewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const activas = (data || []).filter((i) => i.estado !== 'Cancelada');
  const canceladas = (data || []).filter((i) => i.estado === 'Cancelada');
  const list = tab === 'activas' ? activas : canceladas;

  const cancel = async (i) => {
    const ok = await confirm({
      title: 'Cancelar inscripción',
      body: i.estado === 'EnEspera' ? `Saldrás de la lista de espera de “${i.evento.nombre}”.` : `Perderás tu cupo en “${i.evento.nombre}” y se liberará para la lista de espera. Podrás volver a inscribirte si hay lugar.`,
      danger: true, confirmLabel: 'Sí, cancelar',
    });
    if (!ok) return;
    setCancelling(i.id);
    try { await api.patch(`/registrations/${i.id}/cancel`); toast('Inscripción cancelada'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setCancelling(null); }
  };

  return (
    <div>
      <PageHeader eyebrow="Tu cuenta" title="Mis entradas" subtitle="Muestra el código QR en la puerta. Cada código funciona una sola vez." />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <ListSkeleton /> : (
        <>
          <div className="mb-6"><Tabs label="Estado" value={tab} onChange={setTab} tabs={[{ id: 'activas', label: 'Vigentes', count: activas.length }, { id: 'canceladas', label: 'Canceladas', count: canceladas.length }]} /></div>
          {list.length === 0 ? (
            <Empty icon="ticket" title={tab === 'activas' ? 'Aún no tienes entradas' : 'No hay entradas canceladas'} action={tab === 'activas' && <Link to="/" className="btn btn-primary">Explorar eventos</Link>}>
              {tab === 'activas' && 'Inscríbete a un evento y tu código QR aparecerá aquí.'}
            </Empty>
          ) : (
            <ul className="space-y-4">
              {list.map((i) => {
                const st = ESTADO[i.estado];
                const finalizado = new Date(i.evento.fechaFin) < new Date();
                return (
                  <li key={i.id} className="card anim-up overflow-hidden">
                    <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {i.estado === 'EnEspera' && <Badge tone="warn">Puesto {i.posicionEnEspera}</Badge>}
                          {i.resena && <Badge tone={RESENA[i.resena.estado][0]} icon="star">{RESENA[i.resena.estado][1]}</Badge>}
                        </div>
                        <h2 className="display text-2xl leading-snug">{i.evento.nombre}</h2>
                        <dl className="mt-3 space-y-1.5 text-sm text-muted">
                          <div className="flex items-center gap-2"><Icon name="calendar" size={15} />{fmtDateTime(i.evento.fechaInicio)}</div>
                          <div className="flex items-center gap-2"><Icon name="pin" size={15} />{i.evento.ubicacion}</div>
                          <div className="flex items-center gap-2"><Icon name="ticket" size={15} />{i.zona.nombre} · {money(i.zona.precio)}</div>
                        </dl>
                        {i.estado === 'Ingresada' && <p className="mt-3 text-sm text-muted">Ingreso registrado a las {fmtTime(i.checkedInAt)}.</p>}
                        {i.estado === 'EnEspera' && <p className="mt-3 text-sm text-muted">Si alguien cancela, pasarás a confirmada automáticamente. No necesitas hacer nada.</p>}
                        {i.resena?.respuestaAdmin && <p className="mt-3 border-l-2 border-accent pl-3 text-sm text-muted"><span className="font-medium text-ink">Respuesta de la organización:</span> {i.resena.respuestaAdmin}</p>}

                        <div className="mt-5 flex flex-wrap gap-2">
                          {i.estado === 'Ingresada' && !i.resena && finalizado && <button className="btn btn-accent btn-sm" onClick={() => setReviewing(i)}><Icon name="star" size={14} />Dejar una reseña</button>}
                          {i.estado === 'Ingresada' && !i.resena && !finalizado && <span className="text-sm text-muted">Podrás reseñar cuando el evento termine.</span>}
                          {(i.estado === 'Confirmada' || i.estado === 'EnEspera') && (
                            <button className="btn btn-danger btn-sm" disabled={cancelling === i.id} onClick={() => cancel(i)}>{cancelling === i.id ? <Spinner /> : 'Cancelar inscripción'}</button>
                          )}
                        </div>
                      </div>
                      {i.estado === 'Confirmada' && (
                        <div className="flex flex-col items-center gap-2 border-t border-line pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                          <Qr token={i.token} />
                          <p className="text-xs text-muted">Preséntalo en la puerta</p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {reviewing && <ReviewModal insc={reviewing} onClose={() => setReviewing(null)} onSaved={() => { setReviewing(null); toast('¡Gracias! Tu reseña será revisada antes de publicarse.'); reload(); }} />}
    </div>
  );
}

function ReviewModal({ insc, onClose, onSaved }) {
  const [cal, setCal] = useState(0);
  const [txt, setTxt] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!cal) return setErr('Elige una calificación de 1 a 5 estrellas');
    setSaving(true); setErr('');
    try { await api.post('/reviews', { inscripcionId: insc.id, calificacion: cal, comentario: txt || undefined }); onSaved(); } catch (e2) { setErr(errMsg(e2)); } finally { setSaving(false); }
  };
  return (
    <Modal title="Tu reseña" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-muted">¿Cómo fue <span className="font-medium text-ink">{insc.evento.nombre}</span>? Solo puedes reseñar una vez.</p>
        <div><p className="label">Calificación</p><Stars value={cal} onChange={setCal} size={30} /></div>
        <Field label="Comentario (opcional)"><textarea className="input" rows={4} value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={500} placeholder="Cuéntanos qué te gustó o qué mejorarías" /></Field>
        {err && <Alert>{err}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : 'Enviar reseña'}</button>
        </div>
      </form>
    </Modal>
  );
}
