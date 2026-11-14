import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { PERFIL_ROTULO } from '../utils';

export default function Layout({ children }) {
  const { usuario, sair } = useAuth();
  const classe = ({ isActive }) => (isActive ? 'ativo' : '');

  return (
    <>
      <header className="topo">
        <strong className="marca">Sistema Escolar</strong>
        <nav>
          <NavLink to="turmas" end className={classe}>
            Turmas
          </NavLink>
          <NavLink to="/geral" className={classe}>
            Visão geral de alunos
          </NavLink>
          {usuario.perfil === 'admin_geral' && (
            <NavLink to="/usuarios" className={classe}>
              Usuários
            </NavLink>
          )}
        </nav>
        <div className="usuario">
          <span>
            {usuario.nome}
            <small>{PERFIL_ROTULO[usuario.perfil]}</small>
          </span>
          <button className="btn secundario" onClick={sair}>
            Sair
          </button>
        </div>
      </header>
      <main className="conteudo">{children}</main>
    </>
  );
}
