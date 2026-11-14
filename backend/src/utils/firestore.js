import { db } from '../firebase.js';
import { HttpError } from './erros.js';

const ID_SEGURO = /^[A-Za-z0-9_-]{1,128}$/;

/** Converte um documento do Firestore em objeto simples (datas viram texto ISO). */
export function serializar(doc) {
  const dados = { id: doc.id, ...doc.data() };
  for (const campo of ['criadoEm', 'atualizadoEm']) {
    if (dados[campo]?.toDate) dados[campo] = dados[campo].toDate().toISOString();
  }
  return dados;
}

export async function buscarTurma(id) {
  if (typeof id !== 'string' || !ID_SEGURO.test(id)) throw new HttpError(400, 'Informe uma turma válida.');
  const snap = await db.collection('turmas').doc(id).get();
  if (!snap.exists) throw new HttpError(404, 'Turma não encontrada.');
  return serializar(snap);
}

export async function buscarAluno(id) {
  if (typeof id !== 'string' || !ID_SEGURO.test(id)) throw new HttpError(404, 'Aluno não encontrado.');
  const snap = await db.collection('alunos').doc(id).get();
  if (!snap.exists) throw new HttpError(404, 'Aluno não encontrado.');
  return serializar(snap);
}

/** Map id -> nome da turma (a coleção é pequena, então 1 leitura resolve a listagem toda). */
export async function mapaDeTurmas() {
  const snap = await db.collection('turmas').get();
  return new Map(snap.docs.map((d) => [d.id, d.data().nome]));
}
