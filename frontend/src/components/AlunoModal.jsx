import { useState } from 'react';
import { api } from '../api';
import { erroDoArquivo, STATUS_OPCOES } from '../utils';
import Modal from './Modal';

const anoAtual = new Date().getFullYear();

/**
 * Cadastro / edição de aluno DENTRO de uma turma.
 * Campos obrigatórios: nome completo, data de nascimento, ano letivo (vem da turma) e status
 * (+ data/ano conforme o status). Anexos em PDF são opcionais no cadastro e podem ser
 * gerenciados depois no botão "Documentos".
 */
export default function AlunoModal({ turma, aluno, onFechar, onSalvo }) {
  const editando = Boolean(aluno);
  const [form, setForm] = useState({
    nomeCompleto: aluno?.nomeCompleto ?? '',
    dataNascimento: aluno?.dataNascimento ?? '',
    status: aluno?.status ?? 'em_andamento',
    anoStatus: aluno?.anoStatus ?? anoAtual,
    dataConclusao: aluno?.dataConclusao ?? '',
  });
  const [arquivos, setArquivos] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  function escolherArquivos(e) {
    const lista = [...e.target.files];
    const problema = lista.map(erroDoArquivo).find(Boolean);
    if (problema) {
      setErro(problema);
      e.target.value = '';
      return;
    }
    setErro('');
    setArquivos(lista);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      nomeCompleto: form.nomeCompleto,
      dataNascimento: form.dataNascimento,
      turmaId: turma.id,
      status: form.status,
    };
    if (form.status === 'concluido') {
      if (form.dataConclusao) dados.dataConclusao = form.dataConclusao;
      else dados.anoStatus = Number(form.anoStatus);
    } else {
      dados.anoStatus = Number(form.anoStatus);
    }

    try {
      const salvo = editando ? await api.put(`/alunos/${aluno.id}`, dados) : await api.post('/alunos', dados);

      // Envia os PDFs escolhidos (cadastro novo). Se algum falhar, o aluno já está salvo.
      const falhas = [];
      for (const arquivo of arquivos) {
        const fd = new FormData();
        fd.append('titulo', arquivo.name.replace(/\.pdf$/i, ''));
        fd.append('arquivo', arquivo);
        try {
          await api.enviarArquivo(`/alunos/${salvo.id}/documentos`, fd);
        } catch (err) {
          falhas.push(`${arquivo.name}: ${err.message}`);
        }
      }

      onSalvo(falhas.length ? `Aluno salvo, mas alguns PDFs falharam (${falhas.join(' | ')}). Use o botão "Documentos" para reenviar.` : '');
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={editando ? 'Editar aluno' : 'Novo aluno'} onFechar={onFechar}>
      <form onSubmit={salvar} className="formulario">
        <label>
          Nome completo *
          <input value={form.nomeCompleto} onChange={mudar('nomeCompleto')} required autoFocus />
        </label>

        <div className="linha">
          <label>
            Data de nascimento *
            <input type="date" value={form.dataNascimento} onChange={mudar('dataNascimento')} required />
          </label>
          <label>
            Ano letivo da turma *
            <input value={turma.anoLetivo} readOnly title="Definido pela turma" />
          </label>
        </div>

        <label>
          Status do aluno *
          <select value={form.status} onChange={mudar('status')}>
            {STATUS_OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>

        {form.status === 'concluido' ? (
          <div className="linha">
            <label>
              Data de conclusão *
              <input type="date" value={form.dataConclusao} onChange={mudar('dataConclusao')} />
            </label>
            <label>
              …ou só o ano de conclusão
              <input
                type="number"
                min="1990"
                max={anoAtual + 1}
                value={form.anoStatus}
                onChange={mudar('anoStatus')}
                disabled={Boolean(form.dataConclusao)}
              />
            </label>
          </div>
        ) : (
          <label>
            {form.status === 'em_andamento' ? 'Ano corrente *' : 'Ano da interrupção / desmatrícula *'}
            <input type="number" min="1990" max={anoAtual + 1} value={form.anoStatus} onChange={mudar('anoStatus')} required />
          </label>
        )}

        {!editando && (
          <label>
            Documentos em PDF (opcional — você pode anexar depois)
            <input type="file" accept="application/pdf" multiple onChange={escolherArquivos} />
          </label>
        )}

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
