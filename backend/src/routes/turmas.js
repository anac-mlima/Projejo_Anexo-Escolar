import { Router } from 'express';
import { db, FieldValue } from '../firebase.js';
import { exigirPerfil, PERFIS } from '../middleware/auth.js';
import { HttpError } from '../utils/erros.js';
import { buscarProfessor, buscarTurma, mapaDeProfessores, serializar } from '../utils/firestore.js';
import { validarTurma } from '../utils/validacao.js';

const router = Router();
const somenteGeral = exigirPerfil(PERFIS.GERAL);
const ehProfessor = (req) => req.usuario.perfil === PERFIS.PROFESSOR;

/**
 * Professor responsável vindo do formulário:
 *   undefined -> o campo não veio (não mexe)   |   '' ou null -> sem professor   |   uid -> valida e vincula
 */
async function lerProfessorId(body, atualId) {
  if (body?.professorId === undefined) return undefined;
  if (body.professorId === null || body.professorId === '') return null;
  if (body.professorId === atualId) return atualId; // já é o professor da turma (mesmo desativado)
  return (await buscarProfessor(body.professorId)).uid;
}

// Admins listam todas as turmas; o professor só vê as turmas em que é o responsável.
router.get('/', async (req, res) => {
  let consulta = db.collection('turmas');
  if (ehProfessor(req)) consulta = consulta.where('professorId', '==', req.usuario.uid);

  const [snap, professores] = await Promise.all([consulta.get(), mapaDeProfessores()]);
  const turmas = await Promise.all(
    snap.docs.map(async (d) => {
      const contagem = await db.collection('alunos').where('turmaId', '==', d.id).count().get();
      return {
        ...serializar(d),
        professorNome: professores.get(d.data().professorId) ?? null,
        totalAlunos: contagem.data().count,
      };
    }),
  );
  turmas.sort((a, b) => b.anoLetivo - a.anoLetivo || a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(turmas);
});

router.get('/:id', async (req, res) => {
  const turma = await buscarTurma(req.params.id);
  if (ehProfessor(req) && turma.professorId !== req.usuario.uid) {
    throw new HttpError(403, 'Você não tem acesso a esta turma.');
  }
  res.json(turma);
});

// --- Somente o Administrador Geral cadastra, edita e exclui turmas ---

router.post('/', somenteGeral, async (req, res) => {
  const dados = validarTurma(req.body);
  const professorId = await lerProfessorId(req.body);
  const ref = db.collection('turmas').doc();
  await ref.set({
    ...dados,
    professorId: professorId ?? null,
    criadoPor: req.usuario.uid,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  res.status(201).json(serializar(await ref.get()));
});

router.put('/:id', somenteGeral, async (req, res) => {
  const atual = await buscarTurma(req.params.id);
  const dados = validarTurma(req.body);
  const professorId = await lerProfessorId(req.body, atual.professorId);
  if (professorId !== undefined) dados.professorId = professorId;
  await db.collection('turmas').doc(atual.id).update({ ...dados, atualizadoEm: FieldValue.serverTimestamp() });

  // O aluno guarda uma cópia do ano letivo da turma: se mudou, atualiza os alunos também.
  if (dados.anoLetivo !== atual.anoLetivo) {
    const alunos = await db.collection('alunos').where('turmaId', '==', atual.id).get();
    for (let i = 0; i < alunos.docs.length; i += 400) {
      const lote = db.batch();
      alunos.docs.slice(i, i + 400).forEach((a) => lote.update(a.ref, { anoLetivo: dados.anoLetivo }));
      await lote.commit();
    }
  }
  res.json(await buscarTurma(atual.id));
});

router.delete('/:id', somenteGeral, async (req, res) => {
  const turma = await buscarTurma(req.params.id);
  const contagem = await db.collection('alunos').where('turmaId', '==', turma.id).count().get();
  if (contagem.data().count > 0) {
    throw new HttpError(409, 'Esta turma ainda tem alunos. Transfira ou exclua os alunos antes de excluí-la.');
  }
  // Apaga também a frequência registrada para a turma.
  const dias = await db.collection('frequencias').where('turmaId', '==', turma.id).get();
  for (let i = 0; i < dias.docs.length; i += 400) {
    const lote = db.batch();
    dias.docs.slice(i, i + 400).forEach((d) => lote.delete(d.ref));
    await lote.commit();
  }
  await db.collection('turmas').doc(turma.id).delete();
  res.status(204).end();
});

export default router;