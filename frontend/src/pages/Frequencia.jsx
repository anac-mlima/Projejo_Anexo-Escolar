import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, consulta } from '../api';
import { useAuth } from '../AuthContext';
import { formatarData, hojeLocal, SITUACAO_ROTULO, situacaoPorFaltas } from '../utils';

/** Chamada do dia + situação de faltas de cada aluno (semáforo). */
export default function Frequencia() {
  const { turmaId } = useParams();
  const { usuario } = useAuth();

  const [data, setData] = useState(hojeLocal());
  const [dados, setDados] = useState(null);
  const [marcas, setMarcas] = useState({}); // { alunoId: 'presente' | 'falta' } (ainda não salvo)
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    try {
      const r = await api.get(`/frequencia/turma/${turmaId}${consulta({ data })}`);

      // A data precisa estar no ano letivo da turma: se não estiver, usa o último dia permitido.
      const ano = String(r.turma.anoLetivo);
      if (data.slice(0, 4) !== ano) {
        const fimDoAno = `${ano}-12-31`;
        setData(fimDoAno < hojeLocal() ? fimDoAno : hojeLocal());
        return;
      }

      setDados(r);
      // Quem ainda não tem registro no dia começa como "presente".
      setMarcas(Object.fromEntries(r.alunos.map((a) => [a.id, a.registro ?? 'presente'])));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
    setCarregando(false);
  }, [turmaId, data]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const podeRegistrar = dados?.podeRegistrar ?? false;
  const regras = dados?.regras;
  const diaJaRegistrado = dados?.dias.some((d) => d.data === data) ?? false;
  const dataMax = dados ? [hojeLocal(), `${dados.turma.anoLetivo}-12-31`].sort()[0] : hojeLocal();

  function marcar(alunoId, valor) {
    setAviso('');
    setMarcas((m) => ({ ...m, [alunoId]: valor }));
  }

  function marcarTodos(valor) {
    setAviso('');
    setMarcas(Object.fromEntries(dados.alunos.map((a) => [a.id, valor])));
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    setAviso('');
    try {
      await api.put(`/frequencia/turma/${turmaId}/chamada`, { data, registros: marcas });
      setAviso(`Chamada de ${formatarData(data)} salva.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
    setSalvando(false);
  }

  async function excluirDia(dia) {
    if (!window.confirm(`Apagar a chamada de ${formatarData(dia)}? Esse dia deixa de contar nas faltas.`)) return;
    setErro('');
    try {
      await api.delete(`/frequencia/turma/${turmaId}/chamada/${dia}`);
      setAviso(`Chamada de ${formatarData(dia)} apagada.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  // Faltas "ao vivo": o que já está salvo, trocando o dia aberto pelo que está marcado na tela.
  function faltasPrevistas(aluno) {
    if (!podeRegistrar) return aluno.faltas;
    const jaContada = aluno.registro === 'falta' ? 1 : 0;
    const agora = marcas[aluno.id] === 'falta' ? 1 : 0;
    return aluno.faltas - jaContada + agora;
  }

  return (
    <>
      <p className="migalha">
        <Link to="/turmas" className="btn">
          ← {usuario.perfil === 'professor' ? 'Minhas turmas' : 'Turmas'}
        </Link>
      </p>

      <div className="cabecalho-pagina">
        <div>
          <h1>Frequência{dados ? ` — ${dados.turma.nome}` : ''}</h1>
          {dados && (
            <p className="ano">
              Ano letivo {dados.turma.anoLetivo}
              {dados.turma.professorNome ? ` · Professor(a): ${dados.turma.professorNome}` : ' · Sem professor definido'}
              {` · ${dados.diasRegistrados} de ${regras.diasLetivos} dias letivos registrados`}
            </p>
          )}
        </div>
      </div>

      {regras && (
        <p className="freq-regras">
          Frequência mínima de {regras.frequenciaMinima}% — no máximo {regras.limiteFaltas} faltas em {regras.diasLetivos} dias
          letivos.{' '}
          <span className="semaforo freq-verde">Verde: até {regras.alertaFaltas - 1} faltas</span>{' '}
          <span className="semaforo freq-amarelo">
            Amarelo: {regras.alertaFaltas} a {regras.limiteFaltas}
          </span>{' '}
          <span className="semaforo freq-vermelho">Vermelho: acima de {regras.limiteFaltas}</span>
        </p>
      )}

      {erro && <p className="erro">{erro}</p>}
      {aviso && <p className="aviso">{aviso}</p>}
      {carregando && <p>Carregando…</p>}

      {dados && (
        <>
          <div className="freq-barra">
            <label>
              Dia da chamada
              <input
                type="date"
                value={data}
                min={`${dados.turma.anoLetivo}-01-01`}
                max={dataMax}
                onChange={(e) => e.target.value && setData(e.target.value)}
              />
            </label>
            {podeRegistrar && dados.alunos.length > 0 && (
              <>
                <button className="btn secundario" onClick={() => marcarTodos('presente')}>
                  Todos presentes
                </button>
                <button className="btn" onClick={salvar} disabled={salvando}>
                  {salvando ? 'Salvando…' : diaJaRegistrado ? 'Atualizar chamada' : 'Salvar chamada'}
                </button>
              </>
            )}
            {podeRegistrar && diaJaRegistrado && <span className="selo status-concluido">Chamada deste dia já registrada</span>}
          </div>

          {dados.alunos.length === 0 && <p className="vazio">Esta turma não tem alunos em andamento.</p>}

          {dados.alunos.length > 0 && (
            <div className="tabela-rolagem">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>{podeRegistrar ? `Chamada de ${formatarData(data)}` : `Registro de ${formatarData(data)}`}</th>
                    <th>Faltas</th>
                    <th>Podem faltar</th>
                    <th>Frequência</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.alunos.map((a) => {
                    const faltas = faltasPrevistas(a);
                    const situacao = situacaoPorFaltas(faltas, regras);
                    const frequencia = Math.max(0, Math.round(((regras.diasLetivos - faltas) / regras.diasLetivos) * 1000) / 10);
                    return (
                      <tr key={a.id} className={situacao === 'verde' ? '' : `linha-${situacao}`}>
                        <td>{a.nomeCompleto}</td>
                        <td>
                          {podeRegistrar ? (
                            <div className="chamada">
                              <button
                                className={marcas[a.id] === 'presente' ? 'ativo-presente' : ''}
                                onClick={() => marcar(a.id, 'presente')}
                              >
                                Presente
                              </button>
                              <button
                                className={marcas[a.id] === 'falta' ? 'ativo-falta' : ''}
                                onClick={() => marcar(a.id, 'falta')}
                              >
                                Falta
                              </button>
                            </div>
                          ) : a.registro === 'falta' ? (
                            'Falta'
                          ) : a.registro === 'presente' ? (
                            'Presente'
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {faltas} / {regras.limiteFaltas}
                        </td>
                        <td>{Math.max(0, regras.limiteFaltas - faltas)}</td>
                        <td>{frequencia.toLocaleString('pt-BR')}%</td>
                        <td>
                          <span className={`semaforo freq-${situacao}`}>{SITUACAO_ROTULO[situacao]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {dados.dias.length > 0 && (
            <details className="historico-dias">
              <summary>Dias já registrados ({dados.dias.length})</summary>
              <div className="tabela-rolagem">
                <table>
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Presentes</th>
                      <th>Faltas</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {dados.dias.map((d) => (
                      <tr key={d.data}>
                        <td>{formatarData(d.data)}</td>
                        <td>{d.presentes}</td>
                        <td>{d.faltas}</td>
                        <td className="acoes">
                          <button className="btn secundario pequeno" onClick={() => setData(d.data)}>
                            {podeRegistrar ? 'Abrir / corrigir' : 'Ver'}
                          </button>
                          {podeRegistrar && (
                            <button className="btn perigo pequeno" onClick={() => excluirDia(d.data)}>
                              Apagar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}