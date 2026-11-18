import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';

const FORM_VAZIO = { nome: '', email: '', senha: '' };

/** Somente o Administrador Geral: cadastra professores. O vínculo com a turma é feito em "Turmas". */
export default function Professores() {
  const [professores, setProfessores] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setProfessores(await api.get('/professores'));
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
      await api.post('/professores', form);
      setForm(FORM_VAZIO);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
    setSalvando(false);
  }

  async function alternar(p) {
    setErro('');
    try {
      await api.patch(`/professores/${p.uid}`, { ativo: !p.ativo });
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <h1>Professores</h1>
      </div>

      <form className="formulario caixa" onSubmit={criar}>
        <h3>Novo professor</h3>
        <div className="linha">
          <label>
            Nome
            <input value={form.nome} onChange={mudar('nome')} required />
          </label>
          <label>
            E-mail (será o login)
            <input type="email" value={form.email} onChange={mudar('email')} required />
          </label>
        </div>
        <label>
          Senha inicial (mín. 8 caracteres)
          <input type="password" value={form.senha} onChange={mudar('senha')} minLength={8} required />
        </label>
        <button className="btn" disabled={salvando}>
          {salvando ? 'Cadastrando…' : 'Cadastrar professor'}
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}
      {professores.length === 0 && <p className="vazio">Nenhum professor cadastrado.</p>}

      {professores.length > 0 && (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Turmas</th>
                <th>Acesso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {professores.map((p) => (
                <tr key={p.uid}>
                  <td>{p.nome}</td>
                  <td>{p.email}</td>
                  <td>
                    {p.turmas.length === 0 ? (
                      <span className="sem-docs">Nenhuma turma</span>
                    ) : (
                      <ul className="chips">
                        {p.turmas.map((t) => (
                          <li key={t.id}>
                            <Link to={`/turmas/${t.id}/frequencia`}>
                              {t.nome} ({t.anoLetivo})
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <span className={`selo ${p.ativo ? 'status-concluido' : 'status-interrompido'}`}>
                      {p.ativo ? 'Ativo' : 'Desativado'}
                    </span>
                  </td>
                  <td className="acoes">
                    <button className="btn secundario pequeno" onClick={() => setEditando(p)}>
                      Editar nome
                    </button>
                    <button className="btn secundario pequeno" onClick={() => alternar(p)}>
                      {p.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <EditarNome
          professor={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </>
  );
}

function EditarNome({ professor, onFechar, onSalvo }) {
  const [nome, setNome] = useState(professor.nome);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await api.put(`/professores/${professor.uid}`, { nome });
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <Modal titulo="Editar professor" onFechar={onFechar}>
      <form onSubmit={salvar} className="formulario">
        <label>
          Nome *
          <input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <div className="acoes-modal">
          <button type="button" className="btn secundario" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}