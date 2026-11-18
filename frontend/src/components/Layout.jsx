import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { PERFIL_ROTULO } from '../utils';

export default function Layout({ children }) {
  const { usuario, sair } = useAuth();
  const classe = ({ isActive }) => (isActive ? 'ativo' : '');
  const ehProfessor = usuario.perfil === 'professor';

  return (
    <>
      <header className="topo">
        <strong className="marca">Sistema Escolar</strong>
        <nav>
          <NavLink to="turmas" end className={classe}>
            {ehProfessor ? 'Minhas turmas' : 'Turmas'}
          </NavLink>
          {!ehProfessor && (
            <NavLink to="/geral" className={classe}>
              Visão geral de alunos
            </NavLink>
          )}
          {usuario.perfil === 'admin_geral' && (
            <>
              <NavLink to="/professores" className={classe}>
                Professores
              </NavLink>
              <NavLink to="/usuarios" className={classe}>
                Usuários
              </NavLink>
            </>
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