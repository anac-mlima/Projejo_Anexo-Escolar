import { HttpError } from './erros.js';

export const STATUS = ['concluido', 'em_andamento', 'interrompido'];

/** Minúsculas e sem acentos: "João" -> "joao". Usado na busca e na ordem alfabética. */
export function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

export function anoValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1990 && n <= new Date().getFullYear() + 1;
}

/**
 * Regras do aluno:
 *  - nome completo, data de nascimento e status são obrigatórios;
 *  - concluído  -> data de conclusão (ou ao menos o ano);
 *  - em andamento / interrompido -> ano.
 * O "ano letivo" NÃO vem do formulário: é copiado da turma na rota.
 */
export function validarAluno(body = {}) {
  const erros = [];
  const hoje = new Date().toISOString().slice(0, 10);

  const nomeCompleto = String(body.nomeCompleto ?? '').trim().replace(/\s+/g, ' ');
  if (nomeCompleto.length < 5 || !nomeCompleto.includes(' ')) {
    erros.push('Informe o nome completo (nome e sobrenome).');
  }

  const dataNascimento = body.dataNascimento;
  if (!dataValida(dataNascimento)) {
    erros.push('Data de nascimento inválida (formato AAAA-MM-DD).');
  } else if (dataNascimento > hoje || dataNascimento < '1900-01-01') {
    erros.push('Data de nascimento fora do intervalo permitido.');
  }

  const status = body.status;
  let anoStatus = null;
  let dataConclusao = null;

  if (!STATUS.includes(status)) {
    erros.push('Status inválido. Use: concluido, em_andamento ou interrompido.');
  } else if (status === 'concluido') {
    if (body.dataConclusao) {
      if (!dataValida(body.dataConclusao) || !anoValido(body.dataConclusao.slice(0, 4))) {
        erros.push('Data de conclusão inválida.');
      } else {
        dataConclusao = body.dataConclusao;
        anoStatus = Number(dataConclusao.slice(0, 4));
      }
    } else if (anoValido(body.anoStatus)) {
      anoStatus = Number(body.anoStatus);
    } else {
      erros.push('Informe a data ou o ano de conclusão.');
    }
  } else if (!anoValido(body.anoStatus)) {
    erros.push(status === 'em_andamento' ? 'Informe o ano corrente.' : 'Informe o ano da interrupção/desmatrícula.');
  } else {
    anoStatus = Number(body.anoStatus);
  }

  if (erros.length) throw new HttpError(400, 'Dados inválidos.', erros);
  return { nomeCompleto, dataNascimento, status, anoStatus, dataConclusao };
}

export function validarTurma(body = {}) {
  const erros = [];
  const nome = String(body.nome ?? '').trim().replace(/\s+/g, ' ');
  if (nome.length < 2 || nome.length > 80) erros.push('Informe o nome da turma (2 a 80 caracteres).');
  if (!anoValido(body.anoLetivo)) erros.push('Ano letivo inválido.');
  const descricao = String(body.descricao ?? '').trim().slice(0, 200);
  if (erros.length) throw new HttpError(400, 'Dados inválidos.', erros);
  return { nome, anoLetivo: Number(body.anoLetivo), descricao };
}
