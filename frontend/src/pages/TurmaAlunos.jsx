import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, consulta } from '../api';
import AlunoModal from '../components/AlunoModal';
import DocumentosModal from '../components/DocumentosModal';
import { descreverStatus, formatarData, ORDEM_OPCOES, STATUS_OPCOES, useDebounce } from '../utils';

/** Alunos de UMA turma (aberta ao clicar no card). */
export default function TurmaAlunos() {
  const { turmaId } = useParams();

  const [turma, setTurma] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('alfabetica');
  const [status, setStatus] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [formAluno, setFormAluno] = useState(null); // null | 'novo' | aluno
  const [docsAluno, setDocsAluno] = useState(null);

  const buscaAtrasada = useDebounce(busca);

  useEffect(() => {
    api
      .get(`/turmas/${turmaId}`)
      .then(setTurma)
      .catch((e) => setErro(e.message));
  }, [turmaId]);

  const carregar = useCallback(async () => {
    try {
      setAlunos(await api.get(`/alunos${consulta({ turmaId, q: buscaAtrasada, ordem, status })}`));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
    setCarregando(false);
  }, [turmaId, buscaAtrasada, ordem, status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluir(aluno) {
    if (!window.confirm(`Excluir o aluno "${aluno.nomeCompleto}" e todos os documentos dele?`)) return;
    try {
      await api.delete(`/alunos/${aluno.id}`);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <p className="migalha">
       <Link to="/turmas" className="btn">← Turmas</Link> 
      </p>
      <div className="cabecalho-pagina">
        <div>
          <h1>{turma ? turma.nome : 'Turma'}</h1>
          {turma && <p className="ano">Ano letivo {turma.anoLetivo}</p>}
        </div>
        {turma && (
          <button className="btn" onClick={() => setFormAluno('novo')}>
            + Novo aluno
          </button>
        )}
      </div>

      <div className="filtros">
        <input placeholder="Buscar por nome…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar">
          {ORDEM_OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {STATUS_OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      {erro && <p className="erro">{erro}</p>}
      {aviso && <p className="aviso">{aviso}</p>}
      {carregando && <p>Carregando…</p>}
      {!carregando && alunos.length === 0 && <p className="vazio">Nenhum aluno encontrado.</p>}

      {alunos.length > 0 && (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Nome completo</th>
                <th>Nascimento</th>
                <th>Status</th>
                <th>Documentos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id}>
                  <td>{a.nomeCompleto}</td>
                  <td>{formatarData(a.dataNascimento)}</td>
                  <td>
                    <span className={`selo status-${a.status}`}>{descreverStatus(a)}</span>
                  </td>
                  <td>
                    {a.documentos.length === 0 ? (
                      <span className="sem-docs">Nenhum PDF</span>
                    ) : (
                      `${a.documentos.length} PDF${a.documentos.length > 1 ? 's' : ''}`
                    )}
                  </td>
                  <td className="acoes">
                    <button className="btn secundario pequeno" onClick={() => setDocsAluno(a)}>
                      Documentos
                    </button>
                    <button className="btn secundario pequeno" onClick={() => setFormAluno(a)}>
                      Editar
                    </button>
                    <button className="btn perigo pequeno" onClick={() => excluir(a)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formAluno && turma && (
        <AlunoModal
          turma={turma}
          aluno={formAluno === 'novo' ? null : formAluno}
          onFechar={() => setFormAluno(null)}
          onSalvo={(mensagem) => {
            setFormAluno(null);
            setAviso(mensagem);
            carregar();
          }}
        />
      )}

      {docsAluno && <DocumentosModal aluno={docsAluno} onFechar={() => setDocsAluno(null)} onAlterado={carregar} />}
    </>
  );
}
