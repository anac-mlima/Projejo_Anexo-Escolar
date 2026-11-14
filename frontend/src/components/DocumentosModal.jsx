import { useCallback, useEffect, useState } from 'react';
import { abrirPdf, api } from '../api';
import { erroDoArquivo, formatarData, formatarTamanho } from '../utils';
import Modal from './Modal';

/**
 * Gerencia os PDFs de um aluno JÁ cadastrado: adicionar, substituir e excluir,
 * a qualquer momento — mesmo que ele tenha sido criado sem nenhum documento.
 */
export default function DocumentosModal({ aluno, onFechar, onAlterado }) {
  const [documentos, setDocumentos] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDocumentos(await api.get(`/alunos/${aluno.id}/documentos`));
    } catch (e) {
      setErro(e.message);
    }
  }, [aluno.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(acao) {
    setErro('');
    setOcupado(true);
    try {
      await acao();
      await carregar();
      onAlterado();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  }

  function escolher(e) {
    const f = e.target.files[0] ?? null;
    const problema = f && erroDoArquivo(f);
    if (problema) {
      setErro(problema);
      e.target.value = '';
      setArquivo(null);
      return;
    }
    setErro('');
    setArquivo(f);
  }

  const adicionar = (e) => {
    e.preventDefault();
    if (!arquivo) return setErro('Escolha um arquivo PDF.');
    const formElemento = e.target;
    executar(async () => {
      const fd = new FormData();
      fd.append('titulo', titulo || arquivo.name.replace(/\.pdf$/i, ''));
      fd.append('arquivo', arquivo);
      await api.enviarArquivo(`/alunos/${aluno.id}/documentos`, fd);
      setTitulo('');
      setArquivo(null);
      formElemento.reset();
    });
  };

  const substituir = (doc, e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const problema = erroDoArquivo(f);
    if (problema) return setErro(problema);
    executar(async () => {
      const fd = new FormData();
      fd.append('arquivo', f);
      await api.enviarArquivo(`/alunos/${aluno.id}/documentos/${doc.id}`, fd, 'PUT');
    });
  };

  const excluir = (doc) => {
    if (!window.confirm(`Excluir "${doc.titulo}"? Esta ação não pode ser desfeita.`)) return;
    executar(() => api.delete(`/alunos/${aluno.id}/documentos/${doc.id}`));
  };

  return (
    <Modal titulo={`Documentos — ${aluno.nomeCompleto}`} onFechar={onFechar} largo>
      {documentos === null ? (
        <p>Carregando…</p>
      ) : documentos.length === 0 ? (
        <p className="vazio">Nenhum documento anexado ainda. Use o formulário abaixo para adicionar.</p>
      ) : (
        <ul className="lista-docs">
          {documentos.map((d) => (
            <li key={d.id}>
              <div>
                <a href={d.url} onClick={(e) => { e.preventDefault(); abrirPdf(d.url); }}>
                  {d.titulo}
                </a>
                <small>
                  {d.nomeArquivo} · {formatarTamanho(d.tamanho)} · enviado em {formatarData(d.enviadoEm)}
                </small>
              </div>
              <div className="acoes">
                <label className="btn secundario pequeno">
                  Substituir
                  <input type="file" accept="application/pdf" hidden disabled={ocupado} onChange={(e) => substituir(d, e)} />
                </label>
                <button className="btn perigo pequeno" disabled={ocupado} onClick={() => excluir(d)}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={adicionar} className="formulario adicionar-doc">
        <h3>Adicionar documento</h3>
        <div className="linha">
          <label>
            Título (ex.: Certidão de nascimento)
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} />
          </label>
          <label>
            Arquivo PDF (até 10 MB)
            <input type="file" accept="application/pdf" onChange={escolher} />
          </label>
        </div>
        <button className="btn" disabled={ocupado}>
          {ocupado ? 'Enviando…' : 'Enviar PDF'}
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}
    </Modal>
  );
}
