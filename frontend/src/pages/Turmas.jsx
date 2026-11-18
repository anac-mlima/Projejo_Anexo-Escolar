import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Modal from '../components/Modal';

const anoAtual = new Date().getFullYear();

/** Turmas como cards. Só o Administrador Geral cria/edita/exclui. O professor vê só as dele. */
export default function Turmas() {
  const { usuario } = useAuth();
  const ehGeral = usuario.perfil === 'admin_geral';
  const ehProfessor = usuario.perfil === 'professor';

  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setTurmas(await api.get('/turmas'));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluir(turma) {
    if (!window.confirm(`Excluir a turma "${turma.nome}"?`)) return;
    try {
      await api.delete(`/turmas/${turma.id}`);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <h1>{ehProfessor ? 'Minhas turmas' : 'Turmas'}</h1>
        {ehGeral && (
          <button
            className="btn"
            onClick={() => setEditando({ nome: '', anoLetivo: anoAtual, descricao: '', professorId: '' })}
          >
            + Nova turma
          </button>
        )}
      </div>

      {erro && <p className="erro">{erro}</p>}
      {carregando && <p>Carregando…</p>}
      {!carregando && turmas.length === 0 && (
        <p className="vazio">
          {ehProfessor
            ? 'Você ainda não foi vinculado a nenhuma turma. Peça ao Administrador Geral.'
            : `Nenhuma turma cadastrada.${
                ehGeral ? ' Clique em "Nova turma" para começar.' : ' Peça ao Administrador Geral para cadastrar as turmas.'
              }`}
        </p>
      )}

      <div className="grade-cards">
        {turmas.map((t) => (
          <div className="card" key={t.id}>
            {/* O professor não vê o cadastro dos alunos: o card leva direto à chamada. */}
            <Link to={ehProfessor ? `/turmas/${t.id}/frequencia` : `/turmas/${t.id}`} className="card-link">
              <h3>{t.nome}</h3>
              <p className="ano">Ano letivo {t.anoLetivo}</p>
              {t.descricao && <p className="descricao">{t.descricao}</p>}
              {!ehProfessor && (
                <p className="descricao">{t.professorNome ? `Professor(a): ${t.professorNome}` : 'Sem professor definido'}</p>
              )}
              <span className="selo">
                {t.totalAlunos} {t.totalAlunos === 1 ? 'aluno' : 'alunos'}
              </span>
            </Link>
            <div className="acoes">
              <Link to={`/turmas/${t.id}/frequencia`} className="btn secundario pequeno">
                {ehProfessor ? 'Fazer chamada' : 'Frequência'}
              </Link>
              {ehGeral && (
                <>
                  <button className="btn secundario pequeno" onClick={() => setEditando(t)}>
                    Editar
                  </button>
                  <button className="btn perigo pequeno" onClick={() => excluir(t)}>
                    Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <FormularioTurma
          turma={editando}
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

function FormularioTurma({ turma, onFechar, onSalvo }) {
  const [form, setForm] = useState({
    nome: turma.nome,
    anoLetivo: turma.anoLetivo,
    descricao: turma.descricao ?? '',
    professorId: turma.professorId ?? '',
  });
  const [professores, setProfessores] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // Professores para o seletor (este formulário só abre para o Administrador Geral).
  useEffect(() => {
    api
      .get('/professores')
      .then(setProfessores)
      .catch((e) => setErro(e.message));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      const dados = { ...form, anoLetivo: Number(form.anoLetivo) };
      if (turma.id) await api.put(`/turmas/${turma.id}`, dados);
      else await api.post('/turmas', dados);
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={turma.id ? 'Editar turma' : 'Nova turma'} onFechar={onFechar}>
      <form onSubmit={salvar} className="formulario">
        <label>
          Nome da turma *
          <input value={form.nome} onChange={mudar('nome')} placeholder="Ex.: 5º Ano A" required autoFocus />
        </label>
        <label>
          Ano letivo *
          <input type="number" min="1990" max={anoAtual + 1} value={form.anoLetivo} onChange={mudar('anoLetivo')} required />
        </label>
        <label>
          Descrição (opcional)
          <input value={form.descricao} onChange={mudar('descricao')} maxLength={200} placeholder="Ex.: Turno da manhã" />
        </label>
        <label>
          Professor responsável (faz a chamada desta turma)
          <select value={form.professorId} onChange={mudar('professorId')}>
            <option value="">Sem professor</option>
            {professores
              .filter((p) => p.ativo || p.uid === turma.professorId)
              .map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.nome}
                  {p.ativo ? '' : ' (acesso desativado)'}
                </option>
              ))}
          </select>
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