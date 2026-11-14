import { useEffect, useState } from 'react';

export const PERFIL_ROTULO = {
  admin_geral: 'Administrador Geral',
  admin_secretario: 'Administrador Secretário',
};

export const STATUS_OPCOES = [
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluído' },
  { valor: 'interrompido', rotulo: 'Interrompido / Desmatriculado' },
];

export const ORDEM_OPCOES = [
  { valor: 'alfabetica', rotulo: 'Ordem alfabética (A–Z)' },
  { valor: 'recente', rotulo: 'Mais recentes primeiro' },
  { valor: 'antigo', rotulo: 'Mais antigos primeiro' },
];

/** "2012-05-10" -> "10/05/2012" (sem passar por Date, para não sofrer com fuso horário). */
export function formatarData(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function descreverStatus(aluno) {
  if (aluno.status === 'concluido') {
    return aluno.dataConclusao
      ? `Concluído em ${formatarData(aluno.dataConclusao)}`
      : `Concluído em ${aluno.anoStatus}`;
  }
  if (aluno.status === 'em_andamento') return `Em andamento (${aluno.anoStatus})`;
  return `Interrompido / Desmatriculado (${aluno.anoStatus})`;
}

export function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Valida no navegador (a API valida de novo): só PDF, até 10 MB. */
export function erroDoArquivo(arquivo) {
  if (arquivo.type !== 'application/pdf') return `"${arquivo.name}" não é um PDF.`;
  if (arquivo.size > 10 * 1024 * 1024) return `"${arquivo.name}" passa de 10 MB.`;
  return null;
}

/** Espera o usuário parar de digitar antes de buscar. */
export function useDebounce(valor, ms = 350) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}
