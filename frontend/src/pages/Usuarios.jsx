import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { PERFIL_ROTULO } from '../utils';

/** Somente o Administrador Geral: cria usuários e ativa/desativa acessos. */
export default function Usuarios() {
  const { usuario: eu } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'admin_secretario' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setUsuarios(await api.get('/usuarios'));
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await api.post('/usuarios', form);
      setForm({ nome: '', email: '', senha: '', perfil: 'admin_secretario' });
      carregar();
    } catch (err) {
      setErro(err.message);
    }
    setSalvando(false);
  }

  async function alternar(u) {
    try {
      await api.patch(`/usuarios/${u.uid}`, { ativo: !u.ativo });
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <h1>Usuários</h1>
      </div>

      <form className="formulario caixa" onSubmit={criar}>
        <h3>Novo usuário</h3>
        <div className="linha">
          <label>
            Nome
            <input value={form.nome} onChange={mudar('nome')} required />
          </label>
          <label>
            E-mail
            <input type="email" value={form.email} onChange={mudar('email')} required />
          </label>
        </div>
        <div className="linha">
          <label>
            Senha inicial (mín. 8 caracteres)
            <input type="password" value={form.senha} onChange={mudar('senha')} minLength={8} required />
          </label>
          <label>
            Perfil
            <select value={form.perfil} onChange={mudar('perfil')}>
              {Object.entries(PERFIL_ROTULO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar usuário'}
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}

      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Acesso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.uid}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{PERFIL_ROTULO[u.perfil]}</td>
                <td>
                  <span className={`selo ${u.ativo ? 'status-concluido' : 'status-interrompido'}`}>
                    {u.ativo ? 'Ativo' : 'Desativado'}
                  </span>
                </td>
                <td className="acoes">
                  {u.uid !== eu.uid && (
                    <button className="btn secundario pequeno" onClick={() => alternar(u)}>
                      {u.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
