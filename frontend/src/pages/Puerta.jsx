import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import api, { errMsg } from '../api';
import { fmtDateTime, fmtTime, isFinished } from '../format';
import { Alert, Empty, Field, Icon, PageHeader, Spinner, useFetch } from '../components/ui';

const RESULT = {
  valida: { tone: 'ok', title: 'Ingreso válido', icon: 'check', cls: 'bg-ok text-white' },
  ya_usada: { tone: 'bad', title: 'Entrada ya usada', icon: 'x', cls: 'bg-bad text-white' },
  cancelada: { tone: 'bad', title: 'Inscripción cancelada', icon: 'x', cls: 'bg-bad text-white' },
  otro_evento: { tone: 'warn', title: 'Es de otro evento', icon: 'alert', cls: 'bg-warn text-white' },
  en_espera: { tone: 'warn', title: 'En lista de espera', icon: 'alert', cls: 'bg-warn text-white' },
  evento_finalizado: { tone: 'warn', title: 'Evento finalizado', icon: 'alert', cls: 'bg-warn text-white' },
  invalida: { tone: 'bad', title: 'Código no válido', icon: 'x', cls: 'bg-bad text-white' },
};

export default function Puerta() {
  const { data: eventos } = useFetch(() => api.get('/events').then((r) => r.data.filter((e) => !isFinished(e)).sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))));
  const [eventoId, setEventoId] = useState('');
  const [att, setAtt] = useState(null);
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState('');
  const [sending, setSending] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lastRef = useRef({ code: '', at: 0 });
  const eventoRef = useRef('');
  eventoRef.current = eventoId;

  const loadAtt = useCallback(() => {
    if (eventoRef.current) api.get('/registrations/attendance', { params: { eventId: eventoRef.current } }).then((r) => setAtt(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    setAtt(null); setResult(null);
    if (!eventoId) return;
    loadAtt();
    const t = setInterval(loadAtt, 8000);
    return () => clearInterval(t);
  }, [eventoId, loadAtt]);

  const submit = useCallback(async (token) => {
    const ev = eventoRef.current;
    if (!ev) return;
    setSending(true);
    try {
      const { data } = await api.post('/registrations/checkin', { token: token.trim(), eventoId: Number(ev) });
      setResult(data);
      navigator.vibrate?.(data.resultado === 'valida' ? 80 : [120, 60, 120]);
      loadAtt();
    } catch (e) {
      setResult({ resultado: 'invalida', mensaje: errMsg(e) });
    } finally { setSending(false); }
  }, [loadAtt]);

  const stopCam = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }, []);
  useEffect(() => stopCam, [stopCam]);

  const tick = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current;
    if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(v, 0, 0);
      const img = ctx.getImageData(0, 0, c.width, c.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        const now = Date.now();
        // Evita leer el mismo QR varias veces seguidas mientras sigue frente a la cámara
        if (code.data !== lastRef.current.code || now - lastRef.current.at > 3500) {
          lastRef.current = { code: code.data, at: now };
          submit(code.data);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [submit]);

  const startCam = async () => {
    setCamErr('');
    if (!navigator.mediaDevices?.getUserMedia) return setCamErr('Tu navegador no permite usar la cámara aquí (se requiere HTTPS). Usa el ingreso manual.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch {
      setCamErr('No se pudo acceder a la cámara. Revisa el permiso del navegador o usa el ingreso manual.');
    }
  };

  const r = result && (RESULT[result.resultado] || RESULT.invalida);

  return (
    <div>
      <PageHeader eyebrow="Puerta" title="Control de acceso" subtitle="Escanea el código QR de cada asistente. Cada entrada solo puede usarse una vez." />

      <div className="card mb-6 p-5">
        <Field label="Evento que estás controlando">
          <select className="input" value={eventoId} onChange={(e) => { setEventoId(e.target.value); stopCam(); }}>
            <option value="">{eventos === null ? 'Cargando…' : eventos?.length ? 'Selecciona un evento' : 'No hay eventos próximos'}</option>
            {(eventos || []).map((e) => <option key={e.id} value={e.id}>{e.nombre} · {fmtDateTime(e.fechaInicio)}</option>)}
          </select>
        </Field>
      </div>

      {!eventoId ? (
        <Empty icon="scan" title="Elige un evento para comenzar">Después podrás activar la cámara o escribir el código a mano.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            {/* Resultado: bloque grande y claro, también para leer de lejos */}
            <section aria-live="assertive" className={`rounded-2xl p-8 text-center transition-colors ${r ? r.cls : 'border border-dashed border-line bg-surface text-muted'}`}>
              {sending ? <div className="flex flex-col items-center gap-3 py-6"><Spinner className="h-8 w-8" /><p>Verificando…</p></div> : r ? (
                <div className="anim-up flex flex-col items-center py-2">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-white/20"><Icon name={r.icon} size={34} /></span>
                  <h2 className="display mt-4 text-4xl">{r.title}</h2>
                  {result.titular && <p className="mt-3 text-2xl font-medium">{result.titular}</p>}
                  {result.zona && <p className="mt-1 text-white/80">{result.zona} · {result.evento}</p>}
                  {result.resultado === 'ya_usada' && result.checkedInAt && <p className="mt-3 rounded-full bg-white/20 px-4 py-1.5 text-sm">Primer ingreso a las {fmtTime(result.checkedInAt)}</p>}
                  {(!result.titular || result.resultado !== 'valida') && <p className="mt-3 max-w-md text-white/90">{result.mensaje}</p>}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6"><Icon name="scan" size={36} /><p className="mt-3">Esperando un código…</p></div>
              )}
            </section>

            <section className="card overflow-hidden">
              {camOn ? (
                <div className="relative bg-ink">
                  <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover sm:aspect-video" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center"><div className="h-52 w-52 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]" /></div>
                  <button onClick={stopCam} className="btn btn-outline btn-sm absolute right-3 top-3">Apagar cámara</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <p className="text-sm text-muted">La cámara se activa solo cuando tú lo decides.</p>
                  <button onClick={startCam} className="btn btn-primary btn-lg"><Icon name="scan" size={18} />Activar cámara y escanear</button>
                  {camErr && <div className="mt-2 w-full max-w-md text-left"><Alert type="warn">{camErr}</Alert></div>}
                </div>
              )}
            </section>

            <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { submit(manual); setManual(''); } }} className="card p-5">
              <Field label="Ingreso manual del código" hint="Úsalo si la cámara falla: pega o escribe el código bajo el QR.">
                <div className="flex gap-2">
                  <input className="input font-mono" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" />
                  <button className="btn btn-outline" disabled={!manual.trim() || sending}>Validar</button>
                </div>
              </Field>
            </form>
          </div>

          <aside className="card h-fit p-6 lg:sticky lg:top-24">
            <p className="eyebrow">Ingresaron</p>
            <p className="display num mt-2 text-[56px] leading-none">{att ? att.ingresados : '—'}</p>
            <p className="num mt-2 text-sm text-muted">de {att ? att.confirmados : '—'} con cupo confirmado</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${att && att.confirmados ? (att.ingresados / att.confirmados) * 100 : 0}%` }} /></div>
          </aside>
        </div>
      )}
    </div>
  );
}
