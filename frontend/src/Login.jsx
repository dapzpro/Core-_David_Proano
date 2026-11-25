import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api, { errMsg, getUser } from './api';
import { homeFor } from './components/Layout';
import { Alert, Icon, Logo, Spinner } from './components/ui';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const existing = getUser();
  if (existing && localStorage.getItem('token')) return <Navigate to={homeFor(existing.role)} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) await api.post('/auth/register', form);
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(homeFor(data.user.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setIsRegister(!isRegister);
    setError('');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-14 text-white lg:flex">
        <div className="inline-flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white"><span className="h-3.5 w-3.5 rounded-full border-[2.5px] border-ink" /></span>
          <span className="display text-[22px] leading-none">Aforo</span>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="display text-[56px] leading-[1.04]">Cada evento, con el cupo justo.</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
            Inscripciones sin sobreventa, acceso con código QR y una valoración transparente para atraer patrocinadores.
          </p>
        </div>
        <ul className="relative z-10 grid max-w-md grid-cols-3 gap-6 text-sm">
          {[['Aforo', 'nunca se supera'], ['QR', 'de un solo uso'], ['Índice', 'de valor 0–100']].map(([a, b]) => (
            <li key={a}><p className="display text-2xl">{a}</p><p className="mt-1 text-white/50">{b}</p></li>
          ))}
        </ul>
        <div aria-hidden="true" className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-52 -right-24 h-[30rem] w-[30rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-28 right-12 h-[16rem] w-[16rem] rounded-full border border-white/10" />
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="anim-up w-full max-w-[22.5rem]">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="display text-[34px] leading-tight">{isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
          <p className="mt-2 text-[15px] text-muted">
            {isRegister ? 'Regístrate como asistente para inscribirte a eventos.' : 'Inicia sesión para continuar.'}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate={false}>
            {isRegister && (
              <div>
                <label htmlFor="name" className="label">Nombre completo</label>
                <input id="name" name="name" autoComplete="name" value={form.name} onChange={onChange} required className="input" placeholder="Ana Pérez" />
              </div>
            )}
            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required className="input" placeholder="tu@correo.com" />
            </div>
            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <input id="password" name="password" type={show ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={onChange} required minLength={6} className="input pr-16" placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-ink" aria-pressed={show}>
                  {show ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {error && <Alert>{error}</Alert>}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
              {loading ? <><Spinner /> Un momento…</> : isRegister ? 'Crear cuenta' : 'Entrar'}
              {!loading && <Icon name="chevron" size={16} />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
            <button onClick={toggle} className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
