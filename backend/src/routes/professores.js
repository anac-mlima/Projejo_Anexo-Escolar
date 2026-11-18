import { Router } from 'express';
import { auth, db } from '../firebase.js';
import { exigirPerfil, PERFIS } from '../middleware/auth.js';
import { HttpError } from '../utils/erros.js';
import { serializar } from '../utils/firestore.js';
import { criarUsuario, definirAtivo } from '../utils/usuarios.js';

// CRUD de professores: somente o Administrador Geral.
// (O vínculo professor <-> turma é feito na própria turma, em /api/turmas.)
const router = Router();
router.use(exigirPerfil(PERFIS.GERAL));

async function buscarProfessorPorUid(uid) {
  const snap = await db.collection('usuarios').doc(uid).get();
  if (!snap.exists || snap.data().perfil !== PERFIS.PROFESSOR) throw new HttpError(404, 'Professor não encontrado.');
  return snap;
}

// Lista os professores já com as turmas de cada um.
router.get('/', async (req, res) => {
  const [professores, turmas] = await Promise.all([
    db.collection('usuarios').where('perfil', '==', PERFIS.PROFESSOR).get(),
    db.collection('turmas').get(),
  ]);

  const turmasDoProfessor = new Map();
  for (const t of turmas.docs) {
    const { professorId, nome, anoLetivo } = t.data();
    if (!professorId) continue;
    if (!turmasDoProfessor.has(professorId)) turmasDoProfessor.set(professorId, []);
    turmasDoProfessor.get(professorId).push({ id: t.id, nome, anoLetivo });
  }

  const lista = professores.docs.map((d) => {
    const { id, ...p } = serializar(d);
    return { uid: id, ...p, turmas: turmasDoProfessor.get(id) ?? [] };
  });
  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(lista);
});

router.post('/', async (req, res) => {
  const criado = await criarUsuario({ ...req.body, perfil: PERFIS.PROFESSOR }, [PERFIS.PROFESSOR]);
  res.status(201).json({ ...criado, turmas: [] });
});

// Corrige o nome do professor.
router.put('/:uid', async (req, res) => {
  const snap = await buscarProfessorPorUid(req.params.uid);
  const nome = String(req.body?.nome ?? '').trim().replace(/\s+/g, ' ');
  if (nome.length < 3) throw new HttpError(400, 'Dados inválidos.', ['Informe o nome.']);

  await auth.updateUser(snap.id, { displayName: nome });
  await snap.ref.update({ nome });
  res.json({ uid: snap.id, nome });
});

// Ativar / desativar o acesso.
router.patch('/:uid', async (req, res) => {
  await buscarProfessorPorUid(req.params.uid);
  await definirAtivo(req.params.uid, req.body?.ativo);
  res.json({ uid: req.params.uid, ativo: req.body.ativo });
});

export default router;