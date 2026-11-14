import { Router } from 'express';
import { db, FieldValue } from '../firebase.js';
import { exigirPerfil, PERFIS } from '../middleware/auth.js';
import { HttpError } from '../utils/erros.js';
import { buscarTurma, serializar } from '../utils/firestore.js';
import { validarTurma } from '../utils/validacao.js';

const router = Router();
const somenteGeral = exigirPerfil(PERFIS.GERAL);

// Qualquer perfil lista as turmas (os cards da tela inicial).
router.get('/', async (req, res) => {
  const snap = await db.collection('turmas').get();
  const turmas = await Promise.all(
    snap.docs.map(async (d) => {
      const contagem = await db.collection('alunos').where('turmaId', '==', d.id).count().get();
      return { ...serializar(d), totalAlunos: contagem.data().count };
    }),
  );
  turmas.sort((a, b) => b.anoLetivo - a.anoLetivo || a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(turmas);
});

router.get('/:id', async (req, res) => {
  res.json(await buscarTurma(req.params.id));
});

// --- Somente o Administrador Geral cadastra, edita e exclui turmas ---

router.post('/', somenteGeral, async (req, res) => {
  const dados = validarTurma(req.body);
  const ref = db.collection('turmas').doc();
  await ref.set({
    ...dados,
    criadoPor: req.usuario.uid,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  res.status(201).json(serializar(await ref.get()));
});

router.put('/:id', somenteGeral, async (req, res) => {
  const atual = await buscarTurma(req.params.id);
  const dados = validarTurma(req.body);
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
  await db.collection('turmas').doc(turma.id).delete();
  res.status(204).end();
});

export default router;
