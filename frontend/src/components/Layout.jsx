import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getUser, logout } from '../api';
import { ROLE_LABEL } from '../format';
import { Icon, Logo } from './ui';

export const NAV = {
  user: [
    { to: '/', label: 'Eventos', end: true },
    { to: '/entradas', label: 'Mis entradas' },
  ],
  door: [{ to: '/puerta', label: 'Control de acceso' }],
  stakeholder: [
    { to: '/valoracion', label: 'Recomendados' },
    { to: '/artistas', label: 'Artistas' },
    { to: '/ofertas', label: 'Mis ofertas' },
  ],
  admin: [
    { to: '/', label: 'Eventos', end: true },
    { to: '/resenas', label: 'Reseñas' },
    { to: '/valoracion', label: 'Valoración' },
    { to: '/ofertas', label: 'Ofertas' },
    { to: '/artistas', label: 'Artistas' },
    { to: '/ajustes', label: 'Ajustes' },
  ],
};
export const homeFor = (role) => ({ door: '/puerta', stakeholder: '/valoracion' }[role] || '/');

export default function Layout() {
  const user = getUser();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const links = NAV[user?.role] || [];

  const linkCls = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-sunken text-ink' : 'text-muted hover:text-ink'}`;

  return (
    <div className="min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <NavLink to={homeFor(user?.role)} aria-label="Inicio"><Logo /></NavLink>
          <nav aria-label="Principal" className="ml-2 hidden items-center gap-1 md:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>)}
          </nav>
          <div className="ml-auto hidden items-center gap-4 md:flex">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[user?.role]}</p>
            </div>
            <button onClick={logout} className="btn btn-outline btn-sm"><Icon name="logout" size={15} />Salir</button>
          </div>
          <button className="btn btn-ghost ml-auto !px-2 md:hidden" aria-label="Menú" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? 'x' : 'menu'} size={22} />
          </button>
        </div>
        {open && (
          <div className="anim-in border-t border-line bg-paper px-5 pb-4 pt-2 md:hidden">
            <nav aria-label="Principal móvil" className="flex flex-col">
              {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `rounded-lg px-3 py-3 text-[15px] font-medium ${isActive ? 'bg-sunken' : 'text-muted'}`}>{l.label}</NavLink>)}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-line px-3 pt-4">
              <div className="leading-tight"><p className="text-sm font-medium">{user?.name}</p><p className="text-xs text-muted">{ROLE_LABEL[user?.role]}</p></div>
              <button onClick={logout} className="btn btn-outline btn-sm">Salir</button>
            </div>
          </div>
        )}
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <Outlet />
      </main>
    </div>
  );
}
