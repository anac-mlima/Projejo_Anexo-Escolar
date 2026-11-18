import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import TelaInicial from './pages/TelaInicial';
import Frequencia from './pages/Frequencia';
import Login from './pages/Login';
import Professores from './pages/Professores';
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

/** Restringe uma rota a certos perfis (a API também confere — isto é só para a tela). */
function SomentePerfil({ perfis, children }) {
  const { usuario } = useAuth();
  return perfis.includes(usuario.perfil) ? children : <Navigate to="/turmas" replace />;
}

const ADMINS = ['admin_geral', 'admin_secretario'];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TelaInicial />} />
      <Route path="/login" element={<Login />} />

      <Route element={<AreaProtegida />}>
        <Route path="turmas" element={<Turmas />} />
        <Route
          path="turmas/:turmaId"
          element={
            <SomentePerfil perfis={ADMINS}>
              <TurmaAlunos />
            </SomentePerfil>
          }
        />
        {/* Chamada e relatório de faltas: professor da turma e administradores. */}
        <Route path="turmas/:turmaId/frequencia" element={<Frequencia />} />
        <Route
          path="geral"
          element={
            <SomentePerfil perfis={ADMINS}>
              <VisaoGeral />
            </SomentePerfil>
          }
        />
        <Route
          path="professores"
          element={
            <SomentePerfil perfis={['admin_geral']}>
              <Professores />
            </SomentePerfil>
          }
        />
        <Route
          path="usuarios"
          element={
            <SomentePerfil perfis={['admin_geral']}>
              <Usuarios />
            </SomentePerfil>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}