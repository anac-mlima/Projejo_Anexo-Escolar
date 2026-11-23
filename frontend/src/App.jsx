import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import TelaInicial from './pages/TelaInicial';
import Login from './pages/Login';
import Turmas from './pages/Turmas';
import TurmaAlunos from './pages/TurmaAlunos';
import Usuarios from './pages/Usuarios';
import VisaoGeral from './pages/VisaoGeral';

/** Só entra quem está logado. */
function AreaProtegida() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="centralizado">Carregando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/** Restringe uma rota a um perfil (a API também confere — isto é só para a tela). */
function SomentePerfil({ perfil, children }) {
  const { usuario } = useAuth();
  return usuario.perfil === perfil ? children : <Navigate to="/turmas" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TelaInicial />} />
      <Route path="/login" element={<Login />} />

      <Route element={<AreaProtegida />}>
        <Route path="turmas" element={<Turmas />} />
        <Route path="turmas/:turmaId" element={<TurmaAlunos />} />
        <Route path="geral" element={<VisaoGeral />} />
        <Route
          path="usuarios"
          element={
            <SomentePerfil perfil="admin_geral">
              <Usuarios />
            </SomentePerfil>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}