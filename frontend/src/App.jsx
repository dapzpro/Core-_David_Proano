import { Navigate, Route, Routes } from 'react-router-dom';
import { getUser } from './api';
import Layout, { homeFor } from './components/Layout';
import Login from './Login';
import Eventos from './pages/Eventos';
import MisEntradas from './pages/MisEntradas';
import Puerta from './pages/Puerta';
import Valoracion from './pages/Valoracion';
import Artistas from './pages/Artistas';
import Ofertas from './pages/Ofertas';
import Resenas from './pages/Resenas';
import Ajustes from './pages/Ajustes';

// Protege una ruta: exige sesión y, opcionalmente, ciertos roles. Es solo UX; la seguridad real está en el backend.
function Guard({ roles, children }) {
  const user = getUser();
  if (!user || !localStorage.getItem('token')) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

const page = (roles, el) => <Guard roles={roles}>{el}</Guard>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route path="/" element={page(['admin', 'user'], <Eventos />)} />
        <Route path="/entradas" element={page(['user'], <MisEntradas />)} />
        <Route path="/puerta" element={page(['door', 'admin'], <Puerta />)} />
        <Route path="/valoracion" element={page(['admin', 'stakeholder'], <Valoracion />)} />
        <Route path="/artistas" element={page(['admin', 'stakeholder'], <Artistas />)} />
        <Route path="/ofertas" element={page(['admin', 'stakeholder'], <Ofertas />)} />
        <Route path="/resenas" element={page(['admin'], <Resenas />)} />
        <Route path="/ajustes" element={page(['admin'], <Ajustes />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
