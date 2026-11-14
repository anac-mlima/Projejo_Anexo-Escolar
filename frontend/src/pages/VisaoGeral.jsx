import { useCallback, useEffect, useState } from 'react';
import { abrirPdf, api, consulta } from '../api';
import DocumentosModal from '../components/DocumentosModal';
import { descreverStatus, formatarData, ORDEM_OPCOES, STATUS_OPCOES, useDebounce } from '../utils';

/** Aba "Visão geral": todos os alunos de todas as turmas, com os PDFs anexados. */
export default function VisaoGeral() {
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('alfabetica');
  const [status, setStatus] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [semDocumentos, setSemDocumentos] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [docsAluno, setDocsAluno] = useState(null);

  const buscaAtrasada = useDebounce(busca);

  useEffect(() => {
    api
      .get('/turmas')
      .then(setTurmas)
      .catch((e) => setErro(e.message));
  }, []);

  const carregar = useCallback(async () => {
    try {
      setAlunos(await api.get(`/alunos${consulta({ turmaId, q: buscaAtrasada, ordem, status, semDocumentos })}`));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
    setCarregando(false);
  }, [turmaId, buscaAtrasada, ordem, status, semDocumentos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Visão geral de alunos</h1>
          <p className="ano">{carregando ? 'Carregando…' : `${alunos.length} aluno(s) encontrado(s)`}</p>
        </div>
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
        <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} aria-label="Filtrar por turma">
          <option value="">Todas as turmas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} ({t.anoLetivo})
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
        <label className="checkbox">
          <input type="checkbox" checked={semDocumentos} onChange={(e) => setSemDocumentos(e.target.checked)} />
          Só quem está sem PDF
        </label>
      </div>

      {erro && <p className="erro">{erro}</p>}
      {!carregando && alunos.length === 0 && <p className="vazio">Nenhum aluno encontrado.</p>}

      {alunos.length > 0 && (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Status</th>
                <th>Documentos (PDF)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.nomeCompleto}
                    <small className="sub">Nasc. {formatarData(a.dataNascimento)}</small>
                  </td>
                  <td>
                    {a.turmaNome ?? '—'}
                    <small className="sub">Ano letivo {a.anoLetivo}</small>
                  </td>
                  <td>
                    <span className={`selo status-${a.status}`}>{descreverStatus(a)}</span>
                  </td>
                  <td>
                    {a.documentos.length === 0 ? (
                      <span className="sem-docs">Nenhum PDF</span>
                    ) : (
                      <ul className="chips">
                        {a.documentos.map((d) => (
                          <li key={d.id}>
                          <a href={d.url} onClick={(e) => { e.preventDefault(); abrirPdf(d.url); }} title={d.nomeArquivo}>
                              {d.titulo}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="acoes">
                    <button className="btn secundario pequeno" onClick={() => setDocsAluno(a)}>
                      Gerenciar PDFs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {docsAluno && <DocumentosModal aluno={docsAluno} onFechar={() => setDocsAluno(null)} onAlterado={carregar} />}
    </>
  );
}
