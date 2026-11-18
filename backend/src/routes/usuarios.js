import { Router } from 'express';
import { db } from '../firebase.js';
import { exigirPerfil, PERFIS } from '../middleware/auth.js';
import { HttpError } from '../utils/erros.js';
import { serializar } from '../utils/firestore.js';
import { criarUsuario, definirAtivo } from '../utils/usuarios.js';

// Só o Administrador Geral gerencia usuários.
const router = Router();
router.use(exigirPerfil(PERFIS.GERAL));

const PERFIS_VALIDOS = Object.values(PERFIS);

router.get('/', async (req, res) => {
  const snap = await db.collection('usuarios').get();
  const usuarios = snap.docs.map(serializar).map(({ id, ...u }) => ({ uid: id, ...u }));
  usuarios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(usuarios);
});

router.post('/', async (req, res) => {
  res.status(201).json(await criarUsuario(req.body, PERFIS_VALIDOS));
});

// Ativar / desativar acesso
router.patch('/:uid', async (req, res) => {
  const { uid } = req.params;
  if (uid === req.usuario.uid) throw new HttpError(400, 'Você não pode desativar o seu próprio acesso.');
  await definirAtivo(uid, req.body?.ativo);
  res.json({ uid, ativo: req.body.ativo });
});

export default router;